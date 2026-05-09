// enrich-pillars
// Generates the 6 "extended" Business DNA pillars (market, financial, operations,
// people, growth, strategy) from the brand + product + audience context.
// Output JSON shapes follow the TimeWarp Business DNA Model document EXACTLY.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { DATA_BACKED_DECISION_TRIAD } from "../_shared/data-backed-decision-triad.ts";
import { buildPerformanceEvidenceMarkdown } from "../_shared/performance-evidence.ts";

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
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
Always populate checklist with 5-8 items capturing whether each market field is well-defined.
For tam/sam/som, "size" MUST be a SHORT money figure ONLY (e.g. "$120B", "$8.5B", "~$400M", "$50–80M"). Never put descriptions in "size". "scope" is a SHORT phrase (max 8 words) describing what's included (e.g. "Global digital ad software", "EN-speaking SMB Meta advertisers", "Action-based AI ad platforms"). Use the formula [CATEGORY] + [GEOGRAPHIC SCOPE] + [CUSTOMER BASE SIZE] + [MATURITY STAGE] when reasoning, but keep "scope" terse. Use ranges if uncertain — never fabricate exact dollars.`,

  financial: `Return JSON with the keys exactly:
{
  "model": [ { "field": "Revenue Model Type"|"Value Creation"|"Value Capture"|"Customer Relationship"|"Revenue Concentration"|"Geographic Split", "value": string } ],
  "revenue_arch": [ { "stream": string, "volume": string, "price": string, "frequency": string, "trend": string } ],
  "costs": [ { "category": "COGS"|"S&M"|"R&D"|"G&A"|"Customer Success"|"CapEx", "fixed_or_variable": "Fixed"|"Variable", "amount": string, "pct_of_revenue": string, "trend": string } ],
  "unit_economics": [ { "metric": "CAC"|"LTV"|"LTV:CAC"|"Payback Period"|"Gross Margin"|"NRR"|"Churn Rate"|"AOV"|"Contribution Margin", "value": string, "benchmark": string, "trend": string, "lever": string } ],
  "profitability": [ { "margin_type": "Gross"|"Contribution"|"Operating"|"EBITDA"|"Net", "current_pct": string, "target_pct": string, "benchmark": string, "improvement_path": string } ],
  "cash_flow": string,
  "funding": string,
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
Never invent specific revenue numbers. If integration/accounting evidence is missing, leave revenue_arch/costs/unit_economics/profitability/cash_flow/funding empty and mark Gap in checklist. Category benchmarks are allowed only when explicitly labeled "(estimated from category)" and only in benchmark/reference fields. Always include a "checklist" array of 5-8 {item, status} objects covering each financial field.`,

  operations: `Return JSON with the keys exactly:
{
  "operating_model": string,
  "core_processes": [ { "process": string, "owner": string, "outcome": string, "kpi": string } ],
  "tech_stack": [ { "category": "Storefront"|"Payments"|"CRM"|"Analytics"|"Fulfillment"|"Support"|"Comms"|"Other", "tool": string, "purpose": string } ],
  "vendors": [ { "vendor": string, "supplies": string, "criticality": "1"|"2"|"3"|"4"|"5", "risk": string, "alternative": string } ],
  "quality": [ string ],
  "kpis": [ { "name": string, "target": string, "rationale": string } ],
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
org_chart MUST be a recursive tree with {role, name, children}. Top node is the CEO/Founder. Use the doc formula [CAPABILITY DOMAIN] + [CURRENT STRENGTH: 1-5] + [REQUIRED STRENGTH: 1-5] + [GAP] + [PLAN] for capabilities. CRITICAL: never invent placeholder names or titles when sources are sparse; return empty names/rows and mark Gap. Always include checklist of 5-8 items.`,

  growth: `Return JSON with the keys exactly:
{
  "growth_model": [ { "lever": string, "channel": string, "expected_impact": string, "evidence_path": "internal_history"|"verified_external"|"user_feedback", "evidence": string, "how_determined": string, "verification": { "what": string, "when_observed": string, "where_surface": string, "how_observable": string, "source_url": string, "confidence": "high"|"medium"|"low"|"unverified" } | null } ],
  "channels": [ { "channel": string, "stage": "Awareness"|"Consideration"|"Conversion"|"Retention", "fit": "Low"|"Medium"|"High", "notes": string, "evidence_path": "internal_history"|"verified_external"|"user_feedback", "evidence": string, "how_determined": string, "verification": { "what": string, "when_observed": string, "where_surface": string, "how_observable": string, "source_url": string, "confidence": "high"|"medium"|"low"|"unverified" } | null } ],
  "funnel": [ { "stage": "Awareness"|"Interest"|"Consideration"|"Purchase"|"Retention"|"Advocacy", "volume": string, "rate": string, "color": string } ],
  "content": [ { "format": string, "topic": string, "channel": string } ],
  "campaigns": string,
  "creative": [ string ],
  "retention": string,
  "referral": string,
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
For funnel: volume is a count/range like "10,000 visits" or "~2k", rate is the conversion rate to next stage like "12%", and color is a HEX (e.g. "#4a86ff") with progressively deeper saturation per stage. Always include checklist of 5-8 items.
For growth_model, channels, and experiments: set evidence_path from context blocks. Use verification=null unless evidence_path is verified_external and you have a citable URL; if external pattern cannot be verified, set confidence to "unverified" and do not claim validated copycat tactics.`,

  strategy: `Return JSON with the keys exactly:
{
  "vision": string,
  "objectives": [ string ],
  "bets": [ { "bet": string, "thesis": string, "resources": string, "success_signal": string, "kill_signal": string, "evidence_path": "internal_history"|"verified_external"|"user_feedback", "evidence": string, "how_determined": string, "verification": { "what": string, "when_observed": string, "where_surface": string, "how_observable": string, "source_url": string, "confidence": "high"|"medium"|"low"|"unverified" } | null } ],
  "stage_model": [ { "field": "Stage"|"Current Constraint"|"Next Stage Trigger"|"What to Optimize", "value": string } ],
  "resource_allocation": [ { "resource": string, "current_pct": string, "optimal_pct": string, "rebalancing_rationale": string } ],
  "milestones": [ { "milestone": string, "horizon": "0-3m"|"3-6m"|"6-12m"|"12m+", "outcome": string, "owner": string, "evidence_path": "internal_history"|"verified_external"|"user_feedback", "evidence": string, "how_determined": string, "verification": { "what": string, "when_observed": string, "where_surface": string, "how_observable": string, "source_url": string, "confidence": "high"|"medium"|"low"|"unverified" } | null } ],
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
Use the doc formulas exactly. For decision_framework follow [DECISION TYPE] + [CRITERIA] + [AUTHORITY] + [PROCESS]. For risk_appetite follow [RISK DOMAIN] + [APPETITE LEVEL] + [TOLERANCE THRESHOLD] + [MITIGATION]. Always include checklist of 5-8 items.
For bets and milestones: include evidence_path, evidence, how_determined on each row; verification only when evidence_path is verified_external and a URL exists in context; otherwise verification=null. If INTERNAL PERFORMANCE block is empty, label strategic bets that rely on inference as hypothesis in the evidence string.`,

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
  "roadmap": [ { "milestone": string, "horizon": "0-3m"|"3-6m"|"6-12m"|"12m+", "outcome": string, "evidence_path": "internal_history"|"verified_external"|"user_feedback", "evidence": string, "how_determined": string, "verification": { "what": string, "when_observed": string, "where_surface": string, "how_observable": string, "source_url": string, "confidence": "high"|"medium"|"low"|"unverified" } | null } ],
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
mechanism = how the product creates the result (1-2 sentences). value_proposition = the elevator-pitch promise. roadmap is 4-8 forward milestones. Each roadmap row MUST include evidence_path, evidence (short quote or pointer to which context block), and how_determined (one sentence). Use verification object only when evidence_path is verified_external and you cite a URL from COMPETITOR/BENCHMARK or MARKET/AUDIENCE evidence; otherwise verification=null. If INTERNAL PERFORMANCE is sparse, prefix evidence with "hypothesis:" for that row. Always include checklist of 5-8 items.`,

  audience: `Return JSON with the keys exactly:
{
  "journey": [ { "stage": "Awareness"|"Consideration"|"Decision"|"Onboarding"|"Retention"|"Advocacy", "moment": string, "thought": string, "supporting_signal": string } ],
  "decision_criteria": [ { "criterion": string, "weight": "High"|"Medium"|"Low", "what_proves_it": string } ],
  "pain_architecture": [ string ],
  "checklist": [ { "item": string, "status": "Done"|"In Progress"|"Gap" } ]
}
journey is the customer journey map; supporting_signal briefly cites INTERNAL AUDIENCE SIGNALS or AUDIENCE/COMMUNITY evidence when used, else "inference". pain_architecture is 5-10 ranked pain points (most acute first). Always include checklist of 5-8 items.`,
};

type SourceMode =
  | "manual_or_integration"
  | "web_evidence_required"
  | "integration_preferred"
  | "integration_only"
  | "internal_or_competitor_cited";

const FIELD_SOURCE_POLICY: Record<string, Record<string, SourceMode>> = {
  brand: {
    b1: "manual_or_integration", b2: "manual_or_integration", b3: "manual_or_integration", b4: "manual_or_integration",
    b5: "manual_or_integration", b6: "manual_or_integration", b7: "manual_or_integration", b8: "manual_or_integration",
    b9: "manual_or_integration", b10: "internal_or_competitor_cited", b11: "manual_or_integration",
  },
  product: {
    p1: "integration_preferred", p2: "integration_preferred", p3: "integration_preferred", p4: "integration_preferred",
    p5: "integration_preferred", p6: "integration_preferred", p7: "integration_preferred", p8: "integration_preferred",
    p9: "internal_or_competitor_cited", p10: "internal_or_competitor_cited", p11: "internal_or_competitor_cited",
    p12: "internal_or_competitor_cited", p13: "integration_preferred", p14: "internal_or_competitor_cited", p15: "integration_preferred",
  },
  audience: {
    a1: "manual_or_integration", a2: "integration_preferred", a3: "manual_or_integration", a4: "internal_or_competitor_cited",
    a5: "internal_or_competitor_cited", a6: "internal_or_competitor_cited", a7: "internal_or_competitor_cited",
    a8: "integration_preferred", a9: "internal_or_competitor_cited", a10: "internal_or_competitor_cited",
    a11: "integration_preferred", a12: "manual_or_integration", a13: "manual_or_integration",
  },
  market: {
    m1: "integration_only", m2: "integration_only", m3: "integration_only",
    m4: "integration_only", m5: "integration_only", m6: "integration_only",
    m7: "integration_only", m8: "integration_only", m9: "integration_only",
  },
  financial: {
    f1: "integration_only", f2: "integration_only", f3: "integration_only", f4: "integration_only",
    f5: "integration_only", f6: "integration_only", f7: "integration_only", f8: "integration_only", f9: "integration_only",
  },
  operations: {
    o1: "integration_only", o2: "integration_only", o3: "integration_only", o4: "integration_only",
    o5: "integration_only", o6: "integration_only", o7: "integration_only",
    o8: "integration_only", o9: "integration_only",
  },
  people: {
    pe1: "integration_only", pe2: "integration_only", pe3: "internal_or_competitor_cited", pe4: "internal_or_competitor_cited",
    pe5: "internal_or_competitor_cited", pe6: "integration_preferred", pe7: "integration_only", pe8: "integration_preferred",
    pe9: "integration_preferred",
  },
  growth: {
    g1: "integration_only", g2: "integration_only", g3: "integration_only",
    g4: "integration_only", g5: "integration_only", g6: "integration_only",
    g7: "integration_only", g8: "integration_only", g9: "integration_only", g10: "integration_only",
  },
  strategy: {
    s1: "integration_only", s2: "integration_only", s3: "integration_only",
    s4: "integration_only", s5: "integration_only", s6: "integration_only",
    s7: "integration_only", s8: "integration_only", s9: "integration_only",
    s10: "integration_only", s11: "integration_only",
  },
};

function hasConnectedProvider(connectedProviders: string[], includesAny: string[]): boolean {
  return connectedProviders.some((p) => includesAny.some((x) => p.includes(x)));
}

function sanitizeNumbersForLowEvidence(input: string): string {
  if (!input) return input;
  // If value contains hard numeric claims without explicit estimate wording, blank it.
  if (/\b\d+(?:\.\d+)?(?:%|k|m|b)?\b/i.test(input) && !/\bestimate|estimated|range|approx|~|about\b/i.test(input)) return "";
  return input;
}

function sanitizePeopleData(payload: any, hasPeopleEvidence: boolean): any {
  if (!payload || typeof payload !== "object") return payload;
  const placeholderName = /^(founder|ceo|marketing lead|ops lead|sales lead|john doe|jane doe|employee \d+|team member)$/i;
  const scrubNode = (node: any): any => {
    if (!node || typeof node !== "object") return node;
    const out: any = { ...node };
    const name = String(out.name || "").trim();
    if (!hasPeopleEvidence || placeholderName.test(name)) out.name = "";
    if (Array.isArray(out.children)) out.children = out.children.map(scrubNode);
    return out;
  };
  if (payload.org_chart) payload.org_chart = scrubNode(payload.org_chart);
  if (Array.isArray(payload.leadership)) {
    payload.leadership = payload.leadership
      .map((x: any) => ({ ...x, name: (!hasPeopleEvidence || placeholderName.test(String(x?.name || "").trim())) ? "" : x?.name || "" }))
      .filter((x: any) => String(x.name || "").trim().length > 0);
  }
  if (!hasPeopleEvidence) {
    payload.compensation = "";
    payload.retention = payload.retention || "";
  }
  return payload;
}

function sanitizeFinancialData(payload: any, hasFinancialIntegration: boolean): any {
  if (!payload || typeof payload !== "object") return payload;
  if (!hasFinancialIntegration) {
    payload.revenue_arch = [];
    payload.costs = [];
    payload.unit_economics = [];
    payload.profitability = [];
    payload.cash_flow = "";
    payload.funding = "";
  } else {
    if (Array.isArray(payload.unit_economics)) {
      payload.unit_economics = payload.unit_economics.map((r: any) => ({ ...r, value: sanitizeNumbersForLowEvidence(String(r?.value || "")) }));
    }
  }
  return payload;
}

function enforceChecklist(data: any, defaultItems: string[]): any {
  if (!data || typeof data !== "object") return data;
  const list = Array.isArray(data.checklist) ? data.checklist : [];
  if (list.length >= 3) return data;
  data.checklist = defaultItems.slice(0, 6).map((item) => ({ item, status: "Gap" as const }));
  return data;
}

const CHECKLIST_DEFAULTS: Record<string, string[]> = {
  brand: ["Brand description", "Mission", "Vision", "Values", "Voice", "Perception"],
  product: ["Description", "Features", "Pricing", "USPs", "Social proof", "Roadmap"],
  audience: ["Audience description", "Segmentation", "Persona", "Triggers", "Language patterns", "Retention"],
  market: ["Market definition", "Competitors", "Positioning map", "Forces", "Trends", "White space"],
  financial: ["Business model", "Revenue architecture", "Cost structure", "Unit economics", "Cash flow", "Funding"],
  operations: ["Operating model", "Core processes", "Tech stack", "Vendors", "Operational KPIs", "Compliance"],
  people: ["Org structure", "Leadership profiles", "Capability map", "Culture", "Compensation", "Retention"],
  growth: ["Growth model", "Channel intelligence", "Funnel architecture", "Campaigns", "Creative intelligence", "Experiments"],
  strategy: ["Strategic vision", "Objectives", "Strategic bets", "Resource allocation", "Milestones", "Scenario planning"],
};

type EvidenceMode = "blend" | "internal" | "external" | "feedback_first";

function normalizeEvidenceMode(raw: unknown): EvidenceMode {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "internal" || v === "external" || v === "feedback_first") return v;
  return "blend";
}

function safeParseJson(value: unknown): any | null {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function evidenceModeInstruction(mode: EvidenceMode): string {
  switch (mode) {
    case "internal":
      return "User-selected evidence mode: INTERNAL — prioritize Path 1 (performance + learning + comms). Use competitor/benchmark snippets only to fill explicit gaps; mark external items unverified when citations are thin.";
    case "external":
      return "User-selected evidence mode: EXTERNAL — prioritize Path 2 (verified public benchmark + audience/community snippets). Still cite URLs; keep verification objects honest. Use internal KPI block when present as a cross-check.";
    case "feedback_first":
      return "User-selected evidence mode: FEEDBACK-FIRST — prioritize Path 3 plus FILE/URL EVIDENCE FROM FUNNEL above; treat user-provided excerpts as authoritative for scope they cover.";
    default:
      return "Evidence mode: BLEND — pick the strongest path per claim (prefer internal KPI+learning when data exists; else verified external; always honor user-provided funnel files/URLs when applicable).";
  }
}

function extractCompetitorNames(brandParsed: any, productParsed: any): string[] {
  const names = new Set<string>();
  const push = (v: unknown) => {
    const t = String(v || "").trim();
    if (t.length > 1 && t.length < 96) names.add(t);
  };
  const harvest = (node: any) => {
    if (!node) return;
    if (Array.isArray(node.competitors)) {
      for (const c of node.competitors) push(typeof c === "string" ? c : c?.name);
    }
    if (Array.isArray(node.competitorNames)) for (const c of node.competitorNames) push(c);
    if (typeof node.mainCompetitor === "string") push(node.mainCompetitor);
  };
  harvest(brandParsed);
  harvest(productParsed);
  return [...names].slice(0, 6);
}

function summarizeThemeWeights(themeWeights: Record<string, number>): { line: string; improving: string[]; degrading: string[] } {
  const entries = Object.entries(themeWeights).filter(([, v]) => typeof v === "number" && Number.isFinite(v));
  const positive = entries
    .filter(([, v]) => v > 0.2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k} (${v > 0 ? "+" : ""}${v.toFixed(2)})`);
  const negative = entries
    .filter(([, v]) => v < -0.2)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([k, v]) => `${k} (${v.toFixed(2)})`);
  const line = entries
    .filter(([, v]) => Math.abs(v) > 0.12)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 6)
    .map(([k, v]) => `${k}: ${v > 0 ? "+" : ""}${Number(v).toFixed(2)}`)
    .join("; ");
  return { line, improving: positive, degrading: negative };
}

