import { edgeLog, userIdShort } from "../edge-logger.ts";
import { fetchObjectiveSignal } from "../performance-evidence.ts";

type BrainLoadParams = {
  userId: string;
  brandId?: string;
  workspaceId?: string;
};

type LearningSummary = {
  topRecommendationTypes: string[];
  recentThemes: string[];
  totalEvents: number;
  insightFeedbackHelpful: number;
  insightFeedbackNotHelpful: number;
  reinforcedPositive: number;
  reinforcedNegative: number;
  avgOutcomeScore: number;
};

type ScoreParts = {
  objectiveDelta: number;
  dashboardEngagement: number;
  integrationSignals: number;
  chatFeedback: number;
  confidence: number;
  finalScore: number;
};

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

function compactList(values: string[], max = 3): string[] {
  return values.filter(Boolean).map((v) => v.trim()).filter((v) => v.length > 0).slice(0, max);
}

function detectRecommendationType(userMessage: string): string {
  const q = (userMessage || "").toLowerCase();
  if (/\b(price|pricing|plan|offer|tier|subscription)\b/.test(q)) return "pricing";
  if (/\b(mrr|arr|revenue|profit|margin|cac|ltv|pipeline|deal)\b/.test(q)) return "financial";
  if (/\b(audience|persona|customer|icp|segment)\b/.test(q)) return "audience";
  if (/\b(content|post|copy|creative|campaign|ad)\b/.test(q)) return "marketing";
  if (/\b(product|feature|roadmap)\b/.test(q)) return "product";
  if (/\b(hire|team|ops|process)\b/.test(q)) return "operations";
  return "strategy";
}

function scoreDnaAlignment(userMessage: string, profileContext: string): number {
  if (!userMessage || !profileContext) return 0.5;
  const messageWords = Array.from(new Set(
    userMessage.toLowerCase().split(/\W+/).filter((w) => w.length > 3),
  ));
  if (messageWords.length === 0) return 0.5;
  const lowerProfile = profileContext.toLowerCase();
  let matches = 0;
  for (const word of messageWords) {
    if (lowerProfile.includes(word)) matches++;
  }
  return Math.max(0, Math.min(1, matches / Math.min(messageWords.length, 8)));
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function normalizeSigned(numerator: number, denominator: number, dampener = 4): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  const denom = Math.max(denominator + dampener, 1);
  return clamp(numerator / denom, -1, 1);
}

function applyDelta(weights: Record<string, number>, key: string, delta: number): Record<string, number> {
  const current = Number(weights[key] || 0);
  const next = clamp(current + delta, -2, 4);
  return { ...weights, [key]: Number(next.toFixed(3)) };
}

const USER_INSIGHT_FEEDBACK = "user_insight_feedback";
const POSITIVE_SIGNAL_WORDS = [
  "closed won", "renewed", "approved", "great", "excellent", "happy", "thanks", "confirmed", "shipped", "on track", "recovered", "upside",
];
const NEGATIVE_SIGNAL_WORDS = [
  "churn", "cancel", "complaint", "blocked", "delay", "delayed", "missed", "issue", "escalated", "refund", "failed", "risk", "down",
];

function countSignalWords(text: string, words: string[]): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let count = 0;
  for (const w of words) {
    if (lower.includes(w)) count++;
  }
  return count;
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function calcConfidence(parts: { objectiveCount: number; eventCount: number; integrationCount: number; feedbackCount: number }): number {
  const weighted = (parts.objectiveCount * 2.5) + (parts.eventCount * 0.8) + (parts.integrationCount * 0.05) + (parts.feedbackCount * 1.4);
  return clamp(weighted / 30, 0, 1);
}

function inferHeuristicDelta(metadata: Record<string, unknown> | null, assistantResponse: string): number {
  const meta = metadata || {};
  const sentiment = String(meta.sentiment || "").toLowerCase();
  if (sentiment === "helpful") return 0.1;
  if (sentiment === "not_helpful") return -0.08;

  const explicitOutcome = String(meta.outcome || "").toLowerCase();
  if (explicitOutcome === "positive") return 0.035;
  if (explicitOutcome === "negative") return -0.03;

  if (meta.guardrail_intervened === true) return -0.03;
  const text = (assistantResponse || "").toLowerCase();
  if (!text || text.length < 30) return -0.015;
  if (/\b(error|failed|unable|stalled|timeout)\b/.test(text)) return -0.02;
  return 0.012;
}

