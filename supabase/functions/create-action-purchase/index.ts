import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_PRICE_IDS = [
  "price_1TAvQkGKbzbe9CQLJzFOPcBL",
  "price_1TAvR5GKbzbe9CQLzPPcn891",
  "price_1TAvS9GKbzbe9CQLmpcVUOLW",
  "price_1TAvXcGKbzbe9CQLtQgY1kwy",
  "price_1TBAJTGKbzbe9CQLxrFmBDhw",
  "price_1TBAJoGKbzbe9CQLnIE5C2IC",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { priceId, workspaceId } = await req.json();
    if (!priceId || !VALID_PRICE_IDS.includes(priceId)) throw new Error("Invalid price ID");
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
      return new Response(JSON.stringify({ error: "Only owners and editors can purchase actions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/app?action_session={CHECKOUT_SESSION_ID}&ws=${workspaceId}`,
      cancel_url: `${req.headers.get("origin")}/app`,
      metadata: { user_id: user.id, workspace_id: workspaceId, type: "action_purchase" },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("create-action-purchase error:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