async function loadBusinessLearningSummary(admin: any, businessId: string): Promise<string> {
  const { data: stateRow } = await admin
    .from("business_learning_state")
    .select("theme_weights, source_weights, updated_at")
    .eq("business_id", businessId)
    .maybeSingle();
  if (!stateRow) return "(no business_learning_state row yet — Path 1 learning priors empty)";
  const tw = (stateRow.theme_weights as Record<string, number> | null) || {};
  const { line, improving, degrading } = summarizeThemeWeights(tw);
  const parts: string[] = [];
  parts.push(`business_learning_state updated_at: ${stateRow.updated_at || "unknown"}`);
  if (line) parts.push(`Theme emphasis (results-adjusted): ${line}`);
  if (improving.length) parts.push(`Patterns tagged improving: ${improving.join(", ")}`);
  if (degrading.length) parts.push(`Patterns tagged degrading: ${degrading.join(", ")}`);
  const sw = stateRow.source_weights;
  if (sw && typeof sw === "object" && Object.keys(sw).length) {
    parts.push(`Source weights (compact): ${JSON.stringify(sw).slice(0, 400)}`);
  }
  return parts.join("\n");
}

const AUDIENCE_COMMS_HINTS = /\b(feedback|review|rating|support|ticket|csat|nps|complaint|praise|reddit|twitter|x\.com|linkedin)\b/i;