async function loadLearningSummary(supabase: any, userId: string, businessId?: string): Promise<LearningSummary> {
  let query = supabase
    .from("ai_business_learning_events")
    .select("recommendation_type, user_message, assistant_response_excerpt, metadata")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(120);

  if (businessId) query = query.eq("business_id", businessId);

  const { data: events } = await query;
  const rows = events || [];
  if (rows.length === 0) {
    return {
      topRecommendationTypes: [],
      recentThemes: [],
      totalEvents: 0,
      insightFeedbackHelpful: 0,
      insightFeedbackNotHelpful: 0,
      reinforcedPositive: 0,
      reinforcedNegative: 0,
      avgOutcomeScore: 0,
    };
  }

  const counts = new Map<string, number>();
  const themes = new Map<string, number>();
  let insightFeedbackHelpful = 0;
  let insightFeedbackNotHelpful = 0;
  let reinforcedPositive = 0;
  let reinforcedNegative = 0;
  const outcomeScores: number[] = [];

  for (const row of rows) {
    const meta = safeParseJson(row.metadata) || {};
    const score = Number(meta.outcome_score);
    const fallback = inferHeuristicDelta(meta, String(row.assistant_response_excerpt || ""));
    const effective = Number.isFinite(score) ? clamp(score, -1, 1) : fallback;
    outcomeScores.push(effective);
    if (effective > 0) reinforcedPositive++;
    if (effective < 0) reinforcedNegative++;

    const recType = String(row.recommendation_type || "").trim();
    if (recType === USER_INSIGHT_FEEDBACK) {
      const s = meta.sentiment;
      if (s === "helpful") insightFeedbackHelpful++;
      else if (s === "not_helpful") insightFeedbackNotHelpful++;
      continue;
    }

    if (recType) counts.set(recType, (counts.get(recType) || 0) + 1);

    const msg = String(row.user_message || "").toLowerCase();
    const theme = detectRecommendationType(msg);
    themes.set(theme, (themes.get(theme) || 0) + 1);
  }

  const topRecommendationTypes = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key)
    .slice(0, 4);

  const recentThemes = Array.from(themes.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key)
    .slice(0, 3);

  return {
    topRecommendationTypes,
    recentThemes,
    totalEvents: rows.length,
    insightFeedbackHelpful,
    insightFeedbackNotHelpful,
    reinforcedPositive,
    reinforcedNegative,
    avgOutcomeScore: Number(average(outcomeScores).toFixed(3)),
  };
}

function summarizeWeightExtremes(weights: Record<string, number>): { positive: string[]; negative: string[] } {
  const entries = Object.entries(weights)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v));

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

  return { positive, negative };
}

function formatThemeWeightsLine(themeWeights: Record<string, number>): string {
  const entries = Object.entries(themeWeights)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) > 0.12)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 6);
  if (entries.length === 0) return "";
  return entries
    .map(([k, v]) => `${k}: ${v > 0 ? "+" : ""}${Number(v).toFixed(2)}`)
    .join("; ");
}

async function loadThemeWeightsSummary(supabase: any, businessId: string): Promise<{
  line: string;
  improving: string[];
  degrading: string[];
}> {
  const { data: stateRow } = await supabase
    .from("business_learning_state")
    .select("theme_weights")
    .eq("business_id", businessId)
    .maybeSingle();
  const themeWeights = (stateRow?.theme_weights as Record<string, number> | null) || {};
  const { positive, negative } = summarizeWeightExtremes(themeWeights);
  return {
    line: formatThemeWeightsLine(themeWeights),
    improving: positive,
    degrading: negative,
  };
}

