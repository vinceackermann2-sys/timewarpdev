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
  if (/\b(mrr|arr|revenue|profit|margin|cac|ltv)\b/.test(q)) return "financial";
  if (/\b(audience|persona|customer|icp)\b/.test(q)) return "audience";
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

const USER_INSIGHT_FEEDBACK = "user_insight_feedback";

async function loadLearningSummary(supabase: any, userId: string, businessId?: string): Promise<LearningSummary> {
  let query = supabase
    .from("ai_business_learning_events")
    .select("recommendation_type, user_message, metadata")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(80);

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
    };
  }

  const counts = new Map<string, number>();
  const themes = new Map<string, number>();
  let insightFeedbackHelpful = 0;
  let insightFeedbackNotHelpful = 0;

  for (const row of rows) {
    const recType = String(row.recommendation_type || "").trim();
    if (recType === USER_INSIGHT_FEEDBACK) {
      const meta = safeParseJson(row.metadata) || {};
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
  };
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

async function loadThemeWeightsSummary(supabase: any, businessId: string): Promise<string> {
  const { data: stateRow } = await supabase
    .from("business_learning_state")
    .select("theme_weights")
    .eq("business_id", businessId)
    .maybeSingle();
  const themeWeights = (stateRow?.theme_weights as Record<string, number> | null) || {};
  return formatThemeWeightsLine(themeWeights);
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
  const product = safeParseJson(findByType("product")?.content) || {};
  const audience = safeParseJson(findByType("audience")?.content) || {};
  const strategy = safeParseJson(findByType("strategy")?.content) || {};
  const growth = safeParseJson(findByType("growth")?.content) || {};
  const financial = safeParseJson(findByType("financial")?.content) || {};

  const profileContext = `
## Business Operating Profile (Canonical)
- Business: ${brandRow.title || "Unknown"}
- Category: ${brandContent?.category || "Unknown"}
- Core Offer: ${product?.name || product?.title || "Not clearly defined yet"}
- ICP / Audience: ${audience?.name || audience?.segment || audience?.target || "Not clearly defined yet"}
- Primary Value Promise: ${product?.valueProposition || strategy?.positioning || "Not clearly defined yet"}
- Preferred Channels: ${(compactList([growth?.primaryChannel, growth?.secondaryChannel, strategy?.channelFocus]).join(", ") || "Not clearly defined yet")}
- Brand Voice: ${(compactList([brandContent?.voice, brandContent?.tone, brandContent?.brandVoice]).join(", ") || "Not clearly defined yet")}
- Strategic Constraints: ${(compactList([strategy?.constraint, strategy?.riskLimit, financial?.budgetConstraint]).join(", ") || "None explicitly recorded")}
- KPI Priorities: ${(compactList([financial?.northStar, financial?.primaryKPI, growth?.primaryKPI]).join(", ") || "Not explicitly recorded")}

Use this profile as the primary operating truth for decisions.`;

  const learning = await loadLearningSummary(supabase, userId, brandId);
  const themeWeightLine = await loadThemeWeightsSummary(supabase, brandId);
  const ratingLine = (learning.insightFeedbackHelpful + learning.insightFeedbackNotHelpful) > 0
    ? `- Recent reply ratings (thumbs): ${learning.insightFeedbackHelpful} helpful, ${learning.insightFeedbackNotHelpful} not quite aligned\n`
    : "";
  const weightLine = themeWeightLine
    ? `- Aggregated theme emphasis (from dashboard + chat feedback): ${themeWeightLine}\n`
    : "";

  const learningContext = learning.totalEvents > 0
    ? `
## Learning Signals (Personalized Memory)
- Total recent interactions tracked: ${learning.totalEvents}
- Most frequent recommendation types: ${learning.topRecommendationTypes.length ? learning.topRecommendationTypes.join(", ") : "(none in sample)"}
- Recent dominant themes: ${learning.recentThemes.length ? learning.recentThemes.join(", ") : "(none in sample)"}
${ratingLine}${weightLine}
Preference rule: prioritize recommendation styles that match successful recent themes unless the user explicitly changes direction. When theme weights are negative, tread carefully on that topic unless new evidence supports it.`
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
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error("Failed to log ai_business_learning_events:", (error as any)?.message || error);
  }
}
