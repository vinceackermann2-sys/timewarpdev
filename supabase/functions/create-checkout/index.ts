import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { priceId, workspaceId } = await req.json();
    if (!priceId) throw new Error("priceId is required");
    if (!workspaceId) throw new Error("workspaceId is required");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Verify caller is owner or editor of the workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership || !["owner", "editor"].includes(membership.role)) {
      return new Response(JSON.stringify({ error: "Only owners and editors can purchase a plan" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const ONE_TIME_PRICE_ID = "price_1TGKOzGKbzbe9CQL8pj9zYEf";
    const isOneTime = priceId === ONE_TIME_PRICE_ID;

    const buildSessionParams = (useExistingCustomer: boolean) => ({
      customer: useExistingCustomer ? customerId : undefined,
      customer_email: useExistingCustomer && customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: (isOneTime ? "payment" : "subscription") as "payment" | "subscription",
      success_url: `${req.headers.get("origin")}/app?ws=${workspaceId}`,
      cancel_url: `${req.headers.get("origin")}/pricing`,
      metadata: { workspace_id: workspaceId, user_id: user.id, type: "plan_purchase" },
      subscription_data: isOneTime ? undefined : {
        metadata: { workspace_id: workspaceId, user_id: user.id },
      },
    });

    let session;
    try {
      session = await stripe.checkout.sessions.create(buildSessionParams(true));
    } catch (err: any) {
      // Stripe forbids combining currencies on one customer. If the existing
      // customer is locked to a different currency, fall back to letting
      // Stripe create a fresh customer for this purchase via customer_email.
      const msg = String(err?.raw?.message || err?.message || "");
      const isCurrencyConflict = msg.includes("cannot combine currencies");
      if (!isCurrencyConflict) throw err;
      session = await stripe.checkout.sessions.create(buildSessionParams(false));
    }

    if (isOneTime) {
      await supabase.rpc("decrement_og_spots");
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("create-checkout error:", error);
    const message = error?.raw?.message || error?.message || "An internal error occurred";
    return new Response(JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
