import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

import {
  assistantInsightFeedbackRequestSchema,
  safeParseJsonBody,
} from "../_shared/edge-request-schemas.ts";
import { edgeLog, userIdShort } from "../_shared/edge-logger.ts";

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

/** Mirrors run-employee business-brain theme buckets for assistant excerpts. */
function detectThemeFromExcerpt(excerpt: string): string {
  const q = (excerpt || "").toLowerCase();
  if (/\b(price|pricing|plan|offer|tier|subscription)\b/.test(q)) return "pricing";
  if (/\b(mrr|arr|revenue|profit|margin|cac|ltv)\b/.test(q)) return "financial";
  if (/\b(audience|persona|customer|icp)\b/.test(q)) return "audience";
  if (/\b(content|post|copy|creative|campaign|ad)\b/.test(q)) return "marketing";
  if (/\b(product|feature|roadmap)\b/.test(q)) return "product";
  if (/\b(hire|team|ops|process)\b/.test(q)) return "operations";
  return "strategy";
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

    let jsonBody: unknown;
    try {
      jsonBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = safeParseJsonBody(jsonBody, assistantInsightFeedbackRequestSchema);
    if (!parsed.ok) {
      return new Response(JSON.stringify({ error: parsed.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { businessId, workspaceId, sentiment, note, assistantExcerpt, userContextSnippet } = parsed.data;

    const { data: brandRow, error: brandErr } = await supabase
      .from("user_business_data")
      .select("id")
      .eq("id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (brandErr || !brandRow) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const themeKey = detectThemeFromExcerpt(assistantExcerpt);
    const excerptStored = assistantExcerpt.slice(0, 1200);
    const noteTrim = (note || "").trim().slice(0, 500);

    const { error: insertErr } = await supabase.from("ai_business_learning_events").insert({
      user_id: user.id,
      workspace_id: workspaceId ?? null,
      business_id: businessId,
      employee_id: null,
      agent_surface: "run-employee",
      mode: "chat",
      recommendation_type: "user_insight_feedback",
      dna_alignment_score: 0.5,
      user_message: noteTrim || "[insight feedback]",
      assistant_response_excerpt: excerptStored,
      metadata: {
        sentiment,
        theme_key: themeKey,
        source: "assistant_insight_feedback",
        outcome: sentiment === "helpful" ? "positive" : "negative",
        outcome_score: sentiment === "helpful" ? 0.9 : -0.9,
        user_context_snippet: (userContextSnippet || "").slice(0, 500),
      },
    });

    if (insertErr) {
      edgeLog("assistant-insight-feedback", "insert_failed", {
        user: userIdShort(user.id),
        err: insertErr.message,
      });
      throw new Error(insertErr.message);
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
    const delta = sentiment === "helpful" ? 0.1 : -0.08;
    const nextTheme = applyDelta(themeWeights, themeKey, delta);

    const { error: upsertErr } = await supabase.from("business_learning_state").upsert({
      user_id: user.id,
      workspace_id: workspaceId ?? null,
      business_id: businessId,
      source_weights: sourceWeights,
      category_weights: categoryWeights,
      tab_weights: tabWeights,
      theme_weights: nextTheme,
      updated_at: new Date().toISOString(),
    }, { onConflict: "business_id" });

    if (upsertErr) {
      edgeLog("assistant-insight-feedback", "state_upsert_failed", {
        user: userIdShort(user.id),
        err: upsertErr.message,
      });
    }

    edgeLog("assistant-insight-feedback", "ok", {
      user: userIdShort(user.id),
      businessId,
      sentiment,
      themeKey,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: message === "Unauthorized" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