async function fetchDashboardEventSignal(supabase: any, businessId: string, days: number): Promise<{ score: number; count: number }> {
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;
  const currentStart = new Date(now - windowMs).toISOString();
  const previousStart = new Date(now - (windowMs * 2)).toISOString();

  const { data: rows } = await supabase
    .from("dashboard_card_events")
    .select("event_type, created_at")
    .eq("business_id", businessId)
    .gte("created_at", previousStart)
    .lt("created_at", new Date(now).toISOString())
    .limit(600);

  const allRows = rows || [];
  const currentRows = allRows.filter((r: any) => String(r.created_at) >= currentStart);
  const previousRows = allRows.filter((r: any) => String(r.created_at) < currentStart);

  const scoreBucket = (subset: any[]) => {
    let pos = 0;
    let neg = 0;
    for (const row of subset) {
      const ev = String(row.event_type || "");
      if (["opened", "clicked", "completed", "promoted"].includes(ev)) pos++;
      if (["dismissed", "snoozed"].includes(ev)) neg++;
    }
    return normalizeSigned(pos - neg, pos + neg, 3);
  };

  const currentScore = scoreBucket(currentRows);
  const previousScore = scoreBucket(previousRows);
  return {
    score: clamp(currentScore - (previousScore * 0.5), -1, 1),
    count: currentRows.length + previousRows.length,
  };
}

async function fetchIntegrationSignal(supabase: any, userId: string, businessId: string, days: number): Promise<{ score: number; count: number; tags: string[] }> {
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;
  const currentStart = new Date(now - windowMs).toISOString();
  const previousStart = new Date(now - (windowMs * 2)).toISOString();

  const { data: rows } = await supabase
    .from("user_business_data")
    .select("title, content, analyzed_content, metadata, source, created_at")
    .eq("user_id", userId)
    .neq("source", "business-dna")
    .gte("created_at", previousStart)
    .lt("created_at", new Date(now).toISOString())
    .limit(500);

  const allRows = (rows || []).filter((r: any) => {
    const md = safeParseJson(r.metadata) || r.metadata || {};
    const mdBrandId = String(md?.brandId || "");
    return !mdBrandId || mdBrandId === businessId;
  });

  const evalRows = (subset: any[]) => {
    let pos = 0;
    let neg = 0;
    const tags: string[] = [];

    for (const row of subset) {
      const blob = [row.title, row.content, row.analyzed_content, JSON.stringify(row.metadata || {})]
        .map((v) => String(v || ""))
        .join("\n")
        .toLowerCase();
      const p = countSignalWords(blob, POSITIVE_SIGNAL_WORDS);
      const n = countSignalWords(blob, NEGATIVE_SIGNAL_WORDS);
      pos += p;
      neg += n;
      if (p > 0) tags.push(`positive:${row.source || "unknown"}`);
      if (n > 0) tags.push(`negative:${row.source || "unknown"}`);
    }

    return { pos, neg, tags };
  };

  const currentRows = allRows.filter((r: any) => String(r.created_at) >= currentStart);
  const previousRows = allRows.filter((r: any) => String(r.created_at) < currentStart);
  const curr = evalRows(currentRows);
  const prev = evalRows(previousRows);

  const sentimentCurrent = normalizeSigned(curr.pos - curr.neg, curr.pos + curr.neg, 4);
  const sentimentPrev = normalizeSigned(prev.pos - prev.neg, prev.pos + prev.neg, 4);
  const activityDrift = normalizeSigned(currentRows.length - previousRows.length, currentRows.length + previousRows.length, 8);

  return {
    score: clamp(((sentimentCurrent - sentimentPrev) * 0.8) + (activityDrift * 0.2), -1, 1),
    count: currentRows.length + previousRows.length,
    tags: Array.from(new Set([...curr.tags, ...prev.tags])).slice(0, 8),
  };
}

async function fetchFeedbackSignal(supabase: any, userId: string, businessId: string, days: number): Promise<{ score: number; count: number }> {
  const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();
  const { data: rows } = await supabase
    .from("ai_business_learning_events")
    .select("recommendation_type, metadata")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .eq("recommendation_type", USER_INSIGHT_FEEDBACK)
    .gte("created_at", since)
    .limit(120);

  let pos = 0;
  let neg = 0;
  for (const row of rows || []) {
    const meta = safeParseJson(row.metadata) || {};
    const s = String(meta.sentiment || "");
    if (s === "helpful") pos++;
    if (s === "not_helpful") neg++;
  }

  return {
    score: normalizeSigned(pos - neg, pos + neg, 2),
    count: pos + neg,
  };
}

