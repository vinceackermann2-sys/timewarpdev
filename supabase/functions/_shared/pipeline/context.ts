import { formatSessionMemoryBlock } from "../session-memory-context.ts";
import { buildBusinessBrainContext } from "../run-employee/business-brain.ts";
import { buildDataBackedRoutingBlock } from "../data-backed-evidence.ts";
import { loadPersistedMemoryMarkdown } from "./memory.ts";
import { retrieveRelevantContextForAssistant, loadAssistantBrandIdentity } from "./rag-assistant.ts";
import {
  extractQueryTopic,
  searchConnectedProviders,
  shouldSearchConnections,
} from "./live-data.ts";
import { runQuestionGate, formatQuestionGatePromptBlock, resolveAssistantReplyContract } from "./intent.ts";
import { runDnaContextRouter, formatDnaRouterBlock } from "./dna.ts";
import { buildPerformanceEvidenceMarkdown } from "./evidence.ts";
import {
  extractWebSearchQuery,
  fetchPublicWebSnapshot,
  shouldFetchPublicWebContext,
} from "./web.ts";
import { resolveDashboardCardsForChat } from "./dashboard.ts";
import { buildSkillsBlock, matchSkillsForMessage, matchSkillSticky } from "./skills.ts";
import { composeAssistantSystemPrompt } from "./compose-prompt.ts";
import { buildAssistantChatTools } from "./tools.ts";

/** Alias for orchestration docs / future expansion. */
export type PipelineContext = AssembleAssistantContextParams;

export type SendStepFn = (
  label: string,
  status: "running" | "done" | "error",
  action?: string,
  detail?: string,
) => void;

export interface AssembleAssistantContextParams {
  supabase: any;
  userId: string;
  brandId?: string | null;
  workspaceId?: string | null;
  lastUserMsg: string;
  messages: any[];
  taskType: string;
  sessionMemory?: string | null;
  replyContract: ReturnType<typeof resolveAssistantReplyContract>;
  send: (payload: unknown) => void;
  sendStep: SendStepFn;
}

export interface AssembledAssistantPrompt {
  systemPrompt: string;
  offerTools: boolean;
  tools: ReturnType<typeof buildAssistantChatTools>;
  sourceRegistry: Record<string, unknown>;
  connectionContext: string;
  connectionDecision: unknown;
  searchedProviders: unknown;
  skippedProviderDetails: unknown;
  queryTopic: string;
}

