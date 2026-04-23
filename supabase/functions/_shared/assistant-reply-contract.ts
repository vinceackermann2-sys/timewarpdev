import { shouldSearchConnections } from "./connection-search-decision.ts";

/** How the assistant should structure and ground its reply (ACIM-style routing). */
export type AssistantReplyContract = "live_lookup" | "direct" | "strategic_plan";

const FORCE_PLAN_RE = /\b(plan mode|advanced plan|first principles plan|deep plan|detailed strategy plan)\b/i;
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

  const { shouldSearch } = shouldSearchConnections(userQuery);
  if (shouldSearch) return "live_lookup";

  if (SIMPLE_QUERY_RE.test(userQuery) && !STRATEGY_KEYWORDS_RE.test(userQuery)) {
    return "direct";
  }

  const hasStrategyIntent = STRATEGY_KEYWORDS_RE.test(userQuery);
  const hasComplexity = COMPLEXITY_RE.test(userQuery);
  const longQuery = userQuery.trim().length >= 180;
  const hasMultipleGoals = userQuery.trim().length >= 90 && MULTI_OBJECTIVE_RE.test(userQuery);

  if (hasStrategyIntent && (hasComplexity || longQuery || hasMultipleGoals)) {
    return "strategic_plan";
  }

  return "direct";
}
