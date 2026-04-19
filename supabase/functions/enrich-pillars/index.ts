// enrich-pillars
// Generates the 6 "extended" Business DNA pillars (market, financial, operations,
// people, growth, strategy) from the brand + product + audience context that
// the user already saved during onboarding. Each pillar is stored as its own
// row in user_business_data (data_type = pillar id) and tagged with brandId
// in metadata so the UI mapper and AI consumers (Assistant, Dashboard, RAG)
// can pull them transparently.
//
// Fire-and-forget from onboarding — never blocks the user.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PILLAR_PROMPTS: Record<string, string> = {
  market: `Return JSON with the keys exactly:
{
  "definition": { "tam": string, "sam": string, "som": string },
  "competitors": [ { "name": string, "positioning": string, "strength": string, "weakness": string } ],   // 3-5 items
  "advantages": [ { "advantage": string, "why_sustainable": string } ],   // 3-5 items
  "forces": [ { "force": "Buyers"|"Suppliers"|"Substitutes"|"New Entrants"|"Rivalry", "intensity": "Low"|"Medium"|"High", "rationale": string } ],
  "trends": [ string ],   // 4-8 items
  "timing": string,            // one short paragraph
  "white_space": string        // one short paragraph
}
TAM/SAM/SOM must be in plain language with currency or volume estimate. Never fabricate exact dollars — use ranges.`,
  financial: `Return JSON with the keys exactly:
{
  "model": [ { "stream": string, "type": "subscription"|"transactional"|"service"|"licensing"|"ad"|"other", "notes": string } ],
  "revenue_arch": [ { "stream": string, "share_pct": string } ],   // estimates
  "costs": [ { "category": "Fixed"|"Variable"|"COGS"|"OPEX"|"CAC", "item": string, "notes": string } ],
  "unit_economics": [ { "metric": "AOV"|"CAC"|"LTV"|"Gross Margin"|"Payback"|"Churn", "value": string, "context": string } ],
  "profitability": [ { "stage": string, "margin_outlook": string } ],
  "cash_flow": string,
  "projections": [ string ],
  "funding": string
}
Estimate cautiously based on industry norms when concrete numbers are not in context. Never invent specific revenue numbers.`,
  operations: `Return JSON with the keys exactly:
{
  "operating_model": string,
  "core_processes": [ { "process": string, "owner": string, "outcome": string } ],
  "tech_stack": [ { "category": "Storefront"|"Payments"|"CRM"|"Analytics"|"Fulfillment"|"Support"|"Comms"|"Other", "tool": string, "purpose": string } ],
  "vendors": [ { "vendor": string, "role": string } ],
  "quality": [ string ],
  "kpis": [ { "name": string, "target": string, "rationale": string } ],
  "risks": [ { "risk": string, "likelihood": "Low"|"Medium"|"High", "mitigation": string } ],
  "compliance": [ string ]
}`,
  people: `Return JSON with the keys exactly:
{
  "org_chart": { "ceo": string, "branches": [ { "function": string, "lead": string, "reports": [ string ] } ] },
  "leadership": [ { "role": string, "name": string, "focus": string } ],
  "capabilities": [ { "capability": string, "current_level": "Gap"|"Emerging"|"Strong", "owner": string } ],
  "culture": [ { "value": string, "behavior": string } ],
  "hiring": [ string ],
  "performance": string,
  "compensation": string,
  "retention": string
}
For org/leadership use plausible function names (Founder, Marketing Lead, Ops Lead, etc.) when no real names are known.`,
  growth: `Return JSON with the keys exactly:
{
  "growth_model": [ { "lever": string, "channel": string, "expected_impact": string } ],
  "channels": [ { "channel": string, "stage": "Awareness"|"Consideration"|"Conversion"|"Retention", "fit": "Low"|"Medium"|"High", "notes": string } ],
  "funnel": [ { "stage": "Awareness"|"Interest"|"Consideration"|"Purchase"|"Retention"|"Advocacy", "metric": string, "value": string } ],
  "content": [ { "format": string, "topic": string, "channel": string } ],
  "campaigns": string,
  "creative": [ string ],
  "retention": string,
  "referral": string,
  "experiments": [ { "hypothesis": string, "channel": string, "status": "Planned"|"Running"|"Done" } ]
}`,
  strategy: `Return JSON with the keys exactly:
{
  "vision": string,
  "objectives": [ string ],
  "bets": [ { "bet": string, "rationale": string } ],
  "stage_model": [ { "dimension": "Stage"|"Model"|"Moat"|"Distribution", "value": string } ],
  "resource_allocation": [ { "area": string, "share_pct": string, "rationale": string } ],
  "priorities": [ string ],
  "decisions_log": [ { "date": string, "decision": string, "rationale": string } ],
  "roadmap": [ { "milestone": string, "horizon": "0-3m"|"3-6m"|"6-12m"|"12m+", "outcome": string } ],
  "narrative": string,
  "scenarios": [ { "scenario": "Best"|"Base"|"Downside", "trigger": string, "response": string } ]
}`,
};

