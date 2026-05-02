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
  /**
   * Full conversation history (oldest → newest). When the prior assistant
   * turn ended with one or more [SUGGEST:...] tags, the gate treats the
   * current user message as an ANSWER to that question and tells the AI to
   * continue executing the original request rather than re-asking.
   */
  history?: Array<{ role: string; content: string }>;
}

export interface QuestionGateResult {
  intent: IntentCategory;
  complete: boolean;
  missingSlots: string[];
  mandatoryQuestions: string[];
  canPartialAnswer: boolean;
  /**
   * True when the prior assistant message ended with [SUGGEST:...] —
   * i.e. the user's current message is filling a missing slot from a
   * pending question, not opening a new request.
   */
  isAnswerToPriorQuestion: boolean;
  /**
   * The user's most recent ORIGINAL request (the last user message before
   * the question/answer back-and-forth started).  Used to remind the AI
   * what task it's still trying to complete.
   */
  originalRequest: string | null;
  /** The text of the prior assistant question(s), for context. */
  priorQuestionText: string | null;
}

const CATEGORY_RULES: Array<{
  intent: IntentCategory;
  re: RegExp;
  requiredSlots: string[];
  questionBySlot: Record<string, string>;
}> = [
  // Open-ended growth — never force slot-filling; deliver from DNA + stated assumptions.
  {
    intent: "general",
    re: /\b(grow my business|help me grow|grow our business|scale my business|how (do|can) i grow|business growth|grow (this|the) (business|company))\b/i,
    requiredSlots: [],
    questionBySlot: {},
  },
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

/**
 * Detect if the prior assistant turn ended with a clarifying question (i.e.
 * contains a [SUGGEST:...] tag). When true, the current user message is
 * almost certainly an ANSWER to that question — the AI must use it to fill
 * the missing slot and continue the ORIGINAL request, not treat it as a
 * fresh prompt.
 */
export function detectAnswerToPriorQuestion(
  history: Array<{ role: string; content: string }>,
): { isAnswer: boolean; priorQuestionText: string | null; originalRequest: string | null } {
  if (!history || history.length < 2) {
    return { isAnswer: false, priorQuestionText: null, originalRequest: null };
  }
  // Walk back from the end, skipping the current user message.  The first
  // role we hit walking backwards from index length-2 is what came before
  // the current user message.
  let lastAssistantIdx = -1;
  for (let i = history.length - 2; i >= 0; i--) {
    if (history[i].role === "assistant") {
      lastAssistantIdx = i;
      break;
    }
  }
  if (lastAssistantIdx === -1) {
    return { isAnswer: false, priorQuestionText: null, originalRequest: null };
  }
  const priorAssistant = history[lastAssistantIdx]?.content || "";
  const hasSuggestTag = /\[SUGGEST:/i.test(priorAssistant);
  if (!hasSuggestTag) {
    return { isAnswer: false, priorQuestionText: null, originalRequest: null };
  }

  // Walk further back to find the user's ORIGINAL request — the user
  // message that triggered this question loop.  We accept the earliest
  // user message in the most recent contiguous question/answer chain
  // (i.e. keep walking back through prior assistant questions + user
  // answers until we hit a user message preceded by an assistant message
  // that did NOT end with [SUGGEST:...]).
  let originalRequest: string | null = null;
  let i = lastAssistantIdx - 1;
  while (i >= 0) {
    const turn = history[i];
    if (turn.role === "user") {
      originalRequest = turn.content;
      const before = history[i - 1];
      if (!before || before.role !== "assistant") break;
      // Was that earlier assistant turn ALSO a question? If yes, keep
      // walking back to find the true original request.
      if (!/\[SUGGEST:/i.test(before.content || "")) break;
      i -= 2;
    } else {
      i -= 1;
    }
  }

  // Truncate the prior question text — only the [SUGGEST:title::...] body
  // matters for the AI's awareness, but we send the whole reply for now.
  const priorQuestionText = priorAssistant.length > 1200
    ? priorAssistant.slice(0, 1200) + "…"
    : priorAssistant;

  return { isAnswer: true, priorQuestionText, originalRequest };
}

export function runQuestionGate(input: QuestionGateInput): QuestionGateResult {
  const message = String(input.message || "");
  const profileContext = String(input.profileContext || "");
  const history = input.history || [];
  const intent = inferIntent(message);

  const priorState = detectAnswerToPriorQuestion(history);

  if (intent === "general") {
    return {
      intent,
      complete: true,
      missingSlots: [],
      mandatoryQuestions: [],
      canPartialAnswer: true,
      isAnswerToPriorQuestion: priorState.isAnswer,
      originalRequest: priorState.originalRequest,
      priorQuestionText: priorState.priorQuestionText,
    };
  }

  const rule = CATEGORY_RULES.find((r) => r.intent === intent)!;

  // When this is a reply to a prior question, check ALL prior user answers
  // PLUS the current message PLUS DNA context for slot signals — the user
  // may have already answered some slots in earlier turns of this loop.
  const accumulatedUserText = history
    .filter((h) => h.role === "user")
    .map((h) => h.content)
    .join(" ");
  const sourceMessage = `${message} ${accumulatedUserText}`;

  const missingSlots = rule.requiredSlots.filter(
    (slot) => !hasSignal(slot, sourceMessage, profileContext),
  );
  const mandatoryQuestions = missingSlots
    .map((slot) => rule.questionBySlot[slot])
    .filter(Boolean);

  return {
    intent,
    complete: missingSlots.length === 0,
    missingSlots,
    mandatoryQuestions,
    canPartialAnswer: missingSlots.length <= 2,
    isAnswerToPriorQuestion: priorState.isAnswer,
    originalRequest: priorState.originalRequest,
    priorQuestionText: priorState.priorQuestionText,
  };
}

export function formatQuestionGatePromptBlock(result: QuestionGateResult): string {
  // ── CASE A: user is REPLYING to a prior clarifying question ─────────────
  // Whether or not we still have missing slots, the AI must NOT lose track
  // of the original request.  We output a context block reminding it.
  if (result.isAnswerToPriorQuestion) {
    const lines: string[] = [
      "## Pre-Flight: Continuing a Pending Request",
      "",
      "The user's CURRENT message is an ANSWER to a clarifying question you asked them in the prior turn — it is NOT a new request.",
      "",
    ];
    if (result.originalRequest) {
      lines.push(
        `Original request (still active — finish this): ${result.originalRequest.trim().slice(0, 600)}`,
        "",
      );
    }
    if (result.priorQuestionText) {
      lines.push(
        "Prior question you asked (the user is now answering it):",
        result.priorQuestionText.trim().slice(0, 600),
        "",
      );
    }
    lines.push(
      "Rules — apply ALL of them:",
      "  1. Start with **one explicit sentence** that states how you are using the user's latest answer (quote or paraphrase it), then continue — do not skip acknowledging what they chose or typed.",
      "  2. DO NOT restart, re-introduce yourself, or treat this as a brand-new topic; stay on the original request until it is finished or you must ask a remaining clarifier.",
      "  3. Immediately apply their answer to fill missing context, then **execute** the original request (main deliverable) in the same reply when possible.",
      "  4. If you still need more info to finish (≤2 slots), ask ONLY the remaining missing question(s) with `[SUGGEST:Question?::A|B|C]` — after you have applied their latest answer in this reply. Put those tags **after** any partial deliverable you can show; if a remaining question blocks all further work, put that `[SUGGEST:…]` **before** long output.",
      "  5. If everything you need is already there, deliver the **full** output for the original request — no more questions.",
      "  6. If the original request was a plan / roadmap / growth strategy, complete it in one coherent deliverable (including [PLAN_ARTIFACT]…[/PLAN_ARTIFACT] when the system prompt requires it) — do not pivot to unrelated topics.",
      "  7. **Clarification cap:** If the user has already answered **two** of your `[SUGGEST:…]` questions in this same thread (alternating user/assistant), you **must** deliver the full plan or recommendation **now** with clearly labeled assumptions — **no third round** of `[SUGGEST:…]` unless they changed the goal entirely.",
    );
    if (!result.complete && result.mandatoryQuestions.length > 0) {
      lines.push(
        "",
        `Slots still missing: ${result.missingSlots.join(", ")}`,
        `Remaining clarifying question(s) you may still ask (only if truly needed):`,
        ...result.mandatoryQuestions.slice(0, 3).map((q, i) => `  ${i + 1}. ${q}`),
      );
    }
    return lines.join("\n");
  }

  // ── CASE B: this is a NEW request needing clarification ─────────────────
  if (
    result.complete ||
    result.intent === "general" ||
    result.mandatoryQuestions.length === 0
  ) {
    return "";
  }

  // Allow up to 3 questions in a single turn when canPartialAnswer is true.
  // The UI now renders one card per [SUGGEST:...] block, so multiple
  // questions become multiple stacked slides — no UX downgrade.
  // Strategy / plan intents often need several slots; asking one per turn
  // feels like the assistant keeps "switching topics" instead of finishing.
  const askCount =
    result.intent === "strategy_plan"
      ? Math.min(3, result.mandatoryQuestions.length)
      : result.canPartialAnswer
        ? Math.min(3, result.mandatoryQuestions.length)
        : 1;
  const questionsToAsk = result.mandatoryQuestions.slice(0, askCount);

  const lines: string[] = [
    "## Pre-Flight: Ask These First",
    `Intent category: ${result.intent}`,
    `Missing slots: ${result.missingSlots.join(", ")}`,
    `Partial answer allowed: ${result.canPartialAnswer ? "yes" : "no"}`,
    "",
    askCount === 1
      ? "Ask exactly ONE blocking clarifying **question** in this reply (decision-critical unknowns only — not a generic “what next” menu):"
      : `Ask ${askCount} blocking clarifying **questions** in this reply (one decision per tag — keep them tight):`,
    ...questionsToAsk.map((q, i) => `  ${i + 1}. ${q}`),
    "",
    "Put the required `[SUGGEST:Question?::A|B|C]` line(s) **before** any substantive answer body: after at most one short sentence (≤20 words), and **before** tables, long bullet lists, `[PLAN_ARTIFACT]`, or fenced deliverable blocks. Do not output a long recommendation first and only then ask what the user wanted.",
    askCount === 1
      ? "Use exactly one `[SUGGEST:Question?::A|B|C]` tag (2–4 chips)."
      : `Use ${askCount} separate \`[SUGGEST:…]\` tags — one per question, in order; each with 2–4 chips.`,
  ];
  return lines.join("\n");
}

/**
 * Convenience helper for callers that want to inject the answer-context
 * block independently of the question-gate result (e.g. when the gate
 * itself didn't trigger but the prior turn still had a SUGGEST).
 */
export function buildAnswerContextBlock(
  history: Array<{ role: string; content: string }>,
): string {
  const state = detectAnswerToPriorQuestion(history);
  if (!state.isAnswer) return "";
  const lines: string[] = [
    "## Pre-Flight: Continuing a Pending Request",
    "",
    "The user's CURRENT message is an ANSWER to a clarifying question you asked in the prior turn — it is NOT a new request.",
  ];
  if (state.originalRequest) {
    lines.push(
      "",
      `Original request (still active — finish this): ${state.originalRequest.trim().slice(0, 600)}`,
    );
  }
  lines.push(
    "",
    "Acknowledge the user's answer in one sentence, use it to fill missing context, then EXECUTE the original request in this same turn. Do NOT re-introduce or restart as a new topic.",
  );
  return lines.join("\n");
}
