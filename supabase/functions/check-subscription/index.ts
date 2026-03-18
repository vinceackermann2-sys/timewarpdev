import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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
};

const ACTIVE_DB_STATUSES = new Set(["active", "trialing", "past_due"]);
const ACTIVE_STRIPE_STATUSES = new Set(["active", "trialing", "past_due"]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { data: storedSubscription } = await supabaseClient
      .from("user_subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const fallbackPlan = storedSubscription && ACTIVE_DB_STATUSES.has(storedSubscription.status)
      ? storedSubscription.plan
      : null;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      return new Response(JSON.stringify({
        subscribed: Boolean(fallbackPlan),
        plan: fallbackPlan,
        product_id: null,
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const activeSubscription = subscriptions.data.find((subscription) =>
      ACTIVE_STRIPE_STATUSES.has(subscription.status)
    );

    let plan = fallbackPlan;
    let productId = null;
    let subscriptionEnd = null;

    if (activeSubscription) {
      try {
        const endTs = activeSubscription.current_period_end;
        if (endTs && typeof endTs === "number" && endTs > 0) {
          subscriptionEnd = new Date(endTs * 1000).toISOString();
        }
      } catch (_) {
        console.warn("Failed to parse subscription end date");
      }
      productId = activeSubscription.items.data[0]?.price.product as string | null;
      plan = (productId ? PRODUCT_TO_PLAN[productId] : null) || fallbackPlan;
    }

    return new Response(JSON.stringify({
      subscribed: Boolean(activeSubscription || fallbackPlan),
      plan,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("check-subscription error occurred", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
