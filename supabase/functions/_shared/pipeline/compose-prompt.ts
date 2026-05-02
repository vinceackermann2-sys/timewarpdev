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
    return `## Response shape (advanced strategic plan)
Produce a first-principles, evidence-backed strategy plan for heavy business questions.
- Include explicit data-source labels (Business DNA, integrations/live connectors, dashboard/objective outcomes, external/public evidence, user input).
- Do not fabricate metrics; mark uncertainty if evidence is missing.
- Include 30/60/90 execution, KPI tree, risks, and validation tests.
- Wrap the full plan markdown in:
[PLAN_ARTIFACT]
...plan...
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
