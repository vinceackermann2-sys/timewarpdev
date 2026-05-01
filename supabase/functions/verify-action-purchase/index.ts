import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Missing sessionId");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    const userId = userData.user.id;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ granted: false, reason: "Payment not completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }
    if (session.metadata?.user_id !== userId) {
      return new Response(JSON.stringify({ granted: false, reason: "Session does not belong to this user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 });
    }
    const workspaceId = session.metadata?.workspace_id;
    if (!workspaceId) {
      return new Response(JSON.stringify({ granted: false, reason: "Session is missing workspace metadata" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const priceId = session.line_items?.data?.[0]?.price?.id;
    if (!priceId || !PRICE_TO_ACTIONS[priceId]) throw new Error("Unknown price in session");
    const actionsToGrant = PRICE_TO_ACTIONS[priceId];

    // Idempotency
    const { data: alreadyFulfilled } = await supabase
      .from("platform_config")
      .select("key")
      .eq("key", `fulfilled_${sessionId}`)
      .maybeSingle();
    if (alreadyFulfilled) {
      return new Response(JSON.stringify({ granted: true, actions: actionsToGrant, already_fulfilled: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // Grant against the workspace
    const { data: existing } = await supabase
      .from("workspace_subscriptions")
      .select("bonus_actions")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("workspace_subscriptions")
        .update({
          bonus_actions: (existing.bonus_actions || 0) + actionsToGrant,
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("workspace_subscriptions")
        .insert({
          workspace_id: workspaceId,
          plan: null,
          status: "cancelled",
          bonus_actions: actionsToGrant,
          actions_used: 0,
        });
      if (error) throw error;
    }

    await supabase.from("platform_config").insert({ key: `fulfilled_${sessionId}`, value: "true" });

    return new Response(JSON.stringify({ granted: true, actions: actionsToGrant, workspace_id: workspaceId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    console.error("[verify-action-purchase] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