async function loadInternalCommsContrastPack(
  admin: any,
  userId: string,
  brandId: string,
  workspaceId?: string | null,
): Promise<string> {
  const now = Date.now();
  const windowMs = 30 * 24 * 60 * 60 * 1000;
  const currentStart = new Date(now - windowMs).toISOString();
  const previousStart = new Date(now - windowMs * 2).toISOString();

  let query = admin
    .from("user_business_data")
    .select("data_type, source, title, content, created_at, metadata")
    .eq("user_id", userId)
    .neq("source", "business-dna")
    .in("data_type", ["message", "email"])
    .gte("created_at", previousStart)
    .order("created_at", { ascending: false })
    .limit(400);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);

  const { data: rows } = await query;
  const scoped = (rows || []).filter((row: any) => {
    const md = row.metadata || {};
    return !md?.brandId || md.brandId === brandId;
  });

  const sample = (subset: any[], n: number) =>
    subset.slice(0, n).map((r: any) =>
      `- [${r.data_type}/${r.source || "?"}] ${r.title || "—"} @ ${String(r.created_at || "").slice(0, 10)}: ${compact(String(r.content || ""), 160)}`
    );

  const current = scoped.filter((r: any) => String(r.created_at) >= currentStart);
  const previous = scoped.filter((r: any) => String(r.created_at) < currentStart);

  const lines: string[] = [];
  lines.push(`Comms volume: current 30d=${current.length}, prior 30d=${previous.length} (messages + emails).`);
  if (current.length + previous.length === 0) {
    lines.push("**Sparse:** no recent comms rows — Path 1 comms contrast unavailable.");
    return lines.join("\n");
  }
  if (current.length < 3 || previous.length < 3) {
    lines.push("**Sparse:** low comms sample — use qualitative language only.");
  }
  lines.push("Recent window samples:");
  lines.push(...sample(current, 8));
  if (previous.length) {
    lines.push("Prior window samples:");
    lines.push(...sample(previous, 6));
  }

  const audRows = scoped.filter((r: any) => AUDIENCE_COMMS_HINTS.test(`${r.title}\n${r.content}`));
  if (audRows.length) {
    lines.push(`Audience/support-flavored snippets (${audRows.length} hits, mixed windows):`);
    lines.push(...sample(audRows, 6));
  }

  return lines.join("\n");
}

