// enrich-pillars
// Generates the 6 "extended" Business DNA pillars (market, financial, operations,
// people, growth, strategy) from the brand + product + audience context.
// Output JSON shapes follow the TimeWarp Business DNA Model document EXACTLY.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Each pillar prompt mirrors the formulas in the DNA model doc.
// Field shapes are designed so the data mapper can render them with the
// exact column headers the doc prescribes.
const PILLAR_PROMPTS: Record<string, string> = {
  market: `Return JSON with the keys exactly:
{
  "definition": {
    "tam": { "size": string, "scope": string },
    "sam": { "size": string, "scope": string },
    "som": { "size": string, "scope": string },
    "growth_rate": string,
    "maturity": "Emerging"|"Growth"|"Mature"|"Declining",
    "geographic_scope": string,
    "primary_category": string
  },
  "competitors": [ { "name": string, "positioning": string, "strengths": string, "weaknesses": string, "threat_level": "Low"|"Medium"|"High" } ],   // 3-5 items
  "advantages": [ { "type": "Cost"|"Differentiation"|"Brand"|"Network Effect"|"Switching Cost"|"IP & Patents"|"Distribution"|"Data", "how_long_to_copy": string, "what_protects_it": string } ],   // 3-5 items
  "forces": [ { "force": "Supplier Power"|"Buyer Power"|"Threat of New Entry"|"Threat of Substitution"|"Competitive Rivalry", "intensity": "Low"|"Medium"|"High", "trend": "Increasing"|"Stable"|"Decreasing", "implication": string } ],
  "trends": [ { "trend": string, "horizon": "Short"|"Medium"|"Long", "type": "Opportunity"|"Threat", "response": string } ],   // 4-8 items
  "timing": string,
  "positioning_map": { "x_label": string, "y_label": string, "points": [ { "name": string, "x": number, "y": number, "is_us": boolean } ] },
  "white_space": string,
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
For positioning_map, x_label & y_label are short axis labels (e.g. "Price: Low → High", "Quality: Basic → Premium"). x and y are 0-100. Include 4-7 named competitors plus exactly one with is_us=true. Always populate checklist with 5-8 items capturing whether each market field is well-defined.
For tam/sam/som, "size" MUST be a SHORT money figure ONLY (e.g. "$120B", "$8.5B", "~$400M", "$50–80M"). Never put descriptions in "size". "scope" is a SHORT phrase (max 8 words) describing what's included (e.g. "Global digital ad software", "EN-speaking SMB Meta advertisers", "Action-based AI ad platforms"). Use the formula [CATEGORY] + [GEOGRAPHIC SCOPE] + [CUSTOMER BASE SIZE] + [MATURITY STAGE] when reasoning, but keep "scope" terse. Use ranges if uncertain — never fabricate exact dollars.`,

  financial: `Return JSON with the keys exactly:
{
  "model": [ { "field": "Revenue Model Type"|"Value Creation"|"Value Capture"|"Customer Relationship"|"Revenue Concentration"|"Geographic Split", "value": string } ],
  "revenue_arch": [ { "stream": string, "volume": string, "price": string, "frequency": string, "trend": string } ],
  "costs": [ { "category": "COGS"|"S&M"|"R&D"|"G&A"|"Customer Success"|"CapEx", "fixed_or_variable": "Fixed"|"Variable", "amount": string, "pct_of_revenue": string, "trend": string } ],
  "unit_economics": [ { "metric": "CAC"|"LTV"|"LTV:CAC"|"Payback Period"|"Gross Margin"|"NRR"|"Churn Rate"|"AOV"|"Contribution Margin", "value": string, "benchmark": string, "trend": string, "lever": string } ],
  "profitability": [ { "margin_type": "Gross"|"Contribution"|"Operating"|"EBITDA"|"Net", "current_pct": string, "target_pct": string, "benchmark": string, "improvement_path": string } ],
  "cash_flow": string,
  "projections": [ string ],
  "funding": string,
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
Estimate cautiously based on industry norms when concrete numbers are not in context. Never invent specific revenue numbers — use ranges or "estimated". Always include a "checklist" array of 5-8 {item, status} objects covering each financial field.`,

  operations: `Return JSON with the keys exactly:
{
  "operating_model": string,
  "core_processes": [ { "process": string, "owner": string, "outcome": string, "kpi": string } ],
  "tech_stack": [ { "category": "Storefront"|"Payments"|"CRM"|"Analytics"|"Fulfillment"|"Support"|"Comms"|"Other", "tool": string, "purpose": string } ],
  "vendors": [ { "vendor": string, "supplies": string, "criticality": "1"|"2"|"3"|"4"|"5", "risk": string, "alternative": string } ],
  "quality": [ string ],
  "kpis": [ { "name": string, "target": string, "rationale": string } ],
  "risks": [ { "risk": string, "likelihood": "Low"|"Medium"|"High", "impact": "Low"|"Medium"|"High", "mitigation": string } ],
  "compliance": [ string ],
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
Use the doc formula [VENDOR] + [WHAT THEY SUPPLY] + [CRITICALITY: 1-5] + [RISK] + [ALTERNATIVE] for vendors. Always populate checklist with 5-8 items.`,

  people: `Return JSON with the keys exactly:
{
  "org_chart": { "role": string, "name": string, "children": [ { "role": string, "name": string, "children": [ { "role": string, "name": string } ] } ] },
  "leadership": [ { "role": string, "name": string, "focus": string } ],
  "capabilities": [ { "domain": string, "current_strength": "1"|"2"|"3"|"4"|"5", "required_strength": "1"|"2"|"3"|"4"|"5", "gap": string, "plan": string } ],
  "culture": [ { "component": "Stated Values"|"Lived Behaviors"|"Rituals"|"Artifacts", "what_it_captures": string } ],
  "hiring": [ string ],
  "performance": string,
  "compensation": string,
  "retention": string,
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
org_chart MUST be a recursive tree with {role, name, children}. Top node is the CEO/Founder. Use the doc formula [CAPABILITY DOMAIN] + [CURRENT STRENGTH: 1-5] + [REQUIRED STRENGTH: 1-5] + [GAP] + [PLAN] for capabilities. Use plausible function names (Founder, Marketing Lead, Ops Lead) when no real names are known. Always include checklist of 5-8 items.`,

  growth: `Return JSON with the keys exactly:
{
  "growth_model": [ { "lever": string, "channel": string, "expected_impact": string } ],
  "channels": [ { "channel": string, "stage": "Awareness"|"Consideration"|"Conversion"|"Retention", "fit": "Low"|"Medium"|"High", "notes": string } ],
  "funnel": [ { "stage": "Awareness"|"Interest"|"Consideration"|"Purchase"|"Retention"|"Advocacy", "volume": string, "rate": string, "color": string } ],
  "content": [ { "format": string, "topic": string, "channel": string } ],
  "campaigns": string,
  "creative": [ string ],
  "retention": string,
  "referral": string,
  "experiments": [ { "hypothesis": string, "channel": string, "status": "Planned"|"Running"|"Done" } ],
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
For funnel: volume is a count/range like "10,000 visits" or "~2k", rate is the conversion rate to next stage like "12%", and color is a HEX (e.g. "#4a86ff") with progressively deeper saturation per stage. Always include checklist of 5-8 items.`,

  strategy: `Return JSON with the keys exactly:
{
  "vision": string,
  "objectives": [ string ],
  "bets": [ { "bet": string, "thesis": string, "resources": string, "success_signal": string, "kill_signal": string } ],
  "stage_model": [ { "field": "Stage"|"Current Constraint"|"Next Stage Trigger"|"What to Optimize", "value": string } ],
  "resource_allocation": [ { "resource": string, "current_pct": string, "optimal_pct": string, "rebalancing_rationale": string } ],
  "decision_framework": [ { "decision_type": "Strategic (Irreversible)"|"Operational (Reversible)"|"Investment (Financial)"|"People (Hiring/Firing)"|"Crisis (Time-Pressured)", "criteria": string, "authority": string, "process": string } ],
  "risk_appetite": [ { "domain": string, "appetite": "Conservative"|"Moderate"|"Aggressive", "tolerance_threshold": string, "mitigation": string } ],
  "milestones": [ { "milestone": string, "horizon": "0-3m"|"3-6m"|"6-12m"|"12m+", "outcome": string, "owner": string } ],
  "narrative": string,
  "scenarios": [ { "scenario": "Base"|"Bull"|"Bear"|"Black Swan", "probability": string, "key_assumption": string, "response": string, "early_warnings": string } ],
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
Use the doc formulas exactly. For decision_framework follow [DECISION TYPE] + [CRITERIA] + [AUTHORITY] + [PROCESS]. For risk_appetite follow [RISK DOMAIN] + [APPETITE LEVEL] + [TOLERANCE THRESHOLD] + [MITIGATION]. Always include checklist of 5-8 items.`,

  brand: `Return JSON with the keys exactly:
{
  "mission": string,
  "vision": string,
  "values": [ { "value": string, "behavior": string } ],
  "positioning": string,
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
mission/vision are 1-2 sentences. positioning follows [FOR target] + [WHO need] + [OUR brand IS category] + [THAT does benefit] + [UNLIKE alternative]. Always include checklist of 5-8 items.`,

  product: `Return JSON with the keys exactly:
{
  "mechanism": string,
  "value_proposition": string,
  "roadmap": [ { "milestone": string, "horizon": "0-3m"|"3-6m"|"6-12m"|"12m+", "outcome": string } ],
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
mechanism = how the product creates the result (1-2 sentences). value_proposition = the elevator-pitch promise. roadmap is 4-8 forward milestones. Always include checklist of 5-8 items.`,

  audience: `Return JSON with the keys exactly:
{
  "journey": [ { "stage": "Awareness"|"Consideration"|"Decision"|"Onboarding"|"Retention"|"Advocacy", "moment": string, "thought": string } ],
  "decision_criteria": [ { "criterion": string, "weight": "High"|"Medium"|"Low", "what_proves_it": string } ],
  "pain_architecture": [ string ],
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
journey is the customer journey map. pain_architecture is 5-10 ranked pain points (most acute first). Always include checklist of 5-8 items.`,
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
    const { brandId, brandRowId, workspaceId, pillars } = body;

    if (!brandId || !brandRowId) {
      return new Response(JSON.stringify({ error: "brandId and brandRowId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // ---- Connection signals ----------------------------------------------------
    // When the user has connected providers (Outlook, Gmail, OneDrive, HubSpot,
    // Slack, etc.), surface a tiny, anti-fabrication summary of what we observe:
    // # of contacts, vendor-domain hints, top tools mentioned, # of files, # of
    // deals/pipeline value, # of Slack channels, etc. The AI uses this STRICTLY
    // as evidence — never as license to invent specifics. Each pillar prompt
    // already enforces "empty if no evidence".
    const { data: connectionsRaw } = await admin
      .from("user_connections")
      .select("provider, status, metadata, connected_at")
      .eq("user_id", user.id)
      .eq("status", "connected");
    const connectedProviders: string[] = (connectionsRaw || []).map((c: any) => c.provider);

    let connectionContext = "(no integrations connected)";
    if (connectedProviders.length > 0) {
      const lines: string[] = [];
      lines.push(`Connected providers (${connectedProviders.length}): ${connectedProviders.join(", ")}`);
      // Pillar relevance map — tells AI which pillars these signals can ground.
      lines.push("Provider → pillar relevance:");
      const relevance: Record<string, string> = {
        microsoft_outlook: "people, operations, growth (customer comms, vendor emails, team activity)",
        microsoft_onedrive: "operations, strategy (documents, contracts, decks, processes)",
        microsoft_onenote: "operations, strategy (notes, SOPs, planning docs)",
        microsoft_teams: "people, operations (channels = teams/processes, members = headcount)",
        google_gmail: "people, operations, growth (customer comms, vendors)",
        google_calendar: "people, operations (recurring meetings = processes, attendees = team)",
        google_drive: "operations, strategy (documents, decks, contracts)",
        google_docs: "operations, strategy",
        google_sheets: "financial, operations (KPI sheets, budgets, trackers)",
        google_slides: "strategy, growth (decks, plans, pitches)",
        slack: "people, operations (channels = teams, members = headcount, activity)",
        hubspot: "financial, growth, audience (deals, pipeline, contacts, owners = team)",
        zoom: "people, operations (recurring meetings, recordings)",
      };
      for (const p of connectedProviders) {
        if (relevance[p]) lines.push(`  • ${p} → ${relevance[p]}`);
      }
      connectionContext = lines.join("\n");
    }

    const systemPrompt = `You are a senior business strategist generating Business DNA for one of the 9 strategic pillars, following the TimeWarp Business DNA Model document.

CRITICAL EVIDENCE RULES — read carefully:
- You are working from a brand description, product list, audience list captured during onboarding, AND a list of which integrations the user has connected. The presence of a connection is a SIGNAL (e.g. "HubSpot connected" → there IS a CRM/pipeline; "Slack connected with N members" → there IS a team) but NOT a license to invent specific names, dollar amounts, or counts you do not see in the context.
- DO NOT fabricate. Do not invent specific revenue numbers, headcount, employee names, real vendor names, real competitor names, real CAC/LTV/margin numbers, real funding amounts, or real internal processes.
- For EACH field, decide: is there direct evidence in the provided context, OR is this a safe externally-observable category-level inference (e.g. "B2B SaaS companies in this category typically use a subscription revenue model")?
  - If YES (direct evidence) → fill it concretely.
  - If category-level inference is reasonable → fill it but make it generic to the CATEGORY (no fake specifics) and prefix or suffix the string with "(estimated from category)".
  - If NO basis at all (e.g. internal financials, real org chart, real vendors, real KPI targets) → return an EMPTY string "" for string fields, or an EMPTY array [] for arrays. Do NOT make up placeholder names like "John Doe", "Vendor A", "Competitor X", "$1M ARR" etc.
- Competitors: ONLY include real competitors you genuinely know exist in this category from public knowledge. If you can't name 2+ real ones with confidence, return an empty array.
- Org chart / leadership / vendors / tech stack: unless these were in the provided context, return empty arrays — do NOT invent names.
- Financials (CAC, LTV, margins, revenue, funding, projections): unless explicitly stated in the context, return empty strings/arrays. NEVER invent dollar figures.
- The "checklist" array MUST always be filled — for each field in the pillar, mark its status as "Done" (we have real data), "In Progress" (we have partial/estimated data), or "Gap" (no data — needs user input). This is how the user sees what's missing.
- Keep filled strings concise and decision-grade. Follow doc value formulas exactly when data exists.
- Return valid JSON matching the schema. No prose outside JSON.

Honesty over completeness. An empty field with a "Gap" checklist entry is FAR better than a fabricated one.`;

    const buildUserPrompt = (pillarId: string) => `Pillar: ${pillarId.toUpperCase()}

BRAND:
${brandContext}

PRODUCTS (${productRows.length}):
${productContext || "(no products)"}

AUDIENCES (${audienceRows.length}):
${audienceContext || "(no audiences)"}

CONNECTION SIGNALS:
${connectionContext}

${PILLAR_PROMPTS[pillarId]}`;

    const targetPillars: string[] = Array.isArray(pillars) && pillars.length
      ? pillars.filter((p: string) => PILLAR_PROMPTS[p])
      : Object.keys(PILLAR_PROMPTS);

    const results = await Promise.allSettled(
      targetPillars.map(async (pillarId) => {
        const data = await callAi(systemPrompt, buildUserPrompt(pillarId));
        return { pillarId, data };
      })
    );

    const inserted: string[] = [];
    const failed: { pillar: string; reason: string }[] = [];

    for (const r of results) {
      if (r.status === "rejected") {
        failed.push({ pillar: "unknown", reason: String(r.reason).slice(0, 120) });
        continue;
      }
      const { pillarId, data } = r.value;

      try {
        // brand/product/audience enrichments are stored under separate
        // *_dna data_types so they don't collide with the source rows.
        const TYPE_MAP: Record<string, string> = {
          brand: "brand_dna", product: "product_dna", audience: "audience_dna",
        };
        const storageType = TYPE_MAP[pillarId] || pillarId;

        const { data: existing } = await admin
          .from("user_business_data")
          .select("id, metadata")
          .eq("user_id", user.id)
          .eq("data_type", storageType);
        const stale = (existing || []).filter((row: any) => (row.metadata?.brandId || null) === brandId).map((row: any) => row.id);
        if (stale.length) {
          await admin.from("user_business_data").delete().in("id", stale);
        }

        const insertPayload: any = {
          user_id: user.id,
          workspace_id: wsId,
          source: "business-dna",
          is_analyzed: true,
          data_type: storageType,
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