async function callAi(systemPrompt: string, userPrompt: string): Promise<any> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    // try to recover: strip markdown fences
    const stripped = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    return JSON.parse(stripped);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data: { user }, error: userErr } = await anon.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const {
      brandId,                // logical brand id (from metadata)
      brandRowId,             // user_business_data row id of the brand
      workspaceId,
      pillars,                // optional subset, default = all 6
    } = body;

    if (!brandId || !brandRowId) {
      return new Response(JSON.stringify({ error: "brandId and brandRowId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull brand + product + audience context already stored
    const { data: rows } = await admin
      .from("user_business_data")
      .select("id, data_type, title, content, metadata, workspace_id")
      .eq("user_id", user.id)
      .in("data_type", ["brand", "product", "audience"]);

    const brandRow = rows?.find((r) => r.id === brandRowId);
    if (!brandRow) {
      return new Response(JSON.stringify({ error: "Brand row not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wsId = workspaceId || brandRow.workspace_id || null;
    const sameBrand = (r: any) => {
      try {
        const md = r.metadata || {};
        return md.brandId === brandId;
      } catch { return false; }
    };

    const productRows = (rows || []).filter((r) => r.data_type === "product" && sameBrand(r));
    const audienceRows = (rows || []).filter((r) => r.data_type === "audience" && sameBrand(r));

    const safe = (s: any) => { try { return typeof s === "string" ? s.slice(0, 4000) : JSON.stringify(s).slice(0, 4000); } catch { return ""; } };
    const brandContext = safe(brandRow.content);
    const productContext = productRows.map((r) => safe(r.content)).join("\n---\n").slice(0, 8000);
    const audienceContext = audienceRows.map((r) => safe(r.content)).join("\n---\n").slice(0, 8000);

    const systemPrompt = `You are a senior business strategist generating high-fidelity Business DNA for one of the 9 strategic pillars of a company.
You must:
- Use ONLY the brand/product/audience context provided to you. Do not fabricate facts.
- When data is thin, use cautious industry-typical inferences and clearly label them as "estimated" inside string fields. Never invent specific revenue, headcount, or competitor names that contradict the source.
- Always return valid JSON matching the schema you are given. No prose outside the JSON.
- Keep every string concise and decision-grade — short, punchy, decisive sentences.`;

    const buildUserPrompt = (pillarId: string) => `Pillar: ${pillarId.toUpperCase()}

BRAND:
${brandContext}

PRODUCTS (${productRows.length}):
${productContext || "(no products)"}

AUDIENCES (${audienceRows.length}):
${audienceContext || "(no audiences)"}

${PILLAR_PROMPTS[pillarId]}`;

    const targetPillars: string[] = Array.isArray(pillars) && pillars.length
      ? pillars.filter((p: string) => PILLAR_PROMPTS[p])
      : Object.keys(PILLAR_PROMPTS);

    // Run in parallel — each ~3-8s. All 6 in parallel keeps total under ~10s.
    const results = await Promise.allSettled(
      targetPillars.map(async (pillarId) => {
        const data = await callAi(systemPrompt, buildUserPrompt(pillarId));
        return { pillarId, data };
      })
    );

    const inserted: string[] = [];
    const failed: { pillar: string; reason: string }[] = [];

    // Upsert: delete any existing row of this data_type+brandId before inserting fresh
    for (const r of results) {
      if (r.status === "rejected") {
        failed.push({ pillar: "unknown", reason: String(r.reason).slice(0, 120) });
        continue;
      }
      const { pillarId, data } = r.value;

      try {
        // Remove old version for this brand
        const { data: existing } = await admin
          .from("user_business_data")
          .select("id, metadata")
          .eq("user_id", user.id)
          .eq("data_type", pillarId);
        const stale = (existing || []).filter((row: any) => (row.metadata?.brandId || null) === brandId).map((row: any) => row.id);
        if (stale.length) {
          await admin.from("user_business_data").delete().in("id", stale);
        }

        const insertPayload: any = {
          user_id: user.id,
          workspace_id: wsId,
          source: "business-dna",
          is_analyzed: true,
          data_type: pillarId,
          title: `${pillarId.charAt(0).toUpperCase() + pillarId.slice(1)} DNA`,
          content: JSON.stringify(data),
          metadata: { brandId, dna_segment: pillarId, dna_pillars: [pillarId], generated_by: "enrich-pillars", generated_at: new Date().toISOString() },
        };

        const { error } = await admin.from("user_business_data").insert(insertPayload);
        if (error) {
          failed.push({ pillar: pillarId, reason: error.message.slice(0, 120) });
        } else {
          inserted.push(pillarId);
        }
      } catch (e) {
        failed.push({ pillar: pillarId, reason: String(e).slice(0, 120) });
      }
    }

    return new Response(JSON.stringify({ success: true, inserted, failed }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("enrich-pillars error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