async function buildCompetitorBenchmarkEvidence(
  names: string[],
  categoryLine: string,
  maxItems: number,
): Promise<{ markdown: string; urls: string[] }> {
  const header =
    "Each bullet may support Path 2 only with a real URL. Before recommending adaptation, require what/when/where/how — if unknown from snippet, mark confidence unverified in downstream JSON.";
  const items: Array<{ url: string; title: string; snippet: string }> = [];
  const queries: string[] = [];
  if (names.length) {
    for (const n of names.slice(0, 3)) queries.push(`${n} ${categoryLine} marketing product`.trim());
  }
  queries.push(`${categoryLine} competitive landscape alternatives`.trim());
  for (const q of queries) {
    const chunk = await fetchMarketEvidence(q);
    for (const c of chunk) {
      if (!items.find((x) => x.url === c.url)) items.push(c);
      if (items.length >= maxItems) break;
    }
    if (items.length >= maxItems) break;
  }
  if (!items.length) {
    return { markdown: `${header}\n(no public competitor/benchmark snippets retrieved)`, urls: [] };
  }
  return {
    markdown: `${header}\n` + items.map((e) => `- ${e.title}: ${e.snippet} (source: ${e.url})`).join("\n"),
    urls: items.map((e) => e.url).filter(Boolean),
  };
}

