import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Extract user from JWT
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "No authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify JWT and get user
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Service role client — bypasses RLS
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { brandData, productData, audienceData, workspaceId, brandName } = await req.json();

    // Resolve workspace if not provided
    let wsId = workspaceId;
    if (!wsId) {
      const { data: wsData } = await admin.rpc("get_user_workspaces", { _user_id: userId });
      if (wsData && (wsData as any[]).length > 0) {
        wsId = (wsData as any[])[0].workspace_id;
      }
    }

    if (!wsId) {
      return new Response(
        JSON.stringify({ success: false, error: "No workspace found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const basePayload = {
      user_id: userId,
      source: "business-dna",
      is_analyzed: true,
      workspace_id: wsId,
    };

    // Insert brand
    const { error: brandErr } = await admin.from("user_business_data").insert({
      ...basePayload,
      data_type: "brand",
      title: brandData?.name || "My Business",
      content: JSON.stringify(brandData),
    });

    if (brandErr) {
      console.error("Brand insert failed:", brandErr);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save brand: " + brandErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert product
    const { error: productErr } = await admin.from("user_business_data").insert({
      ...basePayload,
      data_type: "product",
      title: productData?.name || "Imported Product",
      content: JSON.stringify(productData),
    });

    if (productErr) {
      console.error("Product insert failed:", productErr);
      // Non-fatal — brand is already saved
    }

    // Insert audience (optional)
    if (audienceData) {
      const { error: audErr } = await admin.from("user_business_data").insert({
        ...basePayload,
        data_type: "audience",
        title: audienceData?.name || "Target Audience",
        content: JSON.stringify(audienceData),
      });

      if (audErr) {
        console.error("Audience insert failed:", audErr);
        // Non-fatal
      }
    }

    // Rename workspace to brand name
    if (brandName) {
      await admin.from("workspaces").update({ name: brandName }).eq("id", wsId);
    }

    return new Response(
      JSON.stringify({ success: true, workspaceId: wsId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("save-onboarding error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