async function buildOutcomeScore(
  supabase: any,
  userId: string,
  businessId: string,
  workspaceId: string | undefined,
  metadata: Record<string, unknown>,
  assistantResponse: string,
): Promise<{ score: number; parts: ScoreParts; integrationTags: string[] }> {
  void workspaceId;

  const objective = await fetchObjectiveSignal(supabase, businessId, 30);
  const dashboard = await fetchDashboardEventSignal(supabase, businessId, 7);
  const integration = await fetchIntegrationSignal(supabase, userId, businessId, 7);
  const feedback = await fetchFeedbackSignal(supabase, userId, businessId, 14);

  const heuristic = inferHeuristicDelta(metadata, assistantResponse);
  const confidence = calcConfidence({
    objectiveCount: objective.count,
    eventCount: dashboard.count,
    integrationCount: integration.count,
    feedbackCount: feedback.count,
  });

  const explicitOutcome = String(metadata.outcome || "").toLowerCase();
  const explicitBias = explicitOutcome === "positive" ? 0.15 : explicitOutcome === "negative" ? -0.15 : 0;

  const weighted =
    (objective.score * 0.38) +
    (dashboard.score * 0.22) +
    (integration.score * 0.22) +
    (feedback.score * 0.12) +
    (heuristic * 0.06) +
    explicitBias;

  const shrunk = weighted * (0.35 + (confidence * 0.65));
  const score = clamp(shrunk, -1, 1);

  return {
    score,
    integrationTags: integration.tags,
    parts: {
      objectiveDelta: Number(objective.score.toFixed(3)),
      dashboardEngagement: Number(dashboard.score.toFixed(3)),
      integrationSignals: Number(integration.score.toFixed(3)),
      chatFeedback: Number(feedback.score.toFixed(3)),
      confidence: Number(confidence.toFixed(3)),
      finalScore: Number(score.toFixed(3)),
    },
  };
}

