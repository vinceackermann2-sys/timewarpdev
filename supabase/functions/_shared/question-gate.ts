type IntentCategory =
  | "campaign_ad_creation"
  | "content_creation"
  | "strategy_plan"
  | "product_decision"
  | "financial_analysis"
  | "general";

export interface QuestionGateInput {
  message: string;
  profileContext?: string;
}

export interface QuestionGateResult {
  intent: IntentCategory;
  complete: boolean;
  missingSlots: string[];
  mandatoryQuestions: string[];
  canPartialAnswer: boolean;
}

const CATEGORY_RULES: Array<{
  intent: IntentCategory;
  re: RegExp;
  requiredSlots: string[];
  questionBySlot: Record<string, string>;
}> = [
  {
    intent: "campaign_ad_creation",
    re: /\b(campaign|ads?|creative|copy|launch|funnel|performance marketing)\b/i,
    requiredSlots: ["audience", "channel", "budget", "goal", "timeframe"],
    questionBySlot: {
      audience: "Which audience should this target?",
      channel: "Which channel should we prioritize first?",
      budget: "What budget range should we optimize for?",
      goal: "What is the primary goal (reach, leads, sales, retention)?",
      timeframe: "What timeline should this run on?",
    },
  },
  {
    intent: "content_creation",
    re: /\b(content|post|newsletter|email|script|article|blog|caption)\b/i,
    requiredSlots: ["audience", "format", "topic", "tone"],
    questionBySlot: {
      audience: "Who is this content for?",
      format: "What format do you want (post, email, script, article)?",
      topic: "What specific topic should it focus on?",
      tone: "What tone should it use?",
    },
  },
  {
    intent: "strategy_plan",
    re: /\b(strategy|plan|roadmap|priorities|go[- ]to[- ]market|gtm)\b/i,
    requiredSlots: ["goal", "timeframe", "constraints", "kpi"],
    questionBySlot: {
      goal: "What outcome matters most for this plan?",
      timeframe: "What timeline should this plan cover?",
      constraints: "What constraints are non-negotiable?",
      kpi: "What KPI should define success?",
    },
  },
  {
    intent: "product_decision",
    re: /\b(product|feature|pricing|packaging|tier|offer)\b/i,
    requiredSlots: ["product_ref", "goal", "tradeoffs"],
    questionBySlot: {
      product_ref: "Which product or feature should this decision focus on?",
      goal: "What are you optimizing for (adoption, margin, retention, etc.)?",
      tradeoffs: "What tradeoffs are acceptable vs unacceptable?",
    },
  },
  {
    intent: "financial_analysis",
    re: /\b(revenue|profit|margin|cac|ltv|runway|forecast|financial|cash flow)\b/i,
    requiredSlots: ["metric", "timeframe", "comparison_base"],
    questionBySlot: {
      metric: "Which metric should we analyze first?",
      timeframe: "Over what period should we analyze it?",
      comparison_base: "What baseline should we compare against?",
    },
  },
];

function inferIntent(message: string): IntentCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(message)) return rule.intent;
  }
  return "general";
}

function hasSignal(slot: string, message: string, profileContext: string): boolean {
  const source = `${message} ${profileContext}`.toLowerCase();
  switch (slot) {
    case "audience":
      return /\b(audience|persona|customer|icp|segment)\b/.test(source);
    case "channel":
      return /\b(channel|meta|facebook|google ads|linkedin|email|tiktok|youtube)\b/.test(source);
    case "budget":
      return /\b(budget|\$|usd|eur|spend|cost)\b/.test(source);
    case "goal":
      return /\b(goal|objective|target|outcome|win)\b/.test(source);
    case "timeframe":
      return /\b(day|week|month|quarter|q[1-4]|timeline|deadline)\b/.test(source);
    case "format":
      return /\b(format|post|email|script|slide|deck|article)\b/.test(source);
    case "topic":
      return /\b(topic|about|focus)\b/.test(source);
    case "tone":
      return /\b(tone|voice|formal|casual|direct)\b/.test(source);
    case "product_ref":
      return /\b(product|feature|offer|tier|sku|pricing)\b/.test(source);
    case "tradeoffs":
      return /\b(trade[- ]?off|balance|sacrifice|constraint)\b/.test(source);
    case "metric":
      return /\b(metric|kpi|revenue|profit|margin|cac|ltv|churn)\b/.test(source);
    case "comparison_base":
      return /\b(vs|versus|compared|baseline|last|prior|benchmark)\b/.test(source);
    case "constraints":
      return /\b(constraint|limit|must|cannot|can['’]?t|non-negotiable)\b/.test(source);
    case "kpi":
      return /\b(kpi|metric|target|success)\b/.test(source);
    default:
      return true;
  }
}

export function runQuestionGate(input: QuestionGateInput): QuestionGateResult {
  const message = String(input.message || "");
  const profileContext = String(input.profileContext || "");
  const intent = inferIntent(message);
  if (intent === "general") {
    return { intent, complete: true, missingSlots: [], mandatoryQuestions: [], canPartialAnswer: true };
  }

  const rule = CATEGORY_RULES.find((r) => r.intent === intent)!;
  const missingSlots = rule.requiredSlots.filter((slot) => !hasSignal(slot, message, profileContext));
  const mandatoryQuestions = missingSlots.map((slot) => rule.questionBySlot[slot]).filter(Boolean);

  return {
    intent,
    complete: missingSlots.length === 0,
    missingSlots,
    mandatoryQuestions,
    canPartialAnswer: missingSlots.length <= 2,
  };
}

export function formatQuestionGatePromptBlock(result: QuestionGateResult): string {
  if (result.complete || result.intent === "general" || result.mandatoryQuestions.length === 0) return "";
  const firstQuestion = result.mandatoryQuestions[0];
  return `
## Pre-Flight: Ask These First
Intent category: ${result.intent}
Missing slots: ${result.missingSlots.join(", ")}
Partial answer allowed: ${result.canPartialAnswer ? "yes" : "no"}

Ask exactly ONE blocking clarifying question first in this reply:
1. ${firstQuestion}

End the reply with exactly one [SUGGEST:...] tag for that same question.
`.trim();
}
