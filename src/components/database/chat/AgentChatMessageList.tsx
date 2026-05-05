import type { RefObject } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User as UserIcon } from "lucide-react";
import { TaskStepsDisplay, type TaskStepsOpenLoop } from "@/components/database/TaskStepsDisplay";
import { ChatDashboardCards } from "@/components/database/ChatDashboardCards";
import { AssistantInsightFeedback } from "@/components/database/AssistantInsightFeedback";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { buildChatMarkdownComponents } from "@/components/database/chat/chatMarkdownForMessage";
import type { ChatMessage } from "@/lib/agentChat/types";
import { extractAssistantSources } from "@/lib/agentChat/parseAssistantSources";
import { AssistantSources } from "./AssistantSources";
import { TaskReportViewer } from "./TaskReportViewer";

const STILL_IN_PROGRESS_RE = /\*\*still in progress\*\*|still in progress:/i;

/** Hide "Still in progress: …" tail in the UI — open-loop state uses the waiting row instead. */
function stripStillInProgressTail(text: string): string {
  return text.replace(/\n*\*{0,2}\s*still\s+in\s+progress\s*\*{0,2}\s*:?[\s\S]*$/i, "").trimEnd();
}

function assistantOpenLoop(msg: ChatMessage): TaskStepsOpenLoop {
  if (msg.isStreaming) return null;
  const hasChips =
    (msg.suggestionQuestions && msg.suggestionQuestions.length > 0) ||
    (msg.suggestions && msg.suggestions.length > 0);
  if (hasChips) return "awaiting_user";
  const raw = `${msg.modelTurnContent || ""}\n${msg.content || ""}`;
  if (STILL_IN_PROGRESS_RE.test(raw)) return "incomplete_note";
  return null;
}

