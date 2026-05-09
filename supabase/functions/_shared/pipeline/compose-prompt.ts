import type { AssistantReplyContract } from "../assistant-reply-contract.ts";
import { buildAssistantGroundingBlock } from "../assistant-grounding.ts";
import { PIPELINE_IDENTITY_BLOCK } from "./blocks/identity.ts";
import { PIPELINE_EVIDENCE_CONTRACT_BLOCK } from "./blocks/evidence-contract.ts";
import { PIPELINE_FORMATTING_BLOCK } from "./blocks/formatting.ts";

function buildReplyShapeBlock(replyContract: AssistantReplyContract): string {
  if (replyContract === "live_lookup") {
    return `## Response shape (live data first)
Lead with what you found (or did not find) in live connector results. Then add only the context needed from Business DNA or profile. Do not bury the answer.`;
  }
  if (replyContract === "strategic_plan") {
    return `## Response shape (advanced strategic plan — LONG FORM, MAXIMUM DETAIL)
Produce a comprehensive, first-principles, evidence-backed strategy document. This is a deep, multi-page strategic plan — NOT a summary. Aim for 1500–3000+ words of dense, actionable content.

**Required sections (use ## headings, in this order):**
1. **Executive Summary** — 3–5 sentences capturing the thesis, key bets, and expected outcome.
2. **Situation Analysis** — Where the business stands today. Cite Business DNA, dashboard metrics, connector data, and external evidence with explicit source labels.
3. **First-Principles Diagnosis** — Break the problem down to fundamental drivers. Challenge assumptions. Show the reasoning chain.
4. **Strategic Options Considered** — At least 3 distinct paths with trade-offs (cost, time, risk, upside). Explain why you rejected the alternatives.
5. **Recommended Strategy** — The chosen path with detailed rationale and the underlying bet.
6. **30/60/90 Execution Plan** — Concrete weekly/monthly milestones. Each milestone: owner, deliverable, success criterion, dependency.
7. **KPI Tree** — North-star metric → input metrics → leading indicators. Show the formula/relationship.
8. **Resource & Budget** — People, tools, spend, time. Be specific.
9. **Risks & Mitigations** — At least 5 risks ranked by severity × likelihood, each with a mitigation.
10. **Validation Tests** — Cheap experiments to falsify the strategy in the first 30 days.
11. **Evidence Base** — Bullet list of every source used (Business DNA pillar, dashboard widget, connector query, web source, user input).
12. **Confidence & Data Gaps** — Overall confidence (High/Medium/Low) with reasoning, plus what data would raise confidence.

**Rules:**
- Tag every claim with its source: (Business DNA), (Dashboard), (Connector: Gmail/HubSpot/etc.), (Web), (User input), or (Inference).
- Never fabricate metrics. If a number is unknown, say so and mark as a data gap.
- Use tables for comparisons, KPI trees, and the 30/60/90 plan when they aid scanability.
- Do not be terse. This mode exists because the user wants depth.

**Wrap the entire document in:**
[PLAN_ARTIFACT]
...full plan markdown...
[/PLAN_ARTIFACT]`;
  }
  return `## Response shape (default)
Answer in the most natural structure for the question — prose, bullets, or a small table when comparisons need it. No mandatory section template.`;
}

/**
 * Assembles the system prompt in priority order (see product spec).
 */
export function composeAssistantSystemPrompt(input: {
  identityLine: string;
  businessContextBlock: string;
  persistedMemoryBlock: string;
  skillPlaybookBlock: string;
  liveDataAndConnectorsBlock: string;
  dashboardBlock: string;
  webBlock: string;
  intentRoutingBlock: string;
  dataBackedRoutingBlock: string;
  toolDefinitionsBlock: string;
  replyContract: AssistantReplyContract;
}): string {
  const grounding = buildAssistantGroundingBlock(input.replyContract);
  const business = [
    input.identityLine.trim() ? `# Business Context\n${input.identityLine}\n\n**IMPORTANT: You are currently representing ONLY this business.**` : "",
    input.businessContextBlock.trim(),
  ].filter(Boolean).join("\n\n");

  const parts = [
    PIPELINE_IDENTITY_BLOCK,
    business,
    input.persistedMemoryBlock.trim(),
    input.skillPlaybookBlock.trim(),
    PIPELINE_EVIDENCE_CONTRACT_BLOCK,
    grounding,
    input.liveDataAndConnectorsBlock.trim(),
    input.dashboardBlock.trim(),
    input.webBlock.trim(),
    input.intentRoutingBlock.trim(),
    input.dataBackedRoutingBlock.trim(),
    buildReplyShapeBlock(input.replyContract),
    PIPELINE_FORMATTING_BLOCK,
    input.toolDefinitionsBlock.trim(),
  ];
  return parts.filter((p) => p && String(p).trim().length > 0).join("\n\n");
}