export async function buildBusinessBrainContext(supabase: any, params: BrainLoadParams): Promise<{
  businessId: string | null;
  profileContext: string;
  learningContext: string;
}> {
  const { userId, brandId, workspaceId } = params;
  if (!brandId) {
    return { businessId: null, profileContext: "", learningContext: "" };
  }

  const { data: brandRow } = await supabase
    .from("user_business_data")
    .select("id, title, content")
    .eq("id", brandId)
    .single();

  if (!brandRow) return { businessId: null, profileContext: "", learningContext: "" };

  const brandContent = safeParseJson(brandRow.content) || {};
  const logicalBrandId = typeof brandContent?.id === "string" ? brandContent.id : null;

  let baseQuery = supabase
    .from("user_business_data")
    .select("id, title, data_type, content")
    .limit(300);
  if (workspaceId) baseQuery = baseQuery.eq("workspace_id", workspaceId);
  else baseQuery = baseQuery.eq("user_id", userId);

  const { data: rows } = await baseQuery;
  const items = (rows || []).filter((row: any) => {
    if (row.id === brandId) return true;
    const parsed = safeParseJson(row.content);
    if (logicalBrandId && parsed?.brandId === logicalBrandId) return true;
    return false;
  });

  const findByType = (type: string) => items.find((i: any) => i.data_type === type);
  // Tolerate both legacy short keys ("product", "audience") AND the canonical 9-pillar
  // *_dna / domain keys actually written by the onboarding pipeline.
  const product = safeParseJson(findByType("product_dna")?.content) || safeParseJson(findByType("product")?.content) || {};
  const audience = safeParseJson(findByType("audience_dna")?.content) || safeParseJson(findByType("audience")?.content) || {};
  const brandDna = safeParseJson(findByType("brand_dna")?.content) || {};
  const strategy = safeParseJson(findByType("strategy")?.content) || {};
  const growth = safeParseJson(findByType("growth")?.content) || {};
  const financial = safeParseJson(findByType("financial")?.content) || {};
  const market = safeParseJson(findByType("market")?.content) || {};
  const operations = safeParseJson(findByType("operations")?.content) || {};

  const coreOffer = product?.value_proposition || product?.mechanism || product?.name || product?.title || brandDna?.mission;
  const icp = audience?.primary_segment?.name || audience?.segment || audience?.name || audience?.target;
  const valuePromise = product?.value_proposition || strategy?.vision || brandDna?.vision || strategy?.positioning;
  const channels = compactList([
    growth?.channels?.[0]?.channel,
    growth?.channels?.[1]?.channel,
    growth?.growth_model?.[0]?.channel,
    strategy?.channelFocus,
  ]);
  const voice = compactList([
    brandContent?.voice,
    brandContent?.tone,
    brandContent?.brandVoice,
    brandDna?.voice?.tone,
    brandDna?.voice?.style,
  ]);
  const constraints = compactList([
    strategy?.constraint,
    strategy?.riskLimit,
    financial?.budgetConstraint,
    operations?.constraints,
    ...(Array.isArray(strategy?.bets) ? strategy.bets.slice(0, 1).map((b: any) => b?.thesis) : []),
  ]);
  const kpis = compactList([
    financial?.northStar,
    financial?.primaryKPI,
    growth?.primaryKPI,
    ...(Array.isArray(strategy?.objectives) ? strategy.objectives.slice(0, 2) : []),
    operations?.core_processes?.[0]?.kpi,
  ]);

  const profileContext = `
## Business Operating Profile (Canonical)
- Business: ${brandRow.title || "Unknown"}
- Category: ${brandContent?.category || market?.definition?.primary_category || "Unknown"}
- Mission: ${brandDna?.mission || "Not clearly defined yet"}
- Vision: ${brandDna?.vision || strategy?.vision || "Not clearly defined yet"}
- Core Offer: ${coreOffer || "Not clearly defined yet"}
- ICP / Audience: ${icp || "Not clearly defined yet"}
- Primary Value Promise: ${valuePromise || "Not clearly defined yet"}
- Preferred Channels: ${channels.join(", ") || "Not clearly defined yet"}
- Brand Voice: ${voice.join(", ") || "Not clearly defined yet"}
- Strategic Constraints: ${constraints.join(", ") || "None explicitly recorded"}
- KPI Priorities: ${kpis.join(", ") || "Not explicitly recorded"}

Use this profile as the primary operating truth for decisions. **Important:** if any field above is populated with real content, this business is NOT a blank slate — reason from the profile as real intelligence. Only call out missing data for fields that literally read "Not clearly defined yet" or "Unknown", and never describe the business as undefined when fields are filled.`;

  const learning = await loadLearningSummary(supabase, userId, brandId);
  const themeSummary = await loadThemeWeightsSummary(supabase, brandId);

  const ratingLine = (learning.insightFeedbackHelpful + learning.insightFeedbackNotHelpful) > 0
    ? `- Recent reply ratings (thumbs): ${learning.insightFeedbackHelpful} helpful, ${learning.insightFeedbackNotHelpful} not quite aligned\n`
    : "";
  const reinforcementLine = (learning.reinforcedPositive + learning.reinforcedNegative) > 0
    ? `- Reinforcement trend: ${learning.reinforcedPositive} positive signals, ${learning.reinforcedNegative} negative signals (avg score ${learning.avgOutcomeScore > 0 ? "+" : ""}${learning.avgOutcomeScore.toFixed(3)})\n`
    : "";
  const improvingLine = themeSummary.improving.length > 0
    ? `- Patterns currently improving outcomes: ${themeSummary.improving.join(", ")}\n`
    : "";
  const degradingLine = themeSummary.degrading.length > 0
    ? `- Patterns currently degrading outcomes: ${themeSummary.degrading.join(", ")}\n`
    : "";
  const weightLine = themeSummary.line
    ? `- Aggregated theme emphasis (results-adjusted): ${themeSummary.line}\n`
    : "";

  const learningContext = learning.totalEvents > 0
    ? `
## Learning Signals (Personalized Memory)
- Total recent interactions tracked: ${learning.totalEvents}
- Most frequent recommendation types: ${learning.topRecommendationTypes.length ? learning.topRecommendationTypes.join(", ") : "(none in sample)"}
- Recent dominant themes: ${learning.recentThemes.length ? learning.recentThemes.join(", ") : "(none in sample)"}
${ratingLine}${reinforcementLine}${improvingLine}${degradingLine}${weightLine}
Preference rule: do more of patterns linked to positive outcomes and less of patterns linked to negative outcomes, while respecting explicit user direction and current evidence.`
    : `
## Learning Signals (Personalized Memory)
No historical interaction patterns are available yet. Start collecting outcomes and adapt over time.`;

  return {
    businessId: brandId,
    profileContext,
    learningContext,
  };
}