async function buildAudienceExternalEvidence(
  label: string,
  maxItems: number,
): Promise<{ markdown: string; urls: string[] }> {
  if (!label) {
    return { markdown: "(no audience label for community search)", urls: [] };
  }
  const q = `${label} customer preferences pain points discussion`;
  const items = await fetchMarketEvidence(q);
  if (!items.length) {
    return { markdown: "(no audience/community snippets retrieved)", urls: [] };
  }
  const slice = items.slice(0, maxItems);
  return {
    markdown: slice.map((e) => `- ${e.title}: ${e.snippet} (source: ${e.url})`).join("\n"),
    urls: slice.map((e) => e.url).filter(Boolean),
  };
}

function compact(text: string, max = 1200): string {
  return (text || "").replace(/\s+/g, " ").trim().slice(0, max);
}

async function fetchMarketEvidence(query: string): Promise<Array<{ url: string; title: string; snippet: string }>> {
  const out: Array<{ url: string; title: string; snippet: string }> = [];
  try {
    const ddg = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    if (ddg.ok) {
      const data = await ddg.json();
      const abstract = String(data?.AbstractText || "");
      const abstractUrl = String(data?.AbstractURL || "");
      if (abstract && abstractUrl) {
        out.push({
          url: abstractUrl,
          title: String(data?.Heading || "DuckDuckGo result"),
          snippet: compact(abstract, 450),
        });
      }
      const related = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [];
      for (const item of related.slice(0, 3)) {
        if (item?.FirstURL && item?.Text) {
          out.push({
            url: String(item.FirstURL),
            title: "Related topic",
            snippet: compact(String(item.Text), 320),
          });
        }
      }
    }
  } catch {
    // non-fatal
  }
  return out.slice(0, 5);
}

