import { shouldSearchConnections } from "./connection-search-decision.ts";
import { detectAnswerToPriorQuestion } from "./question-gate.ts";

/** How the assistant should structure and ground its reply (ACIM-style routing). */
export type AssistantReplyContract = "live_lookup" | "direct" | "strategic_plan";

const FORCE_PLAN_RE =
  /\b(plan mode|advanced plan|first principles plan|deep plan|detailed strategy plan|make me a plan|make a plan|help me plan|create a strategy for|break this down|growth plan|marketing plan|business plan|strategic plan)\b/i;
const FORCE_DIRECT_RE = /\b(no plan|skip plan|quick answer|just answer)\b/i;
const SIMPLE_QUERY_RE = /^\s*(what|who|when|where|which|is|are|do|does|can)\b[\s\S]{0,180}\??\s*$/i;
const STRATEGY_KEYWORDS_RE = /\b(grow|growth|scale|scaling|turnaround|gtm|go.?to.?market|roadmap|strategy|strategic|pricing strategy|market entry|expansion|retention|churn|funnel|acquisition|positioning|operating model|business model|profitability)\b/i;
const COMPLEXITY_RE = /\b(90 day|60 day|30 day|quarter|quarters|12 month|timeline|milestone|trade[- ]?off|constraints?|budget|prioritize|prioritise|break down|step by step|execution plan|kpi|okr|leading indicator)\b/i;
const MULTI_OBJECTIVE_RE = /\b(and|plus|while|across)\b/i;

/**
 * Classify reply contract from the user's latest text.
 * - `live_lookup` — same intent as connector search (see connection-search-decision triggers).
 * - `direct` — default: answer in natural form, no fixed CEO section template.
 * - `strategic_plan` — advanced first-principles planning for complex strategic asks.
 */
export function classifyAssistantReplyContract(userQuery: string): AssistantReplyContract {
  if (FORCE_DIRECT_RE.test(userQuery)) return "direct";
  if (FORCE_PLAN_RE.test(userQuery)) return "strategic_plan";

  const hasStrategyIntent = STRATEGY_KEYWORDS_RE.test(userQuery);
  const hasComplexity = COMPLEXITY_RE.test(userQuery);
  const longQuery = userQuery.trim().length >= 100;
  const hasMultipleGoals = userQuery.trim().length >= 90 && MULTI_OBJECTIVE_RE.test(userQuery);
  const planOrRoadmap = /\b(plan|roadmap|plans)\b/i.test(userQuery);
  const explicitBuildPlan =
    /\b(make|build|create|draft|write|develop)\s+(?:a\s+)?(?:growth\s+|marketing\s+|business\s+|strategic\s+)?plan\b/i.test(userQuery);

  // Strategic / planning beats broad live-lookup triggers (e.g. the word
  // "revenue" alone matches CRM patterns — but "grow revenue … 90-day plan"
  // is still a strategy ask).
  if (hasStrategyIntent && (hasComplexity || longQuery || hasMultipleGoals || planOrRoadmap || explicitBuildPlan)) {
    return "strategic_plan";
  }

  const { shouldSearch } = shouldSearchConnections(userQuery);
  if (shouldSearch) return "live_lookup";

  if (SIMPLE_QUERY_RE.test(userQuery) && !STRATEGY_KEYWORDS_RE.test(userQuery)) {
    return "direct";
  }

  return "direct";
}

/**
 * Same as {@link classifyAssistantReplyContract}, but when the user is
 * answering a prior [SUGGEST:...] chip, classify from the **original**
 * request so the reply shape (e.g. strategic_plan + PLAN_ARTIFACT) stays
 * stable instead of flipping to `direct` on short follow-ups like "Q4" or
 * "B2B SaaS".
 */
export function resolveAssistantReplyContract(
  lastUserMessage: string,
  history?: Array<{ role: string; content: string }>,
): AssistantReplyContract {
  if (history && history.length >= 2) {
    const prior = detectAnswerToPriorQuestion(history);
    if (prior.isAnswer && prior.originalRequest?.trim()) {
      return classifyAssistantReplyContract(prior.originalRequest.trim());
    }
  }
  return classifyAssistantReplyContract(lastUserMessage);
}
