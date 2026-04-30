import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

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

    // --- Per-user serialization to prevent duplicate workspace/brand creation
    // when the client (or React StrictMode) fires save-onboarding twice. ---
    const lockKey = await admin.rpc("acquire_user_onboarding_lock", { _user_id: userId }).catch(() => null);
    // Lock is best-effort; the real dedup happens via re-checks + unique guards below.

    // --- Resolve workspace server-side (never trust client blindly) ---
    let wsId: string | null = null;

    // Fetch user's actual workspaces (direct query, not RPC, to dedupe by created_by)
    const { data: ownedWs } = await admin
      .from("workspaces")
      .select("id, name, created_at")
      .eq("created_by", userId)
      .order("created_at", { ascending: true });
    const ownedList = (ownedWs as any[]) || [];

    // Pull membership-based list as fallback (covers invited users)
    const { data: memberWs } = await admin.rpc("get_user_workspaces", { _user_id: userId });
    const memberList = (memberWs as any[]) || [];

    if (hintWsId && (ownedList.some(w => w.id === hintWsId) || memberList.some((w: any) => w.workspace_id === hintWsId))) {
      wsId = hintWsId;
    } else if (ownedList.length > 0) {
      wsId = ownedList[0].id;
    } else if (memberList.length > 0) {
      wsId = memberList[0].workspace_id;
    }

    // If user has zero workspaces, create one — but re-check inside to avoid races.
    if (!wsId) {
      console.log("No workspace found for user, creating one server-side...");
      // Re-check immediately before insert
      const { data: recheck } = await admin
        .from("workspaces")
        .select("id")
        .eq("created_by", userId)
        .order("created_at", { ascending: true })
        .limit(1);
      if (recheck && recheck.length > 0) {
        wsId = recheck[0].id;
      } else {
        const newWsId = crypto.randomUUID();
        const { error: createErr } = await admin.from("workspaces").insert({
          id: newWsId,
          name: brandName || "My Workspace",
          created_by: userId,
        });

        if (createErr) {
          console.warn("Workspace create conflict, re-fetching:", createErr.message);
          const { data: retryData } = await admin
            .from("workspaces")
            .select("id")
            .eq("created_by", userId)
            .order("created_at", { ascending: true })
            .limit(1);
          if (retryData && retryData.length > 0) {
            wsId = retryData[0].id;
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
    }

    console.log("Resolved workspace:", wsId, "for user:", userId);

    const basePayload = {
      user_id: userId,
      source: "business-dna",
      is_analyzed: true,
      workspace_id: wsId,
    };

    const brandId = brandData?.id || `brand-${Date.now()}`;

    const brandTitle = brandData?.name || "My Business";

    // Idempotency: if a brand with the same title already exists in this workspace,
    // return it instead of inserting a duplicate. Onboarding can fire twice in
    // React StrictMode or if the user double-clicks.
    const { data: existingBrand } = await admin
      .from("user_business_data")
      .select("id, metadata")
      .eq("user_id", userId)
      .eq("workspace_id", wsId)
      .eq("data_type", "brand")
      .eq("title", brandTitle)
      .maybeSingle();

    let brandRowId: string | null = existingBrand?.id ?? null;
    let didCreateBrand = false;

    if (!brandRowId) {
      const { data: brandInsert, error: brandErr } = await admin.from("user_business_data").insert({
        ...basePayload,
        data_type: "brand",
        title: brandTitle,
        content: JSON.stringify(brandData),
        metadata: { brandId, dna_segment: "brand", dna_pillars: ["brand"] },
      }).select("id").single();

      if (brandErr) {
        console.error("Brand insert failed:", brandErr);
        const isDuplicate = (brandErr as any)?.code === "23505"
          || /one_brand_per_workspace|duplicate key/i.test(brandErr.message || "");
        if (isDuplicate) {
          return new Response(
            JSON.stringify({
              success: false,
              code: "WORKSPACE_HAS_BUSINESS",
              error: "This workspace already has a business. Create a new workspace to add another business.",
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ success: false, error: "Failed to save brand: " + brandErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      brandRowId = brandInsert?.id ?? null;
      didCreateBrand = true;
    } else {
      console.log("Brand already exists for workspace, skipping duplicate insert:", brandRowId);
    }

    // Insert products — 9-pillar model: 1 product per business
    const allProducts = (productsData || (productData ? [productData] : [])).slice(0, 1);
    for (const prod of allProducts) {
      const { error: productErr } = await admin.from("user_business_data").insert({
        ...basePayload,
        data_type: "product",
        title: prod?.name || "Imported Product",
        content: JSON.stringify(prod),
        metadata: { brandId, dna_segment: "product", dna_pillars: ["product"] },
      });
      if (productErr) {
        console.error("Product insert failed:", productErr);
      }
    }

    // Insert audiences — 9-pillar model: 1 audience per business
    const allAudiences = (audiencesData || (audienceData ? [audienceData] : [])).slice(0, 1);
    for (const aud of allAudiences) {
      if (!aud) continue;
      const { error: audErr } = await admin.from("user_business_data").insert({
        ...basePayload,
        data_type: "audience",
        title: aud?.name || "Target Audience",
        content: JSON.stringify(aud),
        metadata: { brandId, dna_segment: "audience", dna_pillars: ["audience"] },
      });
      if (audErr) {
        console.error("Audience insert failed:", audErr);
      }
    }

    // Rename workspace to brand name only for the first business
    if (brandName) {
      const { count } = await admin
        .from("user_business_data")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wsId)
        .eq("data_type", "brand");
      // count includes the brand we just inserted, so first business means count === 1
      if ((count ?? 0) <= 1) {
        await admin.from("workspaces").update({ name: brandName }).eq("id", wsId);
      }
    }

    return new Response(
      JSON.stringify({ success: true, workspaceId: wsId, brandRowId: brandInsert?.id || null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("save-onboarding error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
