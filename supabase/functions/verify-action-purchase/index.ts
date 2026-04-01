import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_TO_ACTIONS: Record<string, number> = {
  "price_1TAvQkGKbzbe9CQLJzFOPcBL": 50,
  "price_1TAvR5GKbzbe9CQLzPPcn891": 100,
  "price_1TAvS9GKbzbe9CQLmpcVUOLW": 150,
  "price_1TAvXcGKbzbe9CQLtQgY1kwy": 200,
  "price_1TBAJTGKbzbe9CQLxrFmBDhw": 300,
  "price_1TBAJoGKbzbe9CQLnIE5C2IC": 400,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Missing sessionId");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    const userId = userData.user.id;

    // Retrieve the Stripe checkout session
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    console.log("[verify-action-purchase] Session status:", session.payment_status, "user_id metadata:", session.metadata?.user_id);

    // Verify payment completed and belongs to this user
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ granted: false, reason: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (session.metadata?.user_id !== userId) {
      return new Response(JSON.stringify({ granted: false, reason: "Session does not belong to this user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Check if already fulfilled (idempotency) using session ID in metadata
    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("bonus_actions")
      .eq("user_id", userId)
      .single();

    // Determine actions from line items
    const priceId = session.line_items?.data?.[0]?.price?.id;
    if (!priceId || !PRICE_TO_ACTIONS[priceId]) {
      throw new Error("Unknown price in session");
    }
    const actionsToGrant = PRICE_TO_ACTIONS[priceId];

    // Check idempotency: store fulfilled session IDs in metadata to prevent double-granting
    // We'll use a simple approach: check platform_config for this session
    const { data: alreadyFulfilled } = await supabase
      .from("platform_config")
      .select("key")
      .eq("key", `fulfilled_${sessionId}`)
      .maybeSingle();

    if (alreadyFulfilled) {
      console.log("[verify-action-purchase] Already fulfilled session:", sessionId);
      return new Response(JSON.stringify({ granted: true, actions: actionsToGrant, already_fulfilled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Grant bonus actions
    if (existingSub) {
      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          bonus_actions: (existingSub.bonus_actions || 0) + actionsToGrant,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: userId,
          plan: "co_founder",
          bonus_actions: actionsToGrant,
          actions_used: 0,
          status: "active",
        });
      if (insertError) throw insertError;
    }

    // Mark as fulfilled
    await supabase
      .from("platform_config")
      .insert({ key: `fulfilled_${sessionId}`, value: "true" });

    console.log("[verify-action-purchase] Granted", actionsToGrant, "actions to user", userId);

    return new Response(JSON.stringify({ granted: true, actions: actionsToGrant }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[verify-action-purchase] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
