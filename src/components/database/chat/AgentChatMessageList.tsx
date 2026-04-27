import type { RefObject } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User as UserIcon } from "lucide-react";
import { TaskStepsDisplay } from "@/components/database/TaskStepsDisplay";
import { ChatDashboardCards } from "@/components/database/ChatDashboardCards";
import { ThinkingTimer } from "@/components/database/ThinkingTimer";
import { ProgressiveLoader } from "@/components/ui/progressive-loader";
import { InlineChatAnalytics } from "@/components/database/InlineChatAnalytics";
import { InlineDocument, InlineSpreadsheet, InlineSlide } from "@/components/database/InlineChatGraphics";
import { AssistantInsightFeedback } from "@/components/database/AssistantInsightFeedback";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { buildLiveCitationAnchor } from "@/components/chat/liveCitationAnchor";
import type { ChatMessage } from "@/lib/agentChat/types";
import { TaskReportViewer } from "./TaskReportViewer";

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
        const displayTaskSteps =
          msg.role === "assistant"
            ? msg.taskSteps && msg.taskSteps.length > 0
              ? msg.taskSteps
              : msg.isStreaming
                ? [{ action: "process", label: "Starting request", status: "running" as const }]
                : []
            : [];

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-5 py-3 text-sm flex flex-col",
                msg.role === "user" ? "bg-[#e5e7eb] text-foreground rounded-br-md" : "rounded-bl-md text-foreground",
              )}
            >
              {msg.role === "assistant" ? (
                <div className="max-w-none text-foreground text-[14.5px] leading-[1.75]">
                  {msg.planContent && !msg.isStreaming && (
                    <div className="mb-2 inline-flex items-center rounded-full bg-primary/10 text-primary text-[11px] px-2 py-0.5">
                      📋 Strategic Plan
                    </div>
                  )}
                  {msg.replyContract === "live_lookup" && !msg.isStreaming && (
                    <div className="mb-2 inline-flex items-center rounded-full bg-sky-100 text-sky-700 text-[11px] px-2 py-0.5">
                      🔎 Live Lookup
                    </div>
                  )}
                  {msg.evidenceAudit?.status === "warn" && !msg.isStreaming && (
                    <div className="mb-2 inline-flex items-center rounded-full bg-amber-100 text-amber-700 text-[11px] px-2 py-0.5">
                      ⚠ Evidence check: {msg.evidenceAudit.warnings[0] || "Needs stronger grounding"}
                    </div>
                  )}
                  {displayTaskSteps.length > 0 && (
                    <TaskStepsDisplay
                      steps={displayTaskSteps}
                      currentStepIndex={msg.currentStepIndex ?? -1}
                      isStreaming={msg.isStreaming}
                      startTime={msg.streamStartTime}
                      frozenElapsed={msg.elapsedSeconds}
                    />
                  )}
                  {(!!msg.dashboardCards?.length || msg.dashboardOpeningSummary) && (
                    <ChatDashboardCards cards={msg.dashboardCards || []} openingSummary={msg.dashboardOpeningSummary} />
                  )}
                  {msg.content && (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <h1 className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold text-foreground mt-6 mb-3 first:mt-0">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-[15px] font-semibold text-foreground mt-5 mb-2 first:mt-0">{children}</h3>,
                        p: ({ children }) => <p className="mb-4 last:mb-0 leading-[1.8] text-foreground/90">{children}</p>,
                        ul: ({ children }) => <ul className="my-4 pl-6 space-y-2 list-disc marker:text-foreground/40">{children}</ul>,
                        ol: ({ children }) => <ol className="my-4 pl-6 space-y-2 list-decimal marker:text-foreground/40">{children}</ol>,
                        li: ({ children }) => <li className="leading-[1.7] text-foreground/90 pl-1">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                        blockquote: ({ children }) => (
                          <blockquote className="my-4 pl-4 border-l-2 border-primary/30 text-foreground/70 italic">{children}</blockquote>
                        ),
                        hr: () => <hr className="my-6 border-border/50" />,
                        code: ({ children, className }) => {
                          const text = String(children).replace(/\n$/, "");
                          if (className?.includes("language-chart") || className?.includes("language-graph")) {
                            return <InlineChatAnalytics jsonString={text} />;
                          }
                          if (className?.includes("language-document")) {
                            return <InlineDocument jsonString={text} />;
                          }
                          if (className?.includes("language-analytics")) {
                            return <InlineChatAnalytics jsonString={text} />;
                          }
                          if (className?.includes("language-spreadsheet")) {
                            return <InlineSpreadsheet jsonString={text} />;
                          }
                          if (className?.includes("language-slide")) {
                            return <InlineSlide jsonString={text} />;
                          }
                          const isBlock = className?.includes("language-");
                          return isBlock ? (
                            <code className={cn("block", className)}>{children}</code>
                          ) : (
                            <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] font-mono text-foreground/80">{children}</code>
                          );
                        },
                        pre: ({ children }) => {
                          const child = children as { props?: { className?: string } };
                          const cls = child?.props?.className || "";
                          if (
                            cls.includes("language-chart") ||
                            cls.includes("language-graph") ||
                            cls.includes("language-document") ||
                            cls.includes("language-analytics") ||
                            cls.includes("language-spreadsheet") ||
                            cls.includes("language-slide")
                          ) {
                            return <>{children}</>;
                          }
                          return <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4 text-[13px]">{children}</pre>;
                        },
                        table: ({ children }) => (
                          <div className="my-4 overflow-x-auto rounded-lg border border-border/50">
                            <table className="w-full text-sm">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="bg-muted/50 border-b border-border/50">{children}</thead>,
                        th: ({ children }) => <th className="px-4 py-2.5 text-left font-semibold text-foreground text-[13px]">{children}</th>,
                        td: ({ children }) => <td className="px-4 py-2.5 border-t border-border/30 text-foreground/80">{children}</td>,
                        a: buildLiveCitationAnchor(msg.liveSourceRegistry),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                  {msg.isStreaming && !msg.content && displayTaskSteps.length === 0 && (
                    <div className="flex items-center gap-3 py-2">
                      <ProgressiveLoader text="Thinking" textClassName="text-lg font-semibold" />
                      {msg.streamStartTime && (
                        <ThinkingTimer
                          startTime={msg.streamStartTime}
                          stopped={!msg.isStreaming}
                          frozenElapsed={msg.elapsedSeconds}
                          className="text-xs"
                        />
                      )}
                    </div>
                  )}
                  {msg.isStreaming && msg.content && displayTaskSteps.length === 0 && (
                    <span className="inline-block w-1.5 h-4 bg-foreground/50 animate-pulse ml-0.5" />
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
                  {!msg.isStreaming && resolvedBrandId && (msg.content?.trim().length ?? 0) >= 30 && !msg.reportContent && (
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
                    let display = msg.content;
                    const graphicIdx = display.indexOf("\n\n🎨 Output format:");
                    if (graphicIdx !== -1) display = display.slice(0, graphicIdx);
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
            {msg.role === "assistant" && (
              <div className="mt-2 ml-2">
                <BusinessBrainOrb size={18} animated={!!msg.isStreaming} />
              </div>
            )}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
