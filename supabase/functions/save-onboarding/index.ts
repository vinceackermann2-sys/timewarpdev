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

    const { brandData, productData, productsData, audienceData, audiencesData, workspaceId: hintWsId, brandName } = await req.json();

    // --- Resolve workspace server-side (never trust client blindly) ---
    let wsId: string | null = null;

    // Fetch user's actual workspaces
    const { data: wsData } = await admin.rpc("get_user_workspaces", { _user_id: userId });
    const userWorkspaces = (wsData as any[]) || [];

    if (userWorkspaces.length > 0) {
      if (hintWsId && userWorkspaces.some((w: any) => w.workspace_id === hintWsId)) {
        wsId = hintWsId;
      } else {
        wsId = userWorkspaces[0].workspace_id;
      }
    }

    // If user has zero workspaces, create one
    if (!wsId) {
      console.log("No workspace found for user, creating one server-side...");
      const newWsId = crypto.randomUUID();
      const { error: createErr } = await admin.from("workspaces").insert({
        id: newWsId,
        name: brandName || "My Workspace",
        created_by: userId,
      });

      if (createErr) {
        console.warn("Workspace create conflict, re-fetching:", createErr.message);
        const { data: retryData } = await admin.rpc("get_user_workspaces", { _user_id: userId });
        if (retryData && (retryData as any[]).length > 0) {
          wsId = (retryData as any[])[0].workspace_id;
        } else {
          return new Response(
            JSON.stringify({ success: false, error: "Could not resolve workspace" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        await admin.from("workspace_members").insert({
          workspace_id: newWsId,
          user_id: userId,
          role: "owner",
        });
        wsId = newWsId;
      }
    }

    console.log("Resolved workspace:", wsId, "for user:", userId);

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

    // Insert products (support both single productData and array productsData)
    const allProducts = productsData || (productData ? [productData] : []);
    for (const prod of allProducts) {
      const { error: productErr } = await admin.from("user_business_data").insert({
        ...basePayload,
        data_type: "product",
        title: prod?.name || "Imported Product",
        content: JSON.stringify(prod),
      });
      if (productErr) {
        console.error("Product insert failed:", productErr);
      }
    }

    // Insert audiences (support both single audienceData and array audiencesData)
    const allAudiences = audiencesData || (audienceData ? [audienceData] : []);
    for (const aud of allAudiences) {
      if (!aud) continue;
      const { error: audErr } = await admin.from("user_business_data").insert({
        ...basePayload,
        data_type: "audience",
        title: aud?.name || "Target Audience",
        content: JSON.stringify(aud),
      });
      if (audErr) {
        console.error("Audience insert failed:", audErr);
      }
    }

    // Rename workspace to brand name
    if (brandName) {
      await admin.from("workspaces").update({ name: brandName }).eq("id", wsId);
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