export function AgentChatMessageList({
  messages,
  messagesEndRef,
  resolvedBrandId,
  activeWorkspaceId,
  user,
  setMessages,
  logPlanLearningEvent,
}: {
  messages: ChatMessage[];
  messagesEndRef: RefObject<HTMLDivElement | null>;
  resolvedBrandId: string | null;
  activeWorkspaceId: string | null;
  user: User | null;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  logPlanLearningEvent: (eventType: "opened" | "completed", metadata?: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <div className="flex-1 min-full px-4 md:px-6 py-6 space-y-5 max-w-3xl mx-auto w-full">
      {messages.map((msg, msgIndex) => {
        let priorUserSnippet = "";
        for (let j = msgIndex - 1; j >= 0; j--) {
          if (messages[j].role === "user") {
            priorUserSnippet = (messages[j].content || "").slice(0, 500);
            break;
          }
        }
        const openLoop = msg.role === "assistant" ? assistantOpenLoop(msg) : null;
        const showWaitingRow =
          msg.role === "assistant" &&
          (openLoop === "awaiting_user" || openLoop === "incomplete_note");
        const hideStreamingBody = msg.role === "assistant" && !!msg.isStreaming;

        const displayTaskSteps =
          msg.role === "assistant" && msg.taskSteps && msg.taskSteps.length > 0
            ? msg.taskSteps
            : [];

        const rawContent = msg.content || "";
        let markdownForAssistant = rawContent;
        let sourcesFromFence: ReturnType<typeof extractAssistantSources>["attribution"] = null;
        if (msg.role === "assistant") {
          const parsed = extractAssistantSources(rawContent);
          markdownForAssistant = parsed.content;
          sourcesFromFence = parsed.attribution;
        }
        // Strip [SUGGEST:...] / [PLAN_ACTION:...] (and fences) so they never flash in markdown;
        // then strip trailing unclosed/empty code fences.
        // Also strip any unfenced `assistant_sources {...json...}` leak (model not honoring fence) and
        // any in-progress streaming fragment of an assistant_sources fence.
        const cleanedContent = markdownForAssistant
          .replace(/```[a-zA-Z0-9_-]*\s*\n?\s*\[(?:SUGGEST|PLAN_ACTION):[\s\S]*?\]\s*\n?\s*```/g, "")
          .replace(/`{0,3}\*{0,2}\[(?:SUGGEST|PLAN_ACTION):[\s\S]*?\]\*{0,2}`{0,3}/g, "")
          .replace(/```assistant_sources[\s\S]*?(?:```|$)/gi, "")
          .replace(/\bassistant_sources\s*\{[\s\S]*?\}\s*$/i, "")
          .replace(/\bassistant_sources\s*\{[\s\S]*?"sources"\s*:\s*\[[\s\S]*?\]\s*\}/gi, "")
          .replace(/```[a-zA-Z0-9_-]*\s*\n?\s*```/g, "")
          .replace(/\n*```[a-zA-Z0-9_-]*\s*$/g, "")
          .trimEnd();
        const contentForMarkdown =
          msg.role === "assistant" ? stripStillInProgressTail(cleanedContent) : cleanedContent;

        const sourceAttribution =
          msg.role === "assistant" && !msg.isStreaming
            ? msg.dataSourceAttribution?.dataBacked && msg.dataSourceAttribution.sources.length > 0
              ? msg.dataSourceAttribution
              : sourcesFromFence?.dataBacked && sourcesFromFence.sources.length > 0
                ? sourcesFromFence
                : msg.replyContract === "live_lookup"
                  ? { dataBacked: true, sources: [{ tier: "internal" as const, key: "live", label: "Connected apps" }] }
                  : null
            : null;

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={cn(
                "max-w-[80%] text-sm flex flex-col",
                msg.role === "user"
                  ? "rounded-2xl rounded-br-md bg-[#3B82F6]/10 text-foreground px-4 py-2.5"
                  : "rounded-2xl rounded-bl-md text-foreground px-1 py-1",
              )}
            >
              {msg.role === "assistant" ? (
                <div className="max-w-none text-foreground text-[14.5px] leading-[1.75]">
                  {!hideStreamingBody && msg.planContent && !msg.isStreaming && (
                    <div className="mb-2 inline-flex items-center rounded-full bg-primary/10 text-primary text-[11px] px-2 py-0.5">
                      📋 Strategic Plan
                    </div>
                  )}
                  {/* Live Lookup + Evidence-check badges removed: source credibility is shown
                      by the unified <AssistantSources /> component below. */}
                  {displayTaskSteps.length > 0 && (
                    <TaskStepsDisplay
                      steps={displayTaskSteps}
                      currentStepIndex={msg.currentStepIndex ?? -1}
                      isStreaming={msg.isStreaming}
                      startTime={msg.streamStartTime}
                      frozenElapsed={msg.elapsedSeconds}
                      openLoop={openLoop}
                    />
                  )}
                  {!hideStreamingBody && (!!msg.dashboardCards?.length || msg.dashboardOpeningSummary) && (
                    <ChatDashboardCards cards={msg.dashboardCards || []} openingSummary={msg.dashboardOpeningSummary} />
                  )}
                  {!hideStreamingBody && msg.createdEntity?.id && (
                    <a
                      href={`/app/workforce?tab=${msg.createdEntity.kind === "agent" ? "agents" : "employees"}`}
                      className="my-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent transition-colors no-underline"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {msg.createdEntity.kind === "agent" ? "✨ New Agent created" : "✨ New Employee created"}
                        </span>
                        <span className="text-sm font-semibold text-foreground">{msg.createdEntity.name}</span>
                      </div>
                      <span className="text-xs text-primary">Open →</span>
                    </a>
                  )}
                  {!hideStreamingBody && !!contentForMarkdown.trim() && (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildChatMarkdownComponents(msg) as any}>
                      {contentForMarkdown}
                    </ReactMarkdown>
                  )}
                  {!hideStreamingBody && (sourceAttribution || (msg.sources && msg.sources.length > 0)) && (
                    <AssistantSources attribution={sourceAttribution} detailedSources={msg.sources} />
                  )}
                  {showWaitingRow && (
                    <div className="flex flex-col items-start gap-2 py-2 mt-1">
                      <p className="text-sm text-muted-foreground leading-snug">Waiting for a reply to continue</p>
                      <BusinessBrainOrb
                        size={28}
                        animated={!!msg.isStreaming || openLoop === "awaiting_user"}
                      />
                    </div>
                  )}
                  {msg.reportContent && !msg.isStreaming && (
                    <TaskReportViewer
                      content={msg.reportContent}
                      savedToDb={msg.reportSavedToDb}
                      onSaveToDb={async (updatedContent) => {
                        await supabase.from("user_business_data").insert({
                          user_id: user!.id,
                          workspace_id: activeWorkspaceId || undefined,
                          data_type: "document",
                          source: "agent-report",
                          title: `Task Results — ${new Date().toLocaleDateString()}`,
                          content: updatedContent,
                          is_analyzed: true,
                        });
                      }}
                    />
                  )}
                  {msg.planContent && !msg.isStreaming && (
                    <TaskReportViewer
                      content={msg.planContent}
                      triggerLabel="Open Strategic Plan"
                      dialogTitle="Strategic Plan"
                      savedToDb={msg.planSavedToDb}
                      onOpened={() => {
                        void logPlanLearningEvent("opened", { confidence: msg.planConfidence || "unknown" });
                      }}
                      onSaveToDb={async (updatedContent) => {
                        await supabase.from("user_business_data").insert({
                          user_id: user!.id,
                          workspace_id: activeWorkspaceId || undefined,
                          data_type: "document",
                          source: "strategic-plan",
                          title: `Strategic Plan — ${new Date().toLocaleDateString()}`,
                          content: updatedContent,
                          is_analyzed: true,
                          metadata: {
                            plan_type: "strategic_plan",
                            confidence: msg.planConfidence || "unknown",
                            evidence_sources: msg.planEvidenceSources || [],
                            business_id: resolvedBrandId,
                          },
                        } as any);
                        await logPlanLearningEvent("completed", {
                          confidence: msg.planConfidence || "unknown",
                          evidenceCount: (msg.planEvidenceSources || []).length,
                        });
                        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, planSavedToDb: true } : m)));
                      }}
                    />
                  )}
                  {!msg.isStreaming &&
                    !openLoop &&
                    resolvedBrandId &&
                    (msg.content?.trim().length ?? 0) >= 30 &&
                    !msg.reportContent && (
                    <AssistantInsightFeedback
                      businessId={resolvedBrandId}
                      workspaceId={activeWorkspaceId}
                      assistantExcerpt={msg.content}
                      userContextSnippet={priorUserSnippet || undefined}
                      recorded={msg.insightFeedback}
                      onRecorded={(sentiment) => {
                        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, insightFeedback: sentiment } : m)));
                      }}
                    />
                  )}
                </div>
              ) : (
                <>
                  {(() => {
                    let display = msg.displayContent ?? msg.content;
                    // Strip graphic-format scaffolding (header may appear at start or mid-message)
                    const graphicHeaderIdx = display.indexOf("🎨 Output format:");
                    if (graphicHeaderIdx !== -1) {
                      const before = display.slice(0, graphicHeaderIdx).trimEnd();
                      // Try to recover the user's actual ask between the header block and the footer reminder
                      const sepMatch = display.match(/---\n\n([\s\S]*?)\n\n---\n\n🎨 Reminder/);
                      display = sepMatch ? (before ? `${before}\n\n${sepMatch[1].trim()}` : sepMatch[1].trim()) : before;
                    }
                    const refIdx = display.indexOf("\n\n--- http");
                    if (refIdx !== -1) display = display.slice(0, refIdx);
                    return display;
                  })()}
                  {msg.employees && msg.employees.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.employees.map((e) => (
                        <span key={e.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground/10 text-xs">
                          <UserIcon className="w-3 h-3" /> {e.name}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            {msg.role === "assistant" && !showWaitingRow && (
              <div className="mt-2 ml-2">
                <BusinessBrainOrb size={18} animated={false} />
              </div>
            )}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