/** Loads connectors, DNA, memory, skills, dashboard, web — then composes the final system prompt. */
export async function buildAssistantPipelinePrompt(
  p: AssembleAssistantContextParams,
): Promise<AssembledAssistantPrompt> {
  const { supabase, userId, brandId, workspaceId, lastUserMsg, messages, taskType, sessionMemory, replyContract, send, sendStep } = p;

  const historyForGate = Array.isArray(messages)
    ? (messages as Array<{ role: string; content: string }>).map((m) => ({
      role: String(m.role),
      content: String(m.content || ""),
    }))
    : [];

  const { businessId, profileContext, learningContext } = await buildBusinessBrainContext(supabase, {
    userId,
    brandId: brandId || undefined,
    workspaceId: workspaceId || undefined,
  });

  const identityLine = await loadAssistantBrandIdentity(supabase, userId, brandId || undefined);
  const businessContextBlock = [profileContext, learningContext].filter(Boolean).join("\n\n");

  const memoryBlock = formatSessionMemoryBlock(sessionMemory);
  const persisted = await loadPersistedMemoryMarkdown(supabase, userId, workspaceId || undefined);
  const persistedMemoryBlock = [memoryBlock, persisted && `## Persisted workspace memory\n${persisted}`].filter(Boolean).join("\n\n");

  const questionGate = runQuestionGate({
    message: lastUserMsg,
    profileContext,
    history: historyForGate,
  });
  const intentRoutingBlock = formatQuestionGatePromptBlock(questionGate);

  const dnaRoute = await runDnaContextRouter(supabase, userId, workspaceId, brandId || undefined, lastUserMsg, replyContract);
  const dnaRouterBlock = formatDnaRouterBlock(dnaRoute);

  const topic = extractQueryTopic(lastUserMsg);
  const initialConnectionDecision = shouldSearchConnections(lastUserMsg);

  sendStep("Pulling the receipts", "running", "context");
  const relevantContext = await retrieveRelevantContextForAssistant(
    supabase,
    userId,
    workspaceId || undefined,
    lastUserMsg,
    brandId || undefined,
    false,
  );
  const {
    connectionContext,
    sourceRegistry,
    searchedProviders,
    skippedProviderDetails,
    connectionDecision,
    queryTopic,
  } = await searchConnectedProviders(
    supabase,
    userId,
    lastUserMsg,
    (step) => send({ type: "progress", step }),
    topic,
  );
  const registryObj = (sourceRegistry && typeof sourceRegistry === "object")
    ? sourceRegistry as Record<string, unknown>
    : {};
  if (registryObj && Object.keys(registryObj).length > 0) {
    send({ type: "live_sources", registry: registryObj });
  }
  sendStep("Pulling the receipts", "done", "context", connectionDecision?.reason);

  let dashboardMarkdown = "";
  if (brandId && lastUserMsg && taskType === "chat") {
    sendStep("Dashboard snapshot", "running", "context");
    const dash = await resolveDashboardCardsForChat(supabase, {
      userId,
      brandId,
      userMessage: lastUserMsg,
      send,
    });
    dashboardMarkdown = dash.markdown;
    sendStep("Dashboard snapshot", "done", "context");
  }

  const answerTopic = queryTopic || topic;
  const webScheduled = shouldFetchPublicWebContext(lastUserMsg, replyContract);
  let publicWebBlock = "";
  if (webScheduled) {
    sendStep("Public web snapshot", "running", "context");
    const wq = extractWebSearchQuery(lastUserMsg);
    const snap = await fetchPublicWebSnapshot(wq || answerTopic || topic || lastUserMsg);
    if (snap) {
      publicWebBlock =
        `\n\n## External tier — web research (this turn)\n${snap}\n\n_Use only URLs/text above for competitive/public claims._\n`;
    }
    sendStep("Public web snapshot", "done", "context");
  }

  const performanceEvidence = businessId
    ? await buildPerformanceEvidenceMarkdown(supabase, businessId, 30)
    : "";

  const dataBackedBlock = buildDataBackedRoutingBlock({
    replyContract,
    liveLookupRan: initialConnectionDecision.shouldSearch,
    webSnapshotRan: webScheduled,
  });

  const skillMatchSource =
    questionGate.isAnswerToPriorQuestion && questionGate.originalRequest?.trim()
      ? questionGate.originalRequest.trim()
      : lastUserMsg;
  let matchedSkills = matchSkillsForMessage(skillMatchSource, 3);
  if (matchedSkills.length === 0) {
    const sticky = matchSkillSticky(messages);
    if (sticky) matchedSkills = [sticky];
  }
  if (matchedSkills.length > 0) {
    sendStep(
      `Loading ${matchedSkills.length} playbook${matchedSkills.length > 1 ? "s" : ""}`,
      "done",
      "skill",
    );
  }
  const skillPlaybookBlock = buildSkillsBlock(matchedSkills);

  const liveDataAndConnectorsBlock = [
    relevantContext,
    connectionContext,
    dnaRouterBlock,
    performanceEvidence ? `## Performance Evidence (KPI Windows)\n${performanceEvidence}` : "",
  ].filter(Boolean).join("\n\n");

  const toolDefs = buildAssistantChatTools();
  const toolDefinitionsBlock =
    "## Available tools (this turn)\n" +
    "You may call: **create_agent**, **create_employee**, **memory_write**, **web_search**. " +
    "Use **memory_write** only for durable decisions. Use **web_search** only when external facts are needed and not already in context.\n" +
    JSON.stringify(toolDefs.map((t: any) => ({ name: t.function?.name, description: t.function?.description })), null, 0);

  const systemPrompt = composeAssistantSystemPrompt({
    identityLine,
    businessContextBlock,
    persistedMemoryBlock,
    skillPlaybookBlock,
    liveDataAndConnectorsBlock,
    dashboardBlock: dashboardMarkdown,
    webBlock: publicWebBlock,
    intentRoutingBlock,
    dataBackedRoutingBlock: dataBackedBlock,
    toolDefinitionsBlock,
    replyContract,
  });

  return {
    systemPrompt,
    offerTools: true,
    tools: toolDefs,
    sourceRegistry: registryObj,
    connectionContext,
    connectionDecision,
    searchedProviders,
    skippedProviderDetails,
    queryTopic: String(queryTopic || answerTopic || topic || ""),
  };
}

/** Orchestrator entry (same as buildAssistantPipelinePrompt). */
export const runPipeline = buildAssistantPipelinePrompt;
