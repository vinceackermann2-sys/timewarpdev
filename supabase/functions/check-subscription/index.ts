import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_U5i7dXiix7U9sz": "co_founder",
  "prod_U5i8fBuKYbjGoZ": "co_founder",
  "prod_U5i9xCLeU22Prt": "co_founder",
  "prod_U5i9swypYGQLXJ": "aristotle",
  "prod_U5iApYOh6FLCzw": "aristotle",
  "prod_U5iAroX2K0MMES": "aristotle",
  "prod_U5iAwdPTbESFEa": "timewarp_og",
  "prod_U5iBwG21WwMlvs": "timewarp_og",
  "prod_U5iCei9C5DGcAg": "timewarp_og",
  "prod_UEo19ZSxK1lrq7": "timewarp_og",
};

const OG_ONE_TIME_PRICE_ID = "price_1TGKOzGKbzbe9CQL8pj9zYEf";
const ACTIVE_STRIPE_STATUSES = new Set(["active", "trialing", "past_due"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ subscribed: false, plan: null, product_id: null, subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    let body: any = {};
    try { body = await req.json(); } catch { /* GET-style invocation */ }
    const workspaceId: string | null = body?.workspaceId ?? null;

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      return new Response(JSON.stringify({ subscribed: false, plan: null, product_id: null, subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }
    const user = userData.user;

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "workspaceId is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    // Confirm user is a member OR creator of the workspace (owner membership row may be missing)
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    let isAuthorized = !!membership;
    if (!isAuthorized) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("created_by")
        .eq("id", workspaceId)
        .maybeSingle();
      if (ws?.created_by === user.id) {
        isAuthorized = true;
        // Self-heal: ensure owner membership exists
        await supabase.from("workspace_members").upsert(
          { workspace_id: workspaceId, user_id: user.id, role: "owner" },
          { onConflict: "workspace_id,user_id" }
        );
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 });
    }

    // Read current DB record
    const { data: stored } = await supabase
      .from("workspace_subscriptions")
      .select("plan, status, stripe_customer_id, stripe_subscription_id, subscription_end")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const fallbackPlan = stored && ACTIVE_STRIPE_STATUSES.has(stored.status) ? stored.plan : null;
    const fallbackEnd = stored?.subscription_end ?? null;

    // If we have a Stripe subscription id stored, verify it directly
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let plan: string | null = fallbackPlan;
    let productId: string | null = null;
    let subscriptionEnd: string | null = fallbackEnd;
    let stripeCustomerId: string | null = stored?.stripe_customer_id ?? null;
    let stripeSubscriptionId: string | null = stored?.stripe_subscription_id ?? null;
    let subscribed = !!fallbackPlan;

    if (stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        if (ACTIVE_STRIPE_STATUSES.has(sub.status)) {
          subscribed = true;
          productId = sub.items.data[0]?.price.product as string | null;
          plan = (productId ? PRODUCT_TO_PLAN[productId] : null) || plan;
          const endTs = (sub as any).current_period_end;
          if (endTs) subscriptionEnd = new Date(endTs * 1000).toISOString();
        } else {
          subscribed = false;
          plan = null;
        }
      } catch (e) {
        console.warn("[check-subscription] stored sub id invalid:", (e as Error).message);
      }
    }

    // Persist
    if (plan) {
      await supabase.from("workspace_subscriptions").upsert({
        workspace_id: workspaceId,
        plan,
        status: "active",
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        subscription_end: subscriptionEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: "workspace_id" });
    } else if (stored) {
      await supabase.from("workspace_subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId);
    }

    return new Response(JSON.stringify({
      subscribed,
      plan,
      product_id: productId,
      subscription_end: subscriptionEnd,
      workspace_id: workspaceId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    console.error("check-subscription error:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
