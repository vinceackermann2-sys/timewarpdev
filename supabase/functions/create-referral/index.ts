import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Invalid token");

    // Check if user already has a referral code
    const { data: existing } = await supabase
      .from("referrals")
      .select("referral_code")
      .eq("referrer_id", user.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ referral_code: existing.referral_code }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new referral entry
    const { data: newRef, error } = await supabase
      .from("referrals")
      .insert({
        referrer_id: user.id,
        referred_email: "pending",
      })
      .select("referral_code")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ referral_code: newRef.referral_code }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-referral error:", e);
    return new Response(JSON.stringify({ error: "Failed to create referral" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