async function loadPeopleSignalsFromIntegrations(admin: any, userId: string, brandId: string, workspaceId?: string | null): Promise<string> {
  let query = admin
    .from("user_business_data")
    .select("data_type, source, title, content, metadata")
    .eq("user_id", userId)
    .neq("source", "business-dna")
    .order("created_at", { ascending: false })
    .limit(250);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);

  const { data: rows } = await query;
  const scoped = (rows || []).filter((row: any) => {
    const md = row.metadata || {};
    return !md?.brandId || md.brandId === brandId;
  });

  const contacts = scoped.filter((r: any) => r.data_type === "contact").slice(0, 30);
  const messages = scoped.filter((r: any) => r.data_type === "message").slice(0, 20);
  const calendars = scoped.filter((r: any) => r.data_type === "calendar").slice(0, 20);
  const integrations = scoped.filter((r: any) => r.data_type === "integration").slice(0, 20);

  const lines: string[] = [];
  if (contacts.length > 0) {
    lines.push(`Contacts (${contacts.length}):`);
    for (const c of contacts.slice(0, 12)) {
      lines.push(`- ${c.title || "Unknown"} | ${compact(String(c.content || ""), 140)}`);
    }
  }
  if (messages.length > 0) {
    lines.push(`Messages (${messages.length})`);
    for (const m of messages.slice(0, 6)) lines.push(`- ${m.title || "Message"} | ${compact(String(m.content || ""), 120)}`);
  }
  if (calendars.length > 0) {
    lines.push(`Calendar signals (${calendars.length})`);
    for (const e of calendars.slice(0, 6)) lines.push(`- ${e.title || "Event"}`);
  }
  if (integrations.length > 0) {
    lines.push(`Integration channels (${integrations.length})`);
    for (const ch of integrations.slice(0, 8)) lines.push(`- ${ch.title || "Channel"} (${ch.source || "source"})`);
  }
  return lines.length > 0 ? lines.join("\n") : "(no integration people signals found)";
}

