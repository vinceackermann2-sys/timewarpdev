import { useCallback, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { extractAssistantSources } from "@/lib/agentChat/parseAssistantSources";
import { ensureAssistantSourceAttribution } from "@/lib/agentChat/ensureAssistantAttribution";
import { extractSuggestions } from "@/lib/parseSuggestions";
import { buildMultimodalContent } from "@/lib/agentChat/multimodal";
import { buildConnectionTaskSteps, upsertChatTaskStep } from "@/lib/agentChat/connectionSteps";
import { buildChatTaskSummaryPreview, generateTaskReport } from "@/lib/agentChat/taskReport";
import { extractPlanArtifact } from "@/lib/agentChat/planArtifacts";
import { extractPlanActions } from "@/lib/agentChat/planActionExtractor";
import { runEvidenceAudit } from "@/lib/agentChat/evidenceAudit";
import type { ChatMessage, SourceEntry } from "@/lib/agentChat/types";
import type { SuggestionGroup } from "@/lib/parseSuggestions";
import type { PipelineSourcesPayload } from "@/lib/streamReaders";
import type { LiveSourceRegistry } from "@/lib/liveSourceRegistry";
import { consumeAgentChatSseStream, consumeOpenAiStyleSseStream } from "@/lib/streamReaders";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

type BrandRow = { id: string; agentName?: string; name?: string; _rowId?: string };

function mergePipelineSources(evt: PipelineSourcesPayload): SourceEntry[] {
  const map = (r: {
    type: string;
    label: string;
    provider?: string;
    url?: string;
    snippet?: string;
  }): SourceEntry => ({
    type: r.type === "external" || r.type === "connector" ? r.type : "internal",
    label: r.label,
    provider: r.provider,
    url: r.url,
    snippet: r.snippet,
  });
  // Only surface evidence that ACTUALLY shaped the reply. Connectors that
  // were searched but returned no rows live in `dataSources` — they're useful
  // for debugging but should not appear under "Data-backed", since the model
  // never cited them. This prevents misleading badges like "HubSpot used"
  // when HubSpot's API call returned zero matches.
  const conclusion = (evt.conclusionSources || []).map(map);
  const seen = new Set<string>();
  return conclusion.filter((s) => {
    const k = `${s.type}|${s.label}|${s.provider ?? ""}|${s.url ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function toQuestionGroups(questions: string[]): SuggestionGroup[] {
  return questions
    .map((q) => String(q || "").trim())
    .filter(Boolean)
    .map((q) => ({ title: q, suggestions: [] }));
}

function hasQuestionTitle(group: SuggestionGroup): boolean {
  const title = (group.title || "").trim();
  return title.length > 0 && /\?\s*$/.test(title);
}

function extractBareClarifyingQuestion(content: string): SuggestionGroup | null {
  const cleaned = String(content || "")
    .replace(/^(quick( one)?|before i (answer|continue)|one thing|clarifier)[:,\s-]*/i, "")
    .trim();
  if (!cleaned || cleaned.length > 260 || !/\?\s*$/.test(cleaned)) return null;
  const questionCount = (cleaned.match(/\?/g) || []).length;
  if (questionCount > 2) return null;
  return { title: cleaned, suggestions: [] };
}

function isClarifierOnlyContent(content: string): boolean {
  const cleaned = String(content || "").trim();
  if (!cleaned) return true;
  if (cleaned.length > 280) return false;
  return /\?\s*$/.test(cleaned) || /^(quick clarifier|i need (a few details|one detail)|before i (answer|continue)|pick or type your reply)/i.test(cleaned);
}

function buildQuestionReplayContent(content: string, groups: SuggestionGroup[]): string {
  const visibleQuestions = groups.map((g) => g.title).filter(Boolean).join("\n");
  const tags = groups
    .filter(hasQuestionTitle)
    .map((g) => `[SUGGEST:${g.title}::Type your answer]`)
    .join("\n");
  return [content.trim() || visibleQuestions, tags].filter(Boolean).join("\n\n");
}

/** Build chat history for the edge function — assistant rows use raw model text when present. */
function toChatApiPayload(messages: ChatMessage[]): { role: string; content: string }[] {
  return messages
    .filter((m) => !m.isStreaming)
    .map((m) => ({
      role: m.role,
      content:
        m.role === "assistant" && m.modelTurnContent && m.modelTurnContent.trim().length > 0
          ? m.modelTurnContent
          : m.content,
    }));
}

export interface ExtensionBridgeActions {
  getPageContext: () => Promise<any>;
  executeAction: (action: any) => Promise<any>;
  signalStart: (id: string, name: string, opts?: { startUrl?: string; focusGroup?: boolean }) => Promise<boolean>;
  signalStop: (id: string) => void;
  updateOverlay: (state: { visible: boolean; employeeName?: string; currentStep?: string }) => void;
  cancelPending?: () => void;
}

export interface AgentChatTransportDeps {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  brands: BrandRow[];
  selectedAgent: string;
  activeWorkspaceId: string | null;
  sessionMemory: string;
  user: User | null;
  supabase: SupabaseClient;
  fetchWithTimeout: (url: string, options: RequestInit, timeoutMs?: number) => Promise<Response>;
  extension: ExtensionBridgeActions;
  cancelledRef?: { current: boolean };
  planMode?: boolean;
}

export function useAssistantChat(deps: AgentChatTransportDeps) {
  const {
    messages,
    setMessages,
    brands,
    selectedAgent,
    activeWorkspaceId,
    sessionMemory,
    user,
    supabase,
    fetchWithTimeout,
    extension: { getPageContext, executeAction, signalStart, signalStop, updateOverlay },
    cancelledRef,
    planMode,
  } = deps;

  const throwIfCancelled = useCallback(() => {
    if (cancelledRef?.current) throw new Error("Cancelled");
  }, [cancelledRef]);

  const resolveBrandRowId = useCallback(() => {
    const ab = brands.find(b => (b.agentName || b.name || "AI") === selectedAgent);
    return ab ? (ab as BrandRow)._rowId : undefined;
  }, [brands, selectedAgent]);

  const timeoutForTask = useCallback((taskType: "chat" | "crawl" | "enrichment") => {
    if (taskType === "crawl") return 240000;
    if (taskType === "enrichment") return 300000;
    return 180000;
  }, []);

  const runAgentChat = useCallback(async (session: { access_token: string }, userMsg: ChatMessage, assistantId: string) => {
    const chatHistory = toChatApiPayload(messages);
    const userContent = buildMultimodalContent(userMsg.content);
    (chatHistory as any[]).push({ role: "user", content: userContent });

    const brandRowId = resolveBrandRowId();

    const taskSteps: ChatMessage["taskSteps"] = [];
    let extensionLiveReg: LiveSourceRegistry | undefined;
    let pipelineSourcesForTurn: SourceEntry[] = [];
    let streamedQuestionGroups: SuggestionGroup[] = [];
    const syncTaskSteps = (content?: string) => {
      setMessages(prev => prev.map(m => m.id === assistantId ? {
        ...m,
        ...(content !== undefined ? { content } : {}),
        ...(extensionLiveReg ? { liveSourceRegistry: extensionLiveReg } : {}),
        ...(pipelineSourcesForTurn.length ? { sources: pipelineSourcesForTurn } : {}),
        ...(streamedQuestionGroups.length > 0 ? { suggestionQuestions: streamedQuestionGroups, isQuestionPause: true } : {}),
        taskSteps: [...(taskSteps || [])],
        currentStepIndex: (taskSteps?.length ?? 0) - 1,
        isStreaming: true,
        streamStartTime: m.streamStartTime || Date.now(),
      } : m));
    };
    const handleProgressStep = (step: { label: string; status: "running" | "done" | "error"; action?: string; detail?: string }) => {
      if (step.action === "heartbeat") return;
      const existingIdx = taskSteps.findIndex(s => s.label === step.label && s.status === "running");
      if (existingIdx !== -1 && step.status !== "running") {
        taskSteps[existingIdx].status = step.status;
        if (step.detail) taskSteps[existingIdx].detail = step.detail;
      } else if (existingIdx === -1) {
        taskSteps.push({ action: step.action || "process", label: step.label, status: step.status, detail: step.detail });
      }
      syncTaskSteps();
    };

    // Seed an immediate "thinking" step so the UI shows activity instantly,
    // before the network round-trip and SSE handshake complete.
    taskSteps.push({ action: "thinking", label: "Reading your message…", status: "running" });
    setMessages(prev => prev.map(m => m.id === assistantId ? {
      ...m,
      content: "",
      isStreaming: true,
      streamStartTime: m.streamStartTime || Date.now(),
      taskSteps: [...taskSteps],
      currentStepIndex: 0,
    } : m));

    const response = await fetchWithTimeout(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: chatHistory,
          pageContext: null,
          brandId: brandRowId,
          workspaceId: activeWorkspaceId,
          sessionMemory: sessionMemory || undefined,
          taskType: "chat",
          planMode: !!planMode,
        }),
      },
      timeoutForTask("chat"),
    );

    if (!response.ok) {
      handleProgressStep({ label: "Error", status: "error" });
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || "Failed to get response");
    }

    const contentType = response.headers.get("content-type") || "";
    let fullContent = "";
    let replyContractMeta: "direct" | "live_lookup" | "strategic_plan" | undefined;
    const toolCallsMeta: { name: string; args: Record<string, unknown> }[] = [];
    let postFlightMeta: { score: number; confidence: string; warnings: string[] } | undefined;

    if (contentType.includes("text/event-stream")) {
      let streaming = "";
      await consumeAgentChatSseStream(response, {
        onProgressStep: handleProgressStep,
        onContentDelta: (delta) => {
          streaming += delta;
          syncTaskSteps(streaming);
        },
        onToolCall: (evt) => {
          if (evt.name) toolCallsMeta.push({ name: evt.name, args: evt.args || {} });
        },
        onPostFlight: (evt) => {
          postFlightMeta = {
            score: evt.score,
            confidence: evt.confidence,
            warnings: evt.warnings || [],
          };
        },
        onDashboardCards: (evt) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    dashboardCards: evt.cards || [],
                    dashboardOpeningSummary: evt.openingSummary ?? null,
                    dashboardHealthScore: evt.healthScore ?? null,
                  }
                : m,
            ),
          );
        },
        onLiveSources: (registry) => {
          extensionLiveReg = registry;
          syncTaskSteps(streaming);
        },
        onSources: (evt) => {
          pipelineSourcesForTurn = mergePipelineSources(evt);
          syncTaskSteps(streaming);
        },
        onQuestions: (questions) => {
          streamedQuestionGroups = toQuestionGroups(questions);
          syncTaskSteps(streaming);
        },
        onCreatedEntity: (evt) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, createdEntity: { kind: evt.kind, id: evt.id, name: evt.name } }
                : m,
            ),
          );
        },
        onResult: (evt) => {
          if (evt.content) streaming = evt.content;
          if (evt.replyContract === "direct" || evt.replyContract === "live_lookup" || evt.replyContract === "strategic_plan") {
            replyContractMeta = evt.replyContract;
          }
          if (evt.liveSourceRegistry && Object.keys(evt.liveSourceRegistry).length > 0) {
            extensionLiveReg = evt.liveSourceRegistry;
            syncTaskSteps(streaming);
          }
        },
      });
      fullContent = streaming;
    } else {
      await consumeOpenAiStyleSseStream(response, (delta) => {
        fullContent += delta;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullContent, taskSteps: [...taskSteps], isStreaming: true } : m));
      });
      handleProgressStep({ label: "Finished", status: "done", action: "complete" });
    }

    const { content: sugCleanContent, suggestions, title: suggestionTitle, questions, planActions } = extractSuggestions(fullContent || "I'm ready to help. What would you like me to do?");
    const { content: cleanContent, artifact } = extractPlanArtifact(sugCleanContent);
    const { content: contentNoSources, attribution: parsedAttribution } = extractAssistantSources(cleanContent);
    const dataSourceAttribution = ensureAssistantSourceAttribution(contentNoSources, parsedAttribution, {
      replyContract: replyContractMeta,
      userSnippet: userMsg.content || "",
    });
    const derivedPlanActions = artifact ? extractPlanActions(artifact.markdown) : [];
    // Fold derived plan actions into the first question group so they
    // surface alongside the AI-authored options on the legacy single-card
    // path. When the AI asks multiple questions, the parser already
    // produces multiple groups — preserve them as-is.
    let mergedQuestions = (() => {
      if (questions.length === 0 && derivedPlanActions.length > 0) {
        return [{ suggestions: derivedPlanActions.map((a) => a.label).slice(0, 4) }];
      }
      if (questions.length > 0 && derivedPlanActions.length > 0) {
        const first = questions[0];
        return [
          {
            ...first,
            suggestions: [...first.suggestions, ...derivedPlanActions.map((a) => a.label)].slice(0, 4),
          },
          ...questions.slice(1),
        ];
      }
      return questions;
    })();
    if (mergedQuestions.length === 0 && streamedQuestionGroups.length > 0) {
      mergedQuestions = streamedQuestionGroups;
    }
    const bareClarifier = mergedQuestions.length === 0 ? extractBareClarifyingQuestion(contentNoSources) : null;
    if (bareClarifier) mergedQuestions = [bareClarifier];
    const isQuestionPause = mergedQuestions.some(hasQuestionTitle) && isClarifierOnlyContent(contentNoSources);
    const modelReplayContent = isQuestionPause
      ? buildQuestionReplayContent(contentNoSources, mergedQuestions)
      : fullContent;
    const mergedSuggestions = [...suggestions, ...derivedPlanActions.map((a) => a.label)].slice(0, 4);
    const fallbackTitle: string | undefined = suggestionTitle;
    const actionPayloads: Record<string, string> = {};
    const keyFor = (label: string) => label.replace(/^(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*\uFE0F?)\s+/u, "").trim();
    for (const pa of planActions || []) {
      actionPayloads[pa.label] = pa.prefill;
      actionPayloads[keyFor(pa.label)] = pa.prefill;
    }
    for (const pa of derivedPlanActions) {
      actionPayloads[pa.label] = pa.prefill;
      actionPayloads[keyFor(pa.label)] = pa.prefill;
    }
    const evidenceAudit = runEvidenceAudit(contentNoSources, [userMsg.content || "", sessionMemory || ""]);
    setMessages(prev => prev.map(m => m.id === assistantId ? {
      ...m,
      content: isQuestionPause ? "" : contentNoSources,
      modelTurnContent: (modelReplayContent || "").trim().length > 0 ? modelReplayContent : undefined,
      dataSourceAttribution,
      suggestions: mergedSuggestions,
      suggestionQuestions: mergedQuestions.length > 0 ? mergedQuestions : undefined,
      isQuestionPause,
      suggestionTitle: fallbackTitle,
      planActionPayloads: Object.keys(actionPayloads).length ? actionPayloads : undefined,
      evidenceAudit,
      evidenceEnforcement: typeof postFlightMeta !== "undefined" ? postFlightMeta : undefined,
      memoryOps: toolCallsMeta.length > 0 ? toolCallsMeta : undefined,
      replyContract: replyContractMeta,
      taskSteps: [...taskSteps],
      currentStepIndex: taskSteps.length - 1,
      elapsedSeconds:
        typeof m.elapsedSeconds === "number" && Number.isFinite(m.elapsedSeconds)
          ? m.elapsedSeconds
          : m.streamStartTime
            ? Math.max(0, Math.floor((Date.now() - m.streamStartTime) / 1000))
            : undefined,
      isStreaming: false,
      ...(extensionLiveReg ? { liveSourceRegistry: extensionLiveReg } : {}),
      ...(pipelineSourcesForTurn.length ? { sources: pipelineSourcesForTurn } : {}),
      ...(artifact ? {
        planContent: artifact.markdown,
        planSavedToDb: false,
        planEvidenceSources: artifact.evidenceSources,
        planConfidence: artifact.confidence,
      } : {}),
    } : m));
  }, [messages, setMessages, fetchWithTimeout, activeWorkspaceId, sessionMemory, resolveBrandRowId, timeoutForTask]);

  const runAgentChatWithBrowser = useCallback(async (session: { access_token: string }, userMsg: ChatMessage, assistantId: string) => {
    const brandRowId = resolveBrandRowId();
    // Hint a startUrl from the user request when one is detectable; falls back
    // to about:blank inside the bridge. This lets the extension actually open
    // a fresh grouped tab even on builds that ignore createNewTab without a url.
    const urlMatch = userMsg.content.match(/https?:\/\/[^\s)]+/i);
    const startUrl = urlMatch ? urlMatch[0] : undefined;
    await signalStart("agent", selectedAgent || "AI Agent", { startUrl, focusGroup: true });
    updateOverlay({ visible: true, employeeName: selectedAgent || "AI Agent", currentStep: "Starting..." });

    let stepCount = 0;
    let consecutiveErrors = 0;
    const maxSteps = 30;
    let finalMessage = "";
    let conversationHistory: { role: "user" | "assistant"; content: string }[] = [{ role: "user", content: userMsg.content }];
    const startTime = new Date();

    interface StepLog { step: number; action: string; reasoning: string; result: string; timestamp: string; url?: string }
    const stepLogs: StepLog[] = [];
    const taskSteps: ChatMessage["taskSteps"] = [];
    const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Starting task...", taskSteps: [], currentStepIndex: -1, isStreaming: true } : m));

    try {
      while (stepCount < maxSteps) {
        throwIfCancelled();
        const pageContext = await getPageContext();
        throwIfCancelled();
        const stepTime = new Date();
        updateOverlay({ visible: true, employeeName: selectedAgent || "AI Agent", currentStep: `Step ${stepCount + 1}...` });

        const response = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              messages: conversationHistory.slice(-6),
              pageContext,
              brandId: brandRowId,
              workspaceId: activeWorkspaceId,
              browserMode: true,
              sessionMemory: sessionMemory || undefined,
              taskType: "crawl",
            }),
          },
          timeoutForTask("crawl"),
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || "Browser step failed");
        }

        const data = await response.json();
        const content = data.content || "";
        conversationHistory.push({ role: "assistant" as const, content });

        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
        if (!jsonMatch) {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content, taskSteps: [...(taskSteps || [])], isStreaming: false } : m));
          break;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(jsonMatch[1]);
        } catch {
          conversationHistory.push({ role: "user" as const, content: "Error: Your last response contained invalid JSON. Please re-send your action as valid JSON inside ```json``` fences." });
          stepCount++;
          continue;
        }
        const actions = parsed.steps ? parsed.steps : [parsed];
        let shouldBreak = false;
        let shouldContinue = false;

        for (const action of actions) {
          throwIfCancelled();
          if (stepCount >= maxSteps) break;
          const stepLabel = action.reasoning || action.action;
          const timeStr = formatTime(stepTime);

          stepLogs.push({ step: stepCount + 1, action: action.action, reasoning: stepLabel, result: "pending", timestamp: timeStr, url: pageContext?.url || action.url });
          const stepDetail = [action.reasoning, action.url, action.selector].filter(Boolean).join(" · ");
          taskSteps!.push({ action: action.action, label: stepLabel, status: "running", detail: stepDetail || undefined });

          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: stepLabel, taskSteps: [...taskSteps!], currentStepIndex: taskSteps!.length - 1, isStreaming: true } : m));
          updateOverlay({ visible: true, employeeName: selectedAgent || "AI Agent", currentStep: stepLabel });

          if (action.done || action.action === "done") {
            finalMessage = action.message || "Task completed.";
            stepLogs[stepLogs.length - 1].result = "done";
            taskSteps![taskSteps!.length - 1].status = "done";
            shouldBreak = true;
            break;
          }

          if (action.action === "respond") {
            stepLogs[stepLogs.length - 1].result = "respond";
            taskSteps![taskSteps!.length - 1].status = "done";
            taskSteps![taskSteps!.length - 1].detail = action.message || "";
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: action.message || stepLabel, taskSteps: [...taskSteps!], currentStepIndex: taskSteps!.length - 1, isStreaming: true } : m));
            conversationHistory.push({ role: "user" as const, content: `Noted. Now proceed with the next action to execute the task. Do NOT respond again — take an actual browser action (navigate, click, type, etc.).` });
            stepCount++;
            shouldContinue = true;
            break;
          }

          if (action.action === "wait") {
            const waitMs = Math.min(action.duration || 1000, 5000);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            stepLogs[stepLogs.length - 1].result = "success";
            taskSteps![taskSteps!.length - 1].status = "done";
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, taskSteps: [...taskSteps!], isStreaming: true } : m));
            consecutiveErrors = 0;
            conversationHistory.push({ role: "user" as const, content: `Action result: {"success":true,"action":"wait"}` });
            stepCount++;
            continue;
          }

          let result = await executeAction(action);
          throwIfCancelled();

          if (!result.success && action.action === "extract" && pageContext?.pageContent) {
            result = { success: true, action: "extract", data: { content: pageContext.pageContent.slice(0, 5000), fallback: true } };
          }

          if (!result.success && result.error === "Timeout waiting for extension") {
            taskSteps![taskSteps!.length - 1].status = "error";
            taskSteps![taskSteps!.length - 1].detail = "Browser extension disconnected";
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "⚠️ Browser extension lost connection. Please check your extension is running and try again.", taskSteps: [...taskSteps!], isStreaming: false } : m));
            break;
          }

          stepLogs[stepLogs.length - 1].result = result.success ? "success" : (result.error || "failed");
          taskSteps![taskSteps!.length - 1].status = result.success ? "done" : "error";
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: stepLabel, taskSteps: [...taskSteps!], currentStepIndex: taskSteps!.length - 1, isStreaming: true } : m));

          if (result.success) {
            consecutiveErrors = 0;
            conversationHistory.push({ role: "user" as const, content: `Action result: ${JSON.stringify(result)}` });
          } else {
            consecutiveErrors++;
            const recoveryHint = `Action failed: ${result.error || "unknown error"}. Try an alternative approach — use a different selector, scroll to find the element, or navigate differently.`;
            conversationHistory.push({ role: "user" as const, content: recoveryHint });
            if (consecutiveErrors >= 3) {
              finalMessage = "Task stopped after multiple consecutive failures. Here is what was collected so far.";
              shouldBreak = true;
              break;
            }
          }

          if (result.success && action.action === "extract" && (!result.data || !result.data.content) && pageContext?.pageContent) {
            conversationHistory[conversationHistory.length - 1] = { role: "user" as const, content: `Action result: ${JSON.stringify({ success: true, action: "extract", data: { content: pageContext.pageContent.slice(0, 5000), fallback: true } })}` };
          }

          stepCount++;
        }

        if (shouldBreak) break;
        if (shouldContinue) continue;
        if (!shouldBreak && !shouldContinue && actions.length > 0) continue;
      }

      if (!finalMessage) {
        const respondMessages = stepLogs.filter(s => s.result === "respond").map(s => s.reasoning);
        if (respondMessages.length > 0) {
          finalMessage = respondMessages.join("\n\n");
        } else {
          const lastAiMsg = [...conversationHistory].reverse().find(m => m.role === "assistant");
          if (lastAiMsg) {
            finalMessage = lastAiMsg.content.replace(/```json[\s\S]*?```/g, "").trim() || "Task completed but no structured results were returned.";
          }
        }
      }

      const endTime = new Date();
      const durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      const report = generateTaskReport(selectedAgent || "AI Agent", userMsg.content, stepLogs, startTime, endTime, durationSec, finalMessage);
      const preview = buildChatTaskSummaryPreview(stepLogs);
      const bubble = [preview, finalMessage || `Task completed — ${durationSec}s`].filter(Boolean).join("\n\n");

      setMessages(prev => prev.map(m => m.id === assistantId ? {
        ...m,
        content: bubble,
        taskSteps: [...(taskSteps || [])],
        isStreaming: false,
        reportContent: report,
        reportSavedToDb: false,
      } : m));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      taskSteps!.push({ action: "error", label: msg, status: "error" });
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: msg || "Something went wrong.", taskSteps: [...taskSteps!], isStreaming: false } : m));
      throw err;
    } finally {
      updateOverlay({ visible: false });
      signalStop("agent");
    }
  }, [setMessages, fetchWithTimeout, activeWorkspaceId, sessionMemory, selectedAgent, resolveBrandRowId, getPageContext, executeAction, signalStart, signalStop, updateOverlay, timeoutForTask, throwIfCancelled]);

  const runEmployeeChat = useCallback(async (session: { access_token: string }, userMsg: ChatMessage, assistantId: string) => {
    const emp = userMsg.employees?.[0];
    if (!emp) return;

    const startTime = new Date();
    const taskSteps: ChatMessage["taskSteps"] = [];
    let employeeLiveReg: LiveSourceRegistry | undefined;
    let employeePipelineSources: SourceEntry[] = [];
    let streamedQuestionGroups: SuggestionGroup[] = [];

    const syncUI = (content?: string) => {
      setMessages(prev => prev.map(m => m.id === assistantId ? {
        ...m,
        ...(content !== undefined ? { content } : {}),
        ...(employeeLiveReg ? { liveSourceRegistry: employeeLiveReg } : {}),
        ...(employeePipelineSources.length ? { sources: employeePipelineSources } : {}),
        ...(streamedQuestionGroups.length > 0 ? { suggestionQuestions: streamedQuestionGroups, isQuestionPause: true } : {}),
        taskSteps: [...(taskSteps || [])],
        currentStepIndex: (taskSteps?.length ?? 0) - 1,
        isStreaming: true,
        streamStartTime: m.streamStartTime || Date.now(),
      } : m));
    };

    const handleProgressStep = (step: { label: string; status: "running" | "done" | "error"; action?: string; detail?: string }) => {
      if (step.action === "heartbeat") return;
      const existingIdx = taskSteps.findIndex(s => s.label === step.label && s.status === "running");
      if (existingIdx !== -1 && step.status !== "running") {
        taskSteps[existingIdx].status = step.status;
        if (step.detail) taskSteps[existingIdx].detail = step.detail;
      } else if (existingIdx === -1) {
        taskSteps.push({ action: step.action || "process", label: step.label, status: step.status, detail: step.detail });
      }
      syncUI();
    };

    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "", isStreaming: true, streamStartTime: m.streamStartTime || Date.now(), taskSteps: [], currentStepIndex: -1 } : m));

    supabase.from("ai_employee_logs").insert({ employee_id: emp.id, user_id: user!.id, status: "running", step_label: "Task started", message: userMsg.content }).then(() => {});

    const chatHistory = toChatApiPayload(messages);
    const userContent = buildMultimodalContent(userMsg.content);
    (chatHistory as any[]).push({ role: "user", content: userContent });

    const brandRowId = resolveBrandRowId();

    let accumulatedContent = "";
    let continuationCount = 0;
    const MAX_CONTINUATIONS = 8;
    let needsContinuation = false;

    do {
      needsContinuation = false;

      const response = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            employee_id: emp.id,
            messages: chatHistory,
            brandId: brandRowId,
            workspaceId: activeWorkspaceId,
            skip_action: continuationCount > 0,
            sessionMemory: sessionMemory || undefined,
              taskType: "chat",
              planMode: !!planMode,
              continuationKey: assistantId,
              continuationIndex: continuationCount,
            ...(accumulatedContent ? { continuationContent: accumulatedContent } : {}),
          }),
        },
          timeoutForTask("chat"),
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        handleProgressStep({ label: "Error", status: "error" });
        supabase.from("ai_employee_logs").insert({ employee_id: emp.id, user_id: user!.id, status: "error", step_label: "Error", message: (err as { error?: string }).error || "Failed" }).then(() => {});
        throw new Error((err as { error?: string }).error || "Employee failed");
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        let acc = accumulatedContent;
        await consumeAgentChatSseStream(response, {
          onProgressStep: handleProgressStep,
          onContentDelta: (delta) => {
            acc += delta;
            syncUI(acc);
          },
          onDashboardCards: (evt) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      dashboardCards: evt.cards || [],
                      dashboardOpeningSummary: evt.openingSummary ?? null,
                      dashboardHealthScore: evt.healthScore ?? null,
                    }
                  : m,
              ),
            );
          },
          onLiveSources: (registry) => {
            employeeLiveReg = registry;
            syncUI(acc);
          },
          onSources: (evt) => {
            employeePipelineSources = mergePipelineSources(evt);
            syncUI(acc);
          },
          onQuestions: (questions) => {
            streamedQuestionGroups = toQuestionGroups(questions);
            syncUI(acc);
          },
          onResult: (evt) => {
            if (evt.content) acc = evt.content;
            if (evt.liveSourceRegistry && Object.keys(evt.liveSourceRegistry).length > 0) {
              employeeLiveReg = evt.liveSourceRegistry;
            }
            if (evt.continuation) needsContinuation = true;
          },
        });
        accumulatedContent = acc;
      } else {
        const data = await response.json();
        for (const step of buildConnectionTaskSteps(data)) {
          handleProgressStep({
            label: step.label,
            status: step.status,
            action: step.action,
            detail: step.detail,
          });
        }
        accumulatedContent = data.content || accumulatedContent;
        if (data.liveSourceRegistry && typeof data.liveSourceRegistry === "object") {
          employeeLiveReg = data.liveSourceRegistry as LiveSourceRegistry;
        }
        syncUI(accumulatedContent);
        if (data.continuation) needsContinuation = true;
      }

      continuationCount++;
    } while (needsContinuation && continuationCount <= MAX_CONTINUATIONS);

    handleProgressStep({ label: "Finished", status: "done", action: "complete" });

    const endTime = new Date();
    const durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    supabase.from("ai_employee_logs").insert({ employee_id: emp.id, user_id: user!.id, status: "completed", step_label: "Task completed", message: `Completed in ${durationSec}s` }).then(() => {});

    const { content: sugCleanContent, suggestions, title: suggestionTitle, questions, planActions } = extractSuggestions(accumulatedContent || "Task completed.");
    const { content: cleanContent, artifact } = extractPlanArtifact(sugCleanContent);
    const { content: contentNoSources, attribution: parsedAttribution } = extractAssistantSources(cleanContent);
    const dataSourceAttribution = ensureAssistantSourceAttribution(contentNoSources, parsedAttribution, {
      userSnippet: userMsg.content || "",
    });
    const derivedPlanActions = artifact ? extractPlanActions(artifact.markdown) : [];
    const mergedSuggestions = [...suggestions, ...derivedPlanActions.map((a) => a.label)].slice(0, 4);
    let mergedQuestions = (() => {
      if (questions.length === 0 && derivedPlanActions.length > 0) {
        return [{ suggestions: derivedPlanActions.map((a) => a.label).slice(0, 4) }];
      }
      if (questions.length > 0 && derivedPlanActions.length > 0) {
        const first = questions[0];
        return [
          {
            ...first,
            suggestions: [...first.suggestions, ...derivedPlanActions.map((a) => a.label)].slice(0, 4),
          },
          ...questions.slice(1),
        ];
      }
      return questions;
    })();
    if (mergedQuestions.length === 0 && streamedQuestionGroups.length > 0) {
      mergedQuestions = streamedQuestionGroups;
    }
    const bareClarifier = mergedQuestions.length === 0 ? extractBareClarifyingQuestion(contentNoSources) : null;
    if (bareClarifier) mergedQuestions = [bareClarifier];
    const isQuestionPause = mergedQuestions.some(hasQuestionTitle) && isClarifierOnlyContent(contentNoSources);
    const modelReplayContent = isQuestionPause
      ? buildQuestionReplayContent(contentNoSources, mergedQuestions)
      : accumulatedContent;
    const actionPayloads: Record<string, string> = {};
    const keyFor = (label: string) => label.replace(/^(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*\uFE0F?)\s+/u, "").trim();
    for (const pa of planActions || []) {
      actionPayloads[pa.label] = pa.prefill;
      actionPayloads[keyFor(pa.label)] = pa.prefill;
    }
    for (const pa of derivedPlanActions) {
      actionPayloads[pa.label] = pa.prefill;
      actionPayloads[keyFor(pa.label)] = pa.prefill;
    }
    const evidenceAudit = runEvidenceAudit(contentNoSources, [userMsg.content || "", sessionMemory || ""]);
    setMessages(prev => prev.map(m => m.id === assistantId ? {
      ...m,
      content: isQuestionPause ? "" : contentNoSources,
      modelTurnContent: (modelReplayContent || "").trim().length > 0 ? modelReplayContent : undefined,
      dataSourceAttribution,
      suggestions: mergedSuggestions,
      suggestionQuestions: mergedQuestions.length > 0 ? mergedQuestions : undefined,
      isQuestionPause,
      suggestionTitle,
      planActionPayloads: Object.keys(actionPayloads).length ? actionPayloads : undefined,
      evidenceAudit,
      taskSteps: [...taskSteps],
      currentStepIndex: taskSteps.length - 1,
      elapsedSeconds:
        typeof m.elapsedSeconds === "number" && Number.isFinite(m.elapsedSeconds)
          ? m.elapsedSeconds
          : m.streamStartTime
            ? Math.max(0, Math.floor((Date.now() - m.streamStartTime) / 1000))
            : undefined,
      isStreaming: false,
      ...(employeeLiveReg ? { liveSourceRegistry: employeeLiveReg } : {}),
      ...(employeePipelineSources.length ? { sources: employeePipelineSources } : {}),
      ...(artifact ? {
        planContent: artifact.markdown,
        planSavedToDb: false,
        planEvidenceSources: artifact.evidenceSources,
        planConfidence: artifact.confidence,
      } : {}),
    } : m));
  }, [messages, setMessages, user, supabase, fetchWithTimeout, activeWorkspaceId, sessionMemory, resolveBrandRowId, timeoutForTask]);

  const runComputerMode = useCallback(async (session: { access_token: string }, userMsg: ChatMessage, assistantId: string) => {
    const emp = userMsg.employees?.[0];
    if (!emp) { toast.error("Select an employee to use Computer mode"); return; }

    let initialPageContext: any;
    try {
      initialPageContext = await getPageContext();
    } catch {
      const msg = "Browser extension not connected. Open/enable the extension, then retry Computer mode.";
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `⚠️ ${msg}`, isStreaming: false } : m));
      toast.error(msg);
      return;
    }
    if (!initialPageContext) {
      const msg = "Could not read browser page context. Check extension permissions and active tab.";
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `⚠️ ${msg}`, isStreaming: false } : m));
      toast.error(msg);
      return;
    }

    const urlMatch = userMsg.content.match(/https?:\/\/[^\s)]+/i);
    const startUrl = urlMatch ? urlMatch[0] : undefined;
    const signaled = await signalStart(emp.id, emp.name, { startUrl, focusGroup: true });
    if (!signaled) {
      const msg = "Could not start extension browser session. Please reconnect the extension and try again.";
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `⚠️ ${msg}`, isStreaming: false } : m));
      toast.error(msg);
      return;
    }
    updateOverlay({ visible: true, employeeName: emp.name, currentStep: "Starting..." });

    let stepCount = 0;
    let consecutiveErrors = 0;
    const maxSteps = 30;
    let finalMessage = "";
    let conversationHistory: { role: "user" | "assistant"; content: string }[] = [{ role: "user", content: userMsg.content }];
    const startTime = new Date();

    interface StepLog { step: number; action: string; reasoning: string; result: string; timestamp: string; url?: string }
    const stepLogs: StepLog[] = [];
    const taskSteps: ChatMessage["taskSteps"] = [];

    const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Starting task...", taskSteps: [], currentStepIndex: -1, isStreaming: true } : m));

    supabase.from("ai_employee_logs").insert({ employee_id: emp.id, user_id: user!.id, status: "running", step_label: "Task started", message: userMsg.content }).then(() => {});

    try {
      while (stepCount < maxSteps) {
        throwIfCancelled();
        const pageContext = stepCount === 0 ? initialPageContext : await getPageContext();
        throwIfCancelled();
        const stepTime = new Date();

        updateOverlay({ visible: true, employeeName: emp.name, currentStep: `Step ${stepCount + 1}...` });

        const response = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              messages: conversationHistory.slice(-6),
              pageContext,
              browserMode: true,
              brandId: (() => { const ab = brands.find(b => (b.agentName || b.name || "AI") === selectedAgent); return ab ? (ab as BrandRow)._rowId : undefined; })(),
              workspaceId: activeWorkspaceId,
              sessionMemory: sessionMemory || undefined,
              taskType: "crawl",
            }),
          },
          timeoutForTask("crawl"),
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || "Employee step failed");
        }

        const data = await response.json();
        const content = data.content || "";
        conversationHistory.push({ role: "assistant" as const, content });

        const connectionSteps = buildConnectionTaskSteps(data);
        for (const step of connectionSteps) {
          upsertChatTaskStep(taskSteps!, step);
        }
        if (connectionSteps.length > 0) {
          setMessages(prev => prev.map(m => m.id === assistantId ? {
            ...m,
            taskSteps: [...taskSteps!],
            currentStepIndex: taskSteps!.length - 1,
            isStreaming: true,
          } : m));
        }

        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
        if (!jsonMatch) {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content, taskSteps: [...taskSteps!], isStreaming: false } : m));
          stepLogs.push({ step: stepCount + 1, action: "response", reasoning: content, result: "completed", timestamp: formatTime(stepTime), url: pageContext?.url });
          break;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(jsonMatch[1]);
        } catch {
          conversationHistory.push({ role: "user" as const, content: "Error: Your last response contained invalid JSON. Please re-send your action as valid JSON inside ```json``` fences." });
          stepCount++;
          continue;
        }
        const actions = parsed.steps ? parsed.steps : [parsed];
        let shouldBreak = false;
        let shouldContinue = false;

        for (const action of actions) {
          throwIfCancelled();
          if (stepCount >= maxSteps) break;
          const stepLabel = action.reasoning || action.action;
          const timeStr = formatTime(stepTime);

          stepLogs.push({ step: stepCount + 1, action: action.action, reasoning: stepLabel, result: "pending", timestamp: timeStr, url: pageContext?.url || action.url });
          const stepDetail = [action.reasoning, action.url, action.selector].filter(Boolean).join(" · ");
          taskSteps!.push({ action: action.action, label: stepLabel, status: "running", detail: stepDetail || undefined });

          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: stepLabel, taskSteps: [...taskSteps!], currentStepIndex: taskSteps!.length - 1, isStreaming: true } : m));

          supabase.from("ai_employee_logs").insert({ employee_id: emp.id, user_id: user!.id, status: "running", step_label: `Step ${stepCount + 1}: ${action.action}`, message: stepLabel }).then(() => {});

          updateOverlay({ visible: true, employeeName: emp.name, currentStep: stepLabel });

          if (action.done || action.action === "done") {
            finalMessage = action.message || "Task completed.";
            stepLogs[stepLogs.length - 1].result = "done";
            taskSteps![taskSteps!.length - 1].status = "done";
            shouldBreak = true;
            break;
          }

          if (action.action === "respond") {
            stepLogs[stepLogs.length - 1].result = "respond";
            taskSteps![taskSteps!.length - 1].status = "done";
            taskSteps![taskSteps!.length - 1].detail = action.message || "";
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: action.message || stepLabel, taskSteps: [...taskSteps!], currentStepIndex: taskSteps!.length - 1, isStreaming: true } : m));
            conversationHistory.push({ role: "user" as const, content: `Noted. Now proceed with the next action to execute the task. Do NOT respond again — take an actual browser action (navigate, click, type, etc.).` });
            stepCount++;
            shouldContinue = true;
            break;
          }

          if (action.action === "wait") {
            const waitMs = Math.min(action.duration || 1000, 5000);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            stepLogs[stepLogs.length - 1].result = "success";
            taskSteps![taskSteps!.length - 1].status = "done";
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, taskSteps: [...taskSteps!], isStreaming: true } : m));
            consecutiveErrors = 0;
            conversationHistory.push({ role: "user" as const, content: `Action result: {"success":true,"action":"wait"}` });
            stepCount++;
            continue;
          }

          let result = await executeAction(action);
          throwIfCancelled();

          if (!result.success && action.action === "extract" && pageContext?.pageContent) {
            result = { success: true, action: "extract", data: { content: pageContext.pageContent.slice(0, 5000), fallback: true } };
          }

          if (!result.success && result.error === "Timeout waiting for extension") {
            taskSteps![taskSteps!.length - 1].status = "error";
            taskSteps![taskSteps!.length - 1].detail = "Browser extension disconnected";
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "⚠️ Browser extension lost connection. Please check your extension is running and try again.", taskSteps: [...taskSteps!], isStreaming: false } : m));
            break;
          }

          stepLogs[stepLogs.length - 1].result = result.success ? "success" : (result.error || "failed");
          taskSteps![taskSteps!.length - 1].status = result.success ? "done" : "error";
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: stepLabel, taskSteps: [...taskSteps!], currentStepIndex: taskSteps!.length - 1, isStreaming: true } : m));

          if (result.success) {
            consecutiveErrors = 0;
            conversationHistory.push({ role: "user" as const, content: `Action result: ${JSON.stringify(result)}` });
          } else {
            consecutiveErrors++;
            const recoveryHint = `Action failed: ${result.error || "unknown error"}. Try an alternative approach — use a different selector, scroll to find the element, or navigate differently.`;
            conversationHistory.push({ role: "user" as const, content: recoveryHint });
            if (consecutiveErrors >= 3) {
              finalMessage = "Task stopped after multiple consecutive failures. Here is what was collected so far.";
              shouldBreak = true;
              break;
            }
          }

          if (result.success && action.action === "extract" && (!result.data || !result.data.content) && pageContext?.pageContent) {
            conversationHistory[conversationHistory.length - 1] = { role: "user" as const, content: `Action result: ${JSON.stringify({ success: true, action: "extract", data: { content: pageContext.pageContent.slice(0, 5000), fallback: true } })}` };
          }

          stepCount++;
        }

        if (shouldBreak) break;
        if (shouldContinue) continue;
        if (!shouldBreak && !shouldContinue && actions.length > 0) continue;
      }

      if (!finalMessage) {
        const respondMessages = stepLogs.filter(s => s.result === "respond").map(s => s.reasoning);
        if (respondMessages.length > 0) {
          finalMessage = respondMessages.join("\n\n");
        } else {
          const lastAiMsg = [...conversationHistory].reverse().find(m => m.role === "assistant");
          if (lastAiMsg) {
            finalMessage = lastAiMsg.content.replace(/```json[\s\S]*?```/g, "").trim() || "Task completed but no structured results were returned.";
          }
        }
      }

      const endTime = new Date();
      const durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      const report = generateTaskReport(emp.name, userMsg.content, stepLogs, startTime, endTime, durationSec, finalMessage);
      const preview = buildChatTaskSummaryPreview(stepLogs);
      const bubble = [preview, finalMessage || `Task completed — ${durationSec}s`].filter(Boolean).join("\n\n");

      setMessages(prev => prev.map(m => m.id === assistantId ? {
        ...m,
        content: bubble,
        taskSteps: [...taskSteps!],
        isStreaming: false,
        reportContent: report,
        reportSavedToDb: false,
      } : m));

      supabase.from("ai_employee_logs").insert({ employee_id: emp.id, user_id: user!.id, status: "completed", step_label: "Task completed", message: `${stepLogs.length} steps in ${durationSec}s` }).then(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      taskSteps!.push({ action: "error", label: msg, status: "error" });
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: msg || "Something went wrong.", taskSteps: [...taskSteps!], isStreaming: false } : m));
      supabase.from("ai_employee_logs").insert({ employee_id: emp.id, user_id: user!.id, status: "error", step_label: "Error", message: msg }).then(() => {});
      throw err;
    } finally {
      updateOverlay({ visible: false });
      signalStop(emp.id);
    }
  }, [setMessages, brands, selectedAgent, fetchWithTimeout, activeWorkspaceId, sessionMemory, user, supabase, getPageContext, executeAction, signalStart, signalStop, updateOverlay, timeoutForTask, throwIfCancelled]);

  return useMemo(
    () => ({ runAgentChat, runAgentChatWithBrowser, runEmployeeChat, runComputerMode }),
    [runAgentChat, runAgentChatWithBrowser, runEmployeeChat, runComputerMode],
  );
}
