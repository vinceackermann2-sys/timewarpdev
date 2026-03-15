import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_PRICE_IDS = [
  "price_1TAvQkGKbzbe9CQLJzFOPcBL", // 50 actions - $15
  "price_1TAvR5GKbzbe9CQLzPPcn891", // 100 actions - $30
  "price_1TAvS9GKbzbe9CQLmpcVUOLW", // 150 actions - $45
  "price_1TAvXcGKbzbe9CQLtQgY1kwy", // 200 actions - $60
  "price_1TBAJTGKbzbe9CQLxrFmBDhw", // 300 actions - $85
  "price_1TBAJoGKbzbe9CQLnIE5C2IC", // 400 actions - $100
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { priceId } = await req.json();
    if (!priceId || !VALID_PRICE_IDS.includes(priceId)) {
      throw new Error("Invalid price ID");
    }

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/app`,
      cancel_url: `${req.headers.get("origin")}/app`,
      metadata: {
        user_id: user.id,
        type: "action_purchase",
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("create-action-purchase error:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