async function callAi(systemPrompt: string, userPrompt: string): Promise<any> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      reasoning: { effort: "high" },
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
    const { brandId, brandRowId, workspaceId, pillars, externalEvidence, superchargeMode, evidenceMode: rawEvidenceMode } = body;
    const evidenceMode = normalizeEvidenceMode(rawEvidenceMode);

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

    // Run heavy enrichment in background to avoid edge runtime 150s idle timeout.
    // Caller gets immediate ack; results land in DB as each pillar completes.
    const backgroundTask = (async () => {
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
    const webEvidenceFromFunnel = Array.isArray(externalEvidence?.urls) ? externalEvidence.urls : [];
    const fileEvidenceFromFunnel = Array.isArray(externalEvidence?.files) ? externalEvidence.files : [];

    const marketSizingQuery = [
      brandRow.title || "",
      "market size TAM SAM SOM",
      productRows[0]?.title || "",
      audienceRows[0]?.title || "",
    ].filter(Boolean).join(" ");
    const fetchedMarketEvidence: any[] = [];
    const allMarketEvidence = [
      ...webEvidenceFromFunnel.map((x: any) => ({
        url: String(x?.url || ""),
        title: "Provided URL evidence",
        snippet: compact(String(x?.excerpt || ""), 450),
      })),
      ...fetchedMarketEvidence,
    ].filter((x) => x.url && x.snippet).slice(0, 8);

    const peopleSignals = await loadPeopleSignalsFromIntegrations(admin, user.id, brandId, wsId);

    const brandParsed = safeParseJson(brandRow.content) || {};
    const firstProductParsed = safeParseJson(productRows[0]?.content) || {};
    const competitorNames = extractCompetitorNames(brandParsed, firstProductParsed);
    const categoryLine = [brandRow.title || "", brandParsed?.category || ""].filter(Boolean).join(" | ");

    let performanceMarkdown = await buildPerformanceEvidenceMarkdown(admin, brandId, 30).catch(() =>
      "(INTERNAL PERFORMANCE unavailable)"
    );
    let learningMarkdown = await loadBusinessLearningSummary(admin, brandId).catch(() => "(LEARNING SIGNALS unavailable)");
    let commsMarkdown = await loadInternalCommsContrastPack(admin, user.id, brandId, wsId).catch(() =>
      "(INTERNAL COMMS unavailable)"
    );

    const compLimit = evidenceMode === "internal" ? 4 : evidenceMode === "external" ? 10 : 7;
    const competitorPack = { markdown: "(competitor research moved to Skills)", urls: [] as string[] };
    let competitorBenchmarkMarkdown = competitorPack.markdown;
    const audienceExtLimit = evidenceMode === "internal" ? 3 : 6;
    const audiencePack = { markdown: "(audience external research moved to Skills)", urls: [] as string[] };
    let audienceExternalMarkdown = audiencePack.markdown;

    if (evidenceMode === "external") {
      performanceMarkdown = performanceMarkdown.slice(0, 1200);
      learningMarkdown = learningMarkdown.slice(0, 900);
      commsMarkdown = commsMarkdown.slice(0, 1400);
    }
    if (evidenceMode === "internal") {
      competitorBenchmarkMarkdown = competitorBenchmarkMarkdown.slice(0, 2200);
      audienceExternalMarkdown = audienceExternalMarkdown.slice(0, 900);
    }

    // Integrations intentionally excluded from Business DNA enrichment.
    // Connected providers are used for actions/automation only — they do not
    // contribute evidence to DNA fields. DNA is grounded purely in onboarding
    // brand/product/audience context, uploaded files, and cited market evidence.
    const connectionContext = "(integrations are not used as evidence for Business DNA)";

    const systemPrompt = `You are a senior business strategist generating Business DNA for one of the 9 strategic pillars, following the TimeWarp Business DNA Model document.

CRITICAL EVIDENCE RULES — read carefully:
- You are working from a brand description, product list, audience list captured during onboarding, connected integrations, internal comms/performance/learning blocks, and funnel file/url evidence. Read ALL context blocks before deciding any field.
- The presence of a connection is a SIGNAL (e.g. "HubSpot connected" → there IS a CRM/pipeline; "Slack connected with N members" → there IS a team) but NOT a license to invent specific names, dollar amounts, or counts you do not see in the context.
- DO NOT fabricate. Do not invent specific revenue numbers, headcount, employee names, real vendor names, real competitor names, real CAC/LTV/margin numbers, real funding amounts, or real internal processes.

## SOURCE HIERARCHY — STRICT, AUTHORITATIVE

Every field you produce MUST trace back to one of these sources, in this order of priority:

  TIER 1 — INTERNAL DATA (the user's own evidence, ALWAYS WINS):
    1. User-connected integration data (HubSpot deals, Stripe revenue,
       Gmail/Outlook contacts, Drive/OneDrive files, Slack/Teams messages,
       Calendar meetings, Zoom recordings, …)
    2. User-uploaded documents (pitch deck, financials, strategy doc,
       product specs, customer interviews, P&L, etc. — see "FILE/URL
       EVIDENCE FROM FUNNEL")

  TIER 2 — EXTERNAL PUBLIC DATA (only when Tier 1 is silent on a field):
    3. Website crawl context (ONLY allowed for branding + audience
       understanding; do NOT use website-only claims for financial,
       people, operations, growth, strategy, or product execution fields)
    4. Verified public sources: LinkedIn (company + leadership profiles),
       allabolag.se / Companies House / SEC filings (for company registry,
       org structure, financials), Crunchbase (funding), public social
       media (Twitter/X, Instagram, TikTok, YouTube — for brand voice,
       audience signals, campaign creative)
    5. Cited web snippets (review platforms, news, industry reports — see
       MARKET EVIDENCE / COMPETITOR SNIPPETS)
    6. Category-level inference (labelled "(estimated from category)")

  FORBIDDEN:
    7. AI generation without evidence — never. Empty + "Gap" beats made-up.

## CONFLICT RESOLUTION

When INTERNAL data (Tier 1) conflicts with EXTERNAL data (Tier 2) — for
example, the user's pitch deck says ARR is $4M but Crunchbase says $10M
— ALWAYS use the INTERNAL number. The user's own data is ground truth.
Never average them, never split the difference, never silently prefer the
public source. Cite the internal source in the field's evidence trail.

## PER-FIELD DECISION

For EACH field, decide:
  - Tier 1 evidence present → fill concretely, evidence wins.
  - Only Tier 2 evidence → fill, mark provenance external.
  - Tier 1 says X, Tier 2 says Y → use X. Internal beats external on
    every conflict, every time.
  - Only category-level inference → fill only when allowed and label
    "(estimated from category)".
  - No defensible basis → return EMPTY string "" or EMPTY array [] and
    mark Gap in checklist.

## SPECIFIC FIELD RULES

- Competitors: ONLY include real competitors you genuinely know exist in this category from public knowledge or that appear in MARKET EVIDENCE / cited snippets. If you can't name 2+ real ones with confidence, return an empty array.
- Org chart / leadership: prefer Tier 1 (Slack member list, calendar attendees, HubSpot owners). When Tier 1 is missing, you may use LinkedIn-derived names ONLY if they appear in MARKET EVIDENCE snippets. NEVER invent names from website content alone.
- Financials (CAC, LTV, margins, revenue, funding, projections): prefer Stripe / accounting integration data > user-uploaded financials > allabolag.se / SEC filings (cited) > category benchmarks (labelled). Unless evidence is concrete in one of these tiers, return empty. NEVER invent dollar figures.
- TAM/SAM/SOM: must be evidence-backed from MARKET EVIDENCE when present. If evidence is weak or missing, use cautious ranges and clearly mark estimated assumptions.
- Brand voice / tone / personality: derive from copy patterns in the user's own crawled site + uploaded documents first; only then triangulate with public socials.
- Website context may directly support BRAND, PRODUCT, and AUDIENCE fields only.
- For MARKET, FINANCIAL, OPERATIONS, PEOPLE, GROWTH, and STRATEGY: website-only claims are not allowed. Use integrations + uploaded files first; if they are missing, leave fields empty and mark Gap.

## OUTPUT RULES

- The "checklist" array MUST always be filled — for each field in the pillar, mark its status as "Done" (we have real data), "In Progress" (we have partial/estimated data), or "Gap" (no data — needs user input). This is how the user sees what's missing.
- Keep filled strings concise and decision-grade. Follow doc value formulas exactly when data exists.
- Return valid JSON matching the schema. No prose outside JSON.

Honesty over completeness. An empty field with a "Gap" checklist entry is FAR better than a fabricated one. If no source data exists for a pillar, return empty fields and a gap checklist only.

${DATA_BACKED_DECISION_TRIAD}`;

    const buildUserPrompt = (pillarId: string) => `Pillar: ${pillarId.toUpperCase()}

${evidenceModeInstruction(evidenceMode)}

## INTERNAL PERFORMANCE — objective KPI windows (Path 1)
${performanceMarkdown}

## INTERNAL LEARNING STATE (Path 1)
${learningMarkdown}

## INTERNAL COMMS CONTRAST — mail/chat recent vs prior window (Path 1)
${commsMarkdown}

## COMPETITOR / BENCHMARK SNIPPETS — cite-only, requires verification before adoption (Path 2)
${competitorBenchmarkMarkdown}

## AUDIENCE / COMMUNITY SNIPPETS — cite-only (Path 2b)
${audienceExternalMarkdown}

${["brand", "product", "audience"].includes(pillarId) ? `BRAND:
${brandContext}

PRODUCTS (${productRows.length}):
${productContext || "(no products)"}

AUDIENCES (${audienceRows.length}):
${audienceContext || "(no audiences)"}` : `BRAND/PRODUCT/AUDIENCE WEBSITE CONTEXT:
(redacted for this pillar: website-derived context is only allowed to directly populate brand/product/audience fields)`}

CONNECTION SIGNALS:
${connectionContext}

PEOPLE INTEGRATION SIGNALS (prioritize for people/org fields):
${peopleSignals}

MARKET EVIDENCE (prioritize for TAM/SAM/SOM):
${allMarketEvidence.length > 0
  ? allMarketEvidence.map((e) => `- ${e.title}: ${e.snippet} (source: ${e.url})`).join("\n")
  : "(no market evidence found from web/funnel)"}

FILE/URL EVIDENCE FROM FUNNEL (Path 3 / user-provided context):
${fileEvidenceFromFunnel.length > 0
  ? fileEvidenceFromFunnel.map((f: any) => `- ${String(f?.name || "file")}: ${compact(String(f?.excerpt || ""), 320)}`).join("\n")
  : "(none)"}

FIELD SOURCE MODE POLICY (authoritative):
${JSON.stringify(FIELD_SOURCE_POLICY[pillarId] || {}, null, 2)}

${PILLAR_PROMPTS[pillarId]}`;

    const targetPillars: string[] = Array.isArray(pillars) && pillars.length
      ? pillars.filter((p: string) => PILLAR_PROMPTS[p])
      : Object.keys(PILLAR_PROMPTS);

    const results = await Promise.allSettled(
      targetPillars.map(async (pillarId) => {
        let data = await callAi(systemPrompt, buildUserPrompt(pillarId));
        const hasPeopleEvidence = hasConnectedProvider(connectedProviders, ["slack", "teams", "hubspot", "google", "microsoft"]);
        const hasFinancialIntegration = hasConnectedProvider(connectedProviders, ["stripe", "hubspot", "quickbooks", "xero", "netsuite", "google_sheets"]);
        if (pillarId === "people") data = sanitizePeopleData(data, hasPeopleEvidence);
        if (pillarId === "financial") data = sanitizeFinancialData(data, hasFinancialIntegration);
        data = enforceChecklist(data, CHECKLIST_DEFAULTS[pillarId] || ["Field completeness"]);
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
          metadata: {
            brandId,
            dna_segment: pillarId,
            dna_pillars: [pillarId],
            generated_by: "enrich-pillars",
            generated_at: new Date().toISOString(),
            supercharge_mode: !!superchargeMode,
            evidence_mode: evidenceMode,
            evidence_sources: [
              ...allMarketEvidence.map((e) => e.url),
              ...competitorPack.urls,
              ...audiencePack.urls,
              ...webEvidenceFromFunnel.map((e: any) => String(e?.url || "")),
            ].filter(Boolean).slice(0, 20),
            evidence_quality: allMarketEvidence.length >= 3 ? "high" : allMarketEvidence.length > 0 ? "medium" : "low",
            integration_first_applied: pillarId === "people",
            field_source_policy: (FIELD_SOURCE_POLICY as any)[pillarId] || {},
          },
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

    })();

    try {
      // @ts-ignore EdgeRuntime is provided by Supabase edge runtime
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(backgroundTask.catch((e) => console.error("enrich-pillars bg error:", e)));
      } else {
        backgroundTask.catch((e) => console.error("enrich-pillars bg error:", e));
      }
    } catch (e) {
      console.error("enrich-pillars schedule error:", e);
    }

    return new Response(JSON.stringify({ success: true, queued: true }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("enrich-pillars error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