export async function logBusinessLearningEvent(
  supabase: any,
  params: {
    userId: string;
    workspaceId?: string;
    businessId?: string;
    employeeId?: string;
    agentSurface: "run-employee" | "extension-agent";
    mode: "chat" | "browser";
    userMessage: string;
    assistantResponse: string;
    recommendationType?: string;
    profileContext?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const recommendationType = params.recommendationType || detectRecommendationType(params.userMessage);
    const dnaAlignmentScore = scoreDnaAlignment(params.userMessage, params.profileContext || "");
    const responseExcerpt = (params.assistantResponse || "").slice(0, 1200);

    const metadataBase = { ...(params.metadata || {}) };

    let outcomeScore = inferHeuristicDelta(metadataBase, params.assistantResponse || "");
    let scoreParts: ScoreParts | null = null;
    let integrationTags: string[] = [];

    if (params.businessId) {
      const scored = await buildOutcomeScore(
        supabase,
        params.userId,
        params.businessId,
        params.workspaceId,
        metadataBase,
        params.assistantResponse || "",
      );
      outcomeScore = scored.score;
      scoreParts = scored.parts;
      integrationTags = scored.integrationTags;
    }

    const metadata = {
      ...metadataBase,
      outcome_score: Number(outcomeScore.toFixed(3)),
      outcome_label: outcomeScore > 0.12 ? "positive" : outcomeScore < -0.12 ? "negative" : "neutral",
      score_parts: scoreParts,
      integration_signal_tags: integrationTags,
    };

    await supabase.from("ai_business_learning_events").insert({
      user_id: params.userId,
      workspace_id: params.workspaceId || null,
      business_id: params.businessId || null,
      employee_id: params.employeeId || null,
      agent_surface: params.agentSurface,
      mode: params.mode,
      recommendation_type: recommendationType,
      dna_alignment_score: dnaAlignmentScore,
      user_message: params.userMessage || "",
      assistant_response_excerpt: responseExcerpt,
      metadata,
    });

    if (params.businessId) {
      const { data: stateRow } = await supabase
        .from("business_learning_state")
        .select("source_weights, category_weights, tab_weights, theme_weights")
        .eq("business_id", params.businessId)
        .maybeSingle();

      const sourceWeights = (stateRow?.source_weights as Record<string, number> | null) || {};
      const categoryWeights = (stateRow?.category_weights as Record<string, number> | null) || {};
      const tabWeights = (stateRow?.tab_weights as Record<string, number> | null) || {};
      const themeWeights = (stateRow?.theme_weights as Record<string, number> | null) || {};

      // Smoothing to avoid large oscillations.
      const smooth = clamp(outcomeScore * 0.12, -0.14, 0.14);
      const sourceKey = `surface:${params.agentSurface}`;
      const categoryKey = `mode:${params.mode}`;
      const themeKey = recommendationType || "strategy";

      const nextSource = applyDelta(sourceWeights, sourceKey, smooth * 0.6);
      const nextCategory = applyDelta(categoryWeights, categoryKey, smooth * 0.45);
      const nextTheme = applyDelta(themeWeights, themeKey, smooth);

      await supabase.from("business_learning_state").upsert({
        user_id: params.userId,
        workspace_id: params.workspaceId || null,
        business_id: params.businessId,
        source_weights: nextSource,
        category_weights: nextCategory,
        tab_weights: tabWeights,
        theme_weights: nextTheme,
        updated_at: new Date().toISOString(),
      }, { onConflict: "business_id" });

      edgeLog("business-brain", "reinforcement_applied", {
        user: userIdShort(params.userId),
        businessId: params.businessId,
        themeKey,
        outcomeScore: Number(outcomeScore.toFixed(3)),
        scoreParts,
      });
    }
  } catch (error) {
    console.error("Failed to log ai_business_learning_events:", (error as any)?.message || error);
  }
}
