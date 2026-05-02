type PillarId =
  | "brand"
  | "product"
  | "audience"
  | "market"
  | "financial"
  | "operations"
  | "people"
  | "growth"
  | "strategy";

const PILLAR_RULES: Array<{ pillar: PillarId; re: RegExp; fieldIds: string[] }> = [
  { pillar: "brand", re: /\b(brand|positioning|voice|tagline|perception|identity)\b/i, fieldIds: ["b1","b4","b5","b7","b10"] },
  { pillar: "product", re: /\b(product|feature|pricing|offer|mechanism|usp)\b/i, fieldIds: ["p1","p3","p6","p8","p10","f1","f4"] },
  { pillar: "audience", re: /\b(audience|persona|icp|journey|pain point|objection)\b/i, fieldIds: ["a1","a3","a5","a7","a10"] },
  { pillar: "market", re: /\b(market|competitor|tam|sam|som|landscape|trend)\b/i, fieldIds: ["m1","m2","m3","m4","m6"] },
  { pillar: "financial", re: /\b(revenue|profit|margin|runway|cash flow|unit economics|cac|ltv)\b/i, fieldIds: ["f1","f2","f3","f4","f5","f7"] },
  { pillar: "operations", re: /\b(operations|process|workflow|stack|vendor|compliance)\b/i, fieldIds: ["o1","o2","o3","o6","o7"] },
  { pillar: "people", re: /\b(team|hiring|culture|org|retention|leadership)\b/i, fieldIds: ["pe1","pe2","pe4","pe5","pe8"] },
  { pillar: "growth", re: /\b(growth|channel|funnel|campaign|retention|acquisition)\b/i, fieldIds: ["g1","g2","g3","g4","g9"] },
  { pillar: "strategy", re: /\b(strategy|roadmap|okr|objective|milestone|bet)\b/i, fieldIds: ["s1","s2","s3","s5","s8","s10"] },
];

export interface DnaContextRoute {
  primaryPillar: PillarId | "general";
  relevantFieldIds: string[];
  contextBlocks: string[];
}

function classifyPillars(message: string): PillarId[] {
  const hits: PillarId[] = [];
  for (const rule of PILLAR_RULES) {
    if (rule.re.test(message)) hits.push(rule.pillar);
  }
  return Array.from(new Set(hits)).slice(0, 2);
}

function getPillarFieldMap(pillar: PillarId): string[] {
  return PILLAR_RULES.find((r) => r.pillar === pillar)?.fieldIds || [];
}

export async function runDnaContextRouter(
  supabase: any,
  userId: string,
  workspaceId: string | undefined,
  brandId: string | undefined,
  message: string,
  replyContract: "direct" | "live_lookup" | "strategic_plan" = "direct",
): Promise<DnaContextRoute> {
  // Always inject ALL 9 pillars so the assistant has complete Business DNA
  // visibility on every turn. Keyword-classified pillars are still tracked as
  // the "primary" pillar for prompting/citations, but field loading is global.
  const ALL_PILLARS: PillarId[] = ["brand","product","audience","market","financial","operations","people","growth","strategy"];
  const classified = classifyPillars(message);
  const pillars = ALL_PILLARS;
  const primaryPillar: PillarId | "general" = classified[0] || "general";

  let query = supabase
    .from("user_business_data")
    .select("id, title, content, data_type, source, analyzed_content")
    .limit(200);

  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  else query = query.eq("user_id", userId);

  const { data: rows } = await query;
  const allRows = rows || [];

  const fieldIds = Array.from(new Set(pillars.flatMap(getPillarFieldMap)));
  const contextBlocks: string[] = [];

  for (const row of allRows) {
    const body = String(row?.analyzed_content || row?.content || "");
    if (!body) continue;
    const lower = body.toLowerCase();
    const matched = fieldIds.filter((id) => lower.includes(`"${id.toLowerCase()}"`) || lower.includes(`${id.toLowerCase()}:`));
    if (matched.length === 0) continue;
    if (brandId && String(row.id) === String(brandId)) {
      contextBlocks.push(`### ${row.title || "Brand Context"}\n${body.slice(0, 2400)}`);
      continue;
    }
    if (matched.length > 0) {
      contextBlocks.push(`### ${row.title || row.data_type || "DNA Data"} [${matched.join(", ")}]\n${body.slice(0, 2400)}`);
    }
    if (contextBlocks.length >= 6) break;
  }

  return {
    primaryPillar,
    relevantFieldIds: fieldIds,
    contextBlocks,
  };
}

export function formatDnaRouterBlock(route: DnaContextRoute): string {
  if (!route.contextBlocks.length) return "";
  return `
## Pillar Context Router
Primary pillar: ${route.primaryPillar}
Auto-loaded fields: ${route.relevantFieldIds.join(", ") || "none"}

${route.contextBlocks.join("\n\n")}
`.trim();
}
