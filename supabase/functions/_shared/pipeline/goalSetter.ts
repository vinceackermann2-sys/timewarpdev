/**
 * Deterministic goal classification (no LLM) — drives connector query expansion,
 * data tier hints, and progress labeling.
 */

export type GoalType = "data_retrieval" | "analysis" | "action" | "creation" | "planning";
export type GoalDataTier = "internal" | "external" | "user_ai" | "mixed";

export interface AssistantGoal {
  id: string;
  type: GoalType;
  summary: string;
  requiresConclusion: boolean;
  requiresGraphics: boolean;
  suggestedSkills: string[];
  dataTier: GoalDataTier;
}

const DATA_FETCH_RE =
  /\b(last|recent|latest|show|list|pull|fetch|get|what are my|how many|emails?|messages?|threads?|invoices?|payments?|transactions?)\b/i;

export function classifyAssistantGoal(lastUserMessage: string): AssistantGoal {
  const raw = String(lastUserMessage || "").trim();
  const lower = raw.toLowerCase();
  const id = crypto.randomUUID();

  const wantsGraphic =
    /\b(infographic|diagram|chart|slide|deck|visual|mockup|banner|logo design|generate an image)\b/i.test(lower);

  let type: GoalType = "analysis";
  let requiresConclusion = true;
  let dataTier: GoalDataTier = "mixed";

  if (DATA_FETCH_RE.test(raw) && raw.length < 400) {
    type = "data_retrieval";
    requiresConclusion = false;
    dataTier = "internal";
  }

  if (/\b(competitor|market research|reddit|news|what are people saying|external|serp|who else)\b/i.test(lower)) {
    dataTier = dataTier === "internal" ? "mixed" : "external";
    if (type === "data_retrieval") {
      type = "analysis";
      requiresConclusion = true;
    }
  }

  if (/\b(why did|what went wrong|good quarter|bad quarter|compare.*period|kpi|churn.*vs|revenue.*vs)\b/i.test(lower)) {
    dataTier = "user_ai";
  }

  if (/\b(create|write|draft|design|build me|make a)\b/i.test(lower) && !DATA_FETCH_RE.test(raw)) {
    type = "creation";
  }

  if (/\b(plan|roadmap|strategy|prioritize|next steps)\b/i.test(lower)) {
    type = "planning";
  }

  if (/\b(click|navigate|browser|fill form|submit|login to|go to https?:)/i.test(lower)) {
    type = "action";
    requiresConclusion = true;
    dataTier = "mixed";
  }

  const summary = raw.length > 160 ? `${raw.slice(0, 157)}…` : raw || "Assistant request";

  const skills: string[] = [];
  if (wantsGraphic || /\b(brand|visual|palette|typography)\b/i.test(lower)) skills.push("graphics");
  if (dataTier === "external" || /\b(competitor|market|research)\b/i.test(lower)) skills.push("external-research");
  if (type === "planning" || type === "analysis") skills.push("strategic-planning");

  return {
    id,
    type,
    summary,
    requiresConclusion,
    requiresGraphics: wantsGraphic,
    suggestedSkills: [...new Set(skills)].slice(0, 5),
    dataTier,
  };
}

/** Extra connector search terms so vague queries still hit revenue/support data. */
export function expandQueryForConnectors(goal: AssistantGoal, topic: string): string {
  const t = String(topic || "").toLowerCase().trim();
  const boostByType: Record<GoalType, string[]> = {
    data_retrieval: ["email", "message", "thread", "document", "file", "calendar", "event"],
    analysis: ["revenue", "customer", "pipeline", "deal", "conversion", "growth", "metric"],
    action: ["task", "workflow", "form", "page", "url"],
    creation: ["template", "example", "reference", "audience"],
    planning: ["objective", "kpi", "roadmap", "priority", "milestone", "budget"],
  };

  const growthPhrases =
    /\b(grow|growth|scale|business|more sales|more customers|get customers)\b/i.test(t + " " + goal.summary);
  const growthBoost = growthPhrases
    ? ["revenue", "sales", "customers", "MRR", "ARR", "leads", "churn", "conversion", "pipeline", "stripe", "hubspot"]
    : [];

  const merged = [...boostByType[goal.type], ...growthBoost, ...t.split(/\s+/).filter((w) => w.length > 2)].slice(0, 12);
  return Array.from(new Set(merged)).join(" ");
}
