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
import { classifyAssistantGoal, expandQueryForConnectors } from "./goalSetter.ts";
import { buildConnectorProgressLabel } from "./personalLogger.ts";
import { buildSourceRegistryPayload } from "./sourceCollector.ts";
import { buildDataIntegrityChallengeBlock } from "./challengeEngine.ts";

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

  const goal = classifyAssistantGoal(lastUserMsg);
  const topic = extractQueryTopic(lastUserMsg);
  const connectorBoost = expandQueryForConnectors(goal, topic);
  const initialConnectionDecision = shouldSearchConnections(lastUserMsg);

  {
    const s = buildConnectorProgressLabel("start", goal);
    sendStep(s.label, "running", s.action);
    sendStep(s.label, "done", s.action);
  }
  const connPhase = buildConnectorProgressLabel("connectors", goal, initialConnectionDecision.reason);
  sendStep(connPhase.label, "running", connPhase.action);
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
    connectorBoost,
  );
  const registryObj = (sourceRegistry && typeof sourceRegistry === "object")
    ? sourceRegistry as Record<string, unknown>
    : {};
  if (registryObj && Object.keys(registryObj).length > 0) {
    send({ type: "live_sources", registry: registryObj });
  }
  sendStep(connPhase.label, "done", connPhase.action, connectionDecision?.reason);

  let dashboardMarkdown = "";
  let dashboardRan = false;
  if (brandId && lastUserMsg && taskType === "chat") {
    const d0 = buildConnectorProgressLabel("dashboard", goal);
    sendStep(d0.label, "running", d0.action);
    const dash = await resolveDashboardCardsForChat(supabase, {
      userId,
      brandId,
      userMessage: lastUserMsg,
      send,
    });
    dashboardMarkdown = dash.markdown;
    dashboardRan = !!dashboardMarkdown.trim();
    sendStep(d0.label, "done", d0.action);
  }

  const answerTopic = queryTopic || topic;
  const webScheduled = shouldFetchPublicWebContext(lastUserMsg, replyContract);
  let publicWebBlock = "";
  if (webScheduled) {
    const w0 = buildConnectorProgressLabel("web", goal);
    sendStep(w0.label, "running", w0.action);
    const wq = extractWebSearchQuery(lastUserMsg);
    const snap = await fetchPublicWebSnapshot(wq || answerTopic || topic || lastUserMsg);
    if (snap) {
      publicWebBlock =
        `\n\n## External tier — web research (this turn)\n${snap}\n\n_Use only URLs/text above for competitive/public claims._\n`;
    }
    sendStep(w0.label, "done", w0.action);
  }

  const performanceEvidence = businessId
    ? await buildPerformanceEvidenceMarkdown(supabase, businessId, 30)
    : "";

  let userAiGapNote = "";
  if (goal.dataTier === "user_ai" && !String(performanceEvidence || "").trim()) {
    userAiGapNote =
      "\n\n## User-AI performance tier\n**No KPI window / learning history** is available yet. Do not invent good-vs-bad period comparisons; say what is missing and what the user should track first.";
  }

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
    const sk = buildConnectorProgressLabel("skills", goal);
    sendStep(sk.label, "running", sk.action);
    sendStep(sk.label, "done", sk.action);
  }
  const skillPlaybookBlock = buildSkillsBlock(matchedSkills);

  const liveDataAndConnectorsBlock = [
    relevantContext,
    connectionContext,
    dnaRouterBlock,
    performanceEvidence ? `## Performance Evidence (KPI Windows)\n${performanceEvidence}` : "",
    userAiGapNote,
  ].filter(Boolean).join("\n\n");

  const toolDefs = buildAssistantChatTools();
  const toolNames = toolDefs.map((t: { function?: { name?: string } }) => t.function?.name).filter(Boolean);
  const toolDefinitionsBlock =
    "## Available tools (this turn)\n" +
    `You may call: **${toolNames.join("**, **")}**. ` +
    "Use **memory_write** only for durable decisions. Use **web_search** only when external facts are needed and not already in context.\n" +
    JSON.stringify(toolDefs.map((t: any) => ({ name: t.function?.name, description: t.function?.description })), null, 0);

  let systemPrompt = composeAssistantSystemPrompt({
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

  const challenge = buildDataIntegrityChallengeBlock(lastUserMsg, connectionContext);
  if (challenge) systemPrompt += `\n\n${challenge}`;
  systemPrompt +=
    "\n\n## Graphics\nDo not output generated graphics or image-generation instructions unless the user explicitly asked for a visual **or** they already confirmed in this thread after you asked.";

  const searchedList = Array.isArray(searchedProviders) ? searchedProviders as string[] : [];
  const sourcesPayload = buildSourceRegistryPayload({
    searchedProviders: searchedList,
    queryTopic: String(queryTopic || answerTopic || topic || ""),
    webSnapshotRan: webScheduled,
    dnaRouterRan: !!dnaRouterBlock?.trim(),
    performanceRan: !!String(performanceEvidence || "").trim(),
    dashboardRan,
  });
  send({ type: "sources", ...sourcesPayload });

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
