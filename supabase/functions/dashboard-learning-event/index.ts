import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function applyDelta(weights: Record<string, number>, key: string, delta: number): Record<string, number> {
  const current = Number(weights[key] || 0);
  const next = Math.max(-2, Math.min(4, current + delta));
  return { ...weights, [key]: Number(next.toFixed(3)) };
}

function computeObjectiveOutcomeBoost(currentValue: unknown, targetValue: unknown, deltaValue: unknown): number {
  const cur = typeof currentValue === "number" ? currentValue : null;
  const target = typeof targetValue === "number" ? targetValue : null;
  const delta = typeof deltaValue === "number" ? deltaValue : null;

  if (delta !== null) {
    if (delta > 0) return 0.05;
    if (delta < 0) return -0.05;
  }
  if (cur !== null && target !== null && Math.abs(target) > 0.00001) {
    const ratio = cur / target;
    if (ratio >= 1) return 0.06;
    if (ratio < 0.7) return -0.04;
  }
  return 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const {
      businessId,
      workspaceId,
      cardId,
      tab,
      eventType,
      source,
      category,
      objectiveId,
      metricName,
      currentValue,
      targetValue,
      deltaValue,
      metadata,
    } = await req.json();

    if (!businessId) throw new Error("businessId is required");
    if (!eventType) throw new Error("eventType is required");

    if (cardId && tab) {
      await supabase.from("dashboard_card_events").insert({
        user_id: user.id,
        workspace_id: workspaceId || null,
        business_id: businessId,
        card_id: cardId,
        tab,
        event_type: eventType,
        source: source || null,
        category: category || null,
        priority: metadata?.priority || null,
        metadata: metadata || {},
      });
    }

    if (objectiveId && metricName) {
      await supabase.from("dashboard_objective_outcomes").insert({
        user_id: user.id,
        workspace_id: workspaceId || null,
        business_id: businessId,
        objective_id: objectiveId,
        metric_name: metricName,
        current_value: typeof currentValue === "number" ? currentValue : null,
        target_value: typeof targetValue === "number" ? targetValue : null,
        delta_value: typeof deltaValue === "number" ? deltaValue : null,
        source: source || null,
        metadata: metadata || {},
      });
    }

    const { data: stateRow } = await supabase
      .from("business_learning_state")
      .select("source_weights, category_weights, tab_weights, theme_weights")
      .eq("business_id", businessId)
      .maybeSingle();

    const sourceWeights = (stateRow?.source_weights as Record<string, number> | null) || {};
    const categoryWeights = (stateRow?.category_weights as Record<string, number> | null) || {};
    const tabWeights = (stateRow?.tab_weights as Record<string, number> | null) || {};
    const themeWeights = (stateRow?.theme_weights as Record<string, number> | null) || {};

    const positive = ["opened", "clicked", "completed", "promoted"].includes(eventType);
    const negative = ["dismissed", "snoozed"].includes(eventType);
    const objectiveBoost = computeObjectiveOutcomeBoost(currentValue, targetValue, deltaValue);
    const delta = (positive ? 0.08 : negative ? -0.06 : 0) + objectiveBoost;

    const nextSource = source ? applyDelta(sourceWeights, source, delta) : sourceWeights;
    const nextCategory = category ? applyDelta(categoryWeights, category, delta) : categoryWeights;
    const nextTab = tab ? applyDelta(tabWeights, tab, delta) : tabWeights;
    const theme = typeof metadata?.theme === "string" ? metadata.theme : "";
    const nextTheme = theme ? applyDelta(themeWeights, theme, delta) : themeWeights;

    await supabase.from("business_learning_state").upsert({
      user_id: user.id,
      workspace_id: workspaceId || null,
      business_id: businessId,
      source_weights: nextSource,
      category_weights: nextCategory,
      tab_weights: nextTab,
      theme_weights: nextTheme,
      updated_at: new Date().toISOString(),
    }, { onConflict: "business_id" });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: error?.message === "Unauthorized" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
