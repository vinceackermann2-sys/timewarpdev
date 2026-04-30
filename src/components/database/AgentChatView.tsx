import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bot,
  FileText,
  PanelRightClose,
  PanelRightOpen,
  PieChart,
  Presentation,
  Search,
  Settings,
  Table2,
  Users,
  X,
} from "lucide-react";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { useExtensionBridge } from "@/hooks/useExtensionBridge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useBusinessDNA } from "./BusinessDNAContext";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/agentChat/types";
import { isExplicitEmployeeComputerRequest } from "@/lib/agentChat/computerModePatterns";
import { useAgentChatTransports } from "@/hooks/useAgentChatTransports";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useProviderConnections } from "@/hooks/useProviderConnections";
import { useEmployeeManagement } from "@/hooks/useEmployeeManagement";
import { useChatPersistence } from "@/hooks/useChatPersistence";
import { processFiles, type UploadedFileChip } from "@/lib/agentChat/fileProcessing";
import { appendGraphicInstructionsToUserContent } from "@/lib/agentChat/graphicInstructions";
import { runGraphicGate } from "@/lib/agentChat/graphicGate";
import { createFetchWithTimeout } from "@/lib/agentChat/fetchWithTimeout";
import { insertReferenceIntoChatInput } from "@/lib/agentChat/mentionHelpers";
import type { MentionState } from "@/lib/agentChat/mentionHelpers";
import { AssistantSuggestions } from "./AssistantSuggestions";
import { ChatOnboardingFlow } from "./aiceo/ChatOnboardingFlow";
import { AgentChatMessageList } from "./chat/AgentChatMessageList";
import { AgentChatInput } from "./chat/AgentChatInput";
import { AgentChatSettingsModal } from "./chat/AgentChatSettingsModal";
import { CreateEmployeeDialog } from "./chat/CreateEmployeeDialog";

export function AgentChatView({
  activeBrandId,
  initialMessage,
  onInitialMessageConsumed,
  forceOnboarding,
  onboardingInitialUrl,
  onOnboardingComplete,
  onOnboardingActiveChange,
}: {
  activeBrandId?: string | null;
  initialMessage?: string | null;
  onInitialMessageConsumed?: () => void;
  forceOnboarding?: boolean;
  onboardingInitialUrl?: string | null;
  onOnboardingComplete?: (agentName: string, brandId: string, supercharge: boolean) => void;
  onOnboardingActiveChange?: (active: boolean) => void;
}) {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const { brands } = useBusinessDNA();
  const { extensionConnected, retryDetection, getPageContext, executeAction, signalStart, signalStop, updateOverlay } = useExtensionBridge();

  useProviderConnections(activeBrandId ?? undefined);

  const agents = brands.map((b) => ({ id: b.id, name: b.agentName || b.name || "AI" }));

  const {
    employees,
    handleDeleteEmployee,
    handleUpdateEmployee,
    showAddEmployee,
    setShowAddEmployee,
    addEmployeePrompt,
    setAddEmployeePrompt,
    isGeneratingEmployee,
    generatedEmployee,
    setGeneratedEmployee,
    handleGenerateEmployee,
    handleConfirmEmployee,
  } = useEmployeeManagement(user, activeWorkspaceId);

  const [isDropupOpen, setIsDropupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<string>>(new Set());
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [showEmployeesMenu, setShowEmployeesMenu] = useState(false);
  const [isActionMode, setIsActionMode] = useState(false);
  const [settingsTab, setSettingsTab] = useState("safety");
  const [showReference, setShowReference] = useState(false);
  const [showGraphicsMenu, setShowGraphicsMenu] = useState(false);
  const [selectedGraphic, setSelectedGraphic] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileChip[]>([]);
  const [referencedUrls, setReferencedUrls] = useState<{ id: string; url: string; name: string; logo: string }[]>([]);
  const [referenceUrlInput, setReferenceUrlInput] = useState("");
  const [mentionState, setMentionState] = useState<MentionState>({ active: false, node: null, startOffset: 0, endOffset: 0 });
  const [selectedChatEmployees, setSelectedChatEmployees] = useState<{ id: string; name: string; role: string }[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const [onboardingLocked, setOnboardingLocked] = useState<boolean>(!!forceOnboarding && messages.length === 0);
  useEffect(() => {
    if (forceOnboarding && messages.length === 0) {
      setOnboardingLocked(true);
    }
  }, [forceOnboarding, messages.length]);
  useEffect(() => {
    onOnboardingActiveChange?.(onboardingLocked);
  }, [onboardingLocked, onOnboardingActiveChange]);

  const [resumingTask, setResumingTask] = useState(false);
  const [resumableTask, setResumableTask] = useState<null | {
    continuationKey: string;
    phase: string;
    progress: number;
    continuationIndex: number;
    lastUserMessage?: string;
  }>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const STALL_TIMEOUT_MS = 90_000;
  const lastActivityRef = useRef<number>(0);
  const activeAssistantIdRef = useRef<string | null>(null);
  const stalledRef = useRef<boolean>(false);
  const stallIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isSending) return;
    const activeId = activeAssistantIdRef.current;
    if (!activeId) return;
    const active = messages.find((m) => m.id === activeId);
    if (!active) return;
    const sig =
      (active.content?.length || 0) +
      "|" +
      (active.taskSteps?.length || 0) +
      "|" +
      (active.taskSteps?.[active.taskSteps.length - 1]?.status || "");
    lastActivityRef.current = Date.now();
    void sig;
  }, [messages, isSending]);

  useEffect(() => {
    if (!isSending) {
      if (stallIntervalRef.current) {
        clearInterval(stallIntervalRef.current);
        stallIntervalRef.current = null;
      }
      return;
    }
    stallIntervalRef.current = setInterval(() => {
      if (stalledRef.current) return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed < STALL_TIMEOUT_MS) return;
      stalledRef.current = true;
      const assistantId = activeAssistantIdRef.current;
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch {
          /* noop */
        }
        abortControllerRef.current = null;
      }
      if (assistantId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;
            const updatedSteps = (m.taskSteps || []).map((s) =>
              s.status === "running" ? { ...s, status: "error" as const } : s,
            );
            updatedSteps.push({
              action: "error",
              label: "Stopped — no progress",
              status: "error" as const,
              detail: "The request stalled. Please try again.",
            });
            const baseContent =
              m.content && m.content.trim().length > 0
                ? m.content + "\n\n---\n⚠️ *This response stopped because it wasn't making progress. Please try again.*"
                : "⚠️ This message stopped because it wasn't making progress. Please try again.";
            return { ...m, content: baseContent, taskSteps: updatedSteps, isStreaming: false };
          }),
        );
      }
      toast.error("Message stopped — no progress. Try again.");
      setIsSending(false);
    }, 5000);
    return () => {
      if (stallIntervalRef.current) {
        clearInterval(stallIntervalRef.current);
        stallIntervalRef.current = null;
      }
    };
  }, [isSending]);

  const isMobileChatView = useIsMobile();
  const [showHistory, setShowHistory] = useState(false);
  useEffect(() => {
    if (!isMobileChatView) {
      setShowHistory(true);
    } else {
      setShowHistory(false);
    }
  }, [isMobileChatView]);

  const [sessionMemory, setSessionMemory] = useState("");
  const [sessionMemoryOpen, setSessionMemoryOpen] = useState(false);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const { activeChatId, handleSelectChat, handleNewChat, sidebarRefreshKey } = useChatPersistence({
    user,
    activeWorkspaceId,
    selectedAgent,
    sessionMemory,
    messages,
    setMessages,
    setSelectedAgent,
    setSelectedChatEmployees,
    setSessionMemory,
    setSessionMemoryOpen,
  });

  const initialMessageSentRef = useRef(false);
  const dropupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialMessage || initialMessageSentRef.current || isSending) return;
    const messageText = typeof initialMessage === "string" ? initialMessage : String(initialMessage ?? "");
    if (!messageText.trim()) return;
    const timer = setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.innerText = messageText;
        initialMessageSentRef.current = true;
        onInitialMessageConsumed?.();
        const sendBtn = document.querySelector("[data-send-btn]") as HTMLButtonElement;
        if (sendBtn) sendBtn.click();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [initialMessage, isSending, onInitialMessageConsumed]);

  const activeBrandForConnections = brands.find((b) => (b.agentName || b.name || "AI") === selectedAgent);
  const resolvedBrandId = activeBrandId || activeBrandForConnections?.id || null;

  const fetchResumableTask = useCallback(async () => {
    if (!user || isSending || document.visibilityState !== "visible") return;
    try {
      const { data: run } = await supabase
        .from("long_task_runs" as any)
        .select("id, continuation_key, task_type, status, phase, progress, logs, result_excerpt, error, updated_at, created_at")
        .eq("user_id", user.id)
        .in("status", ["queued", "in_progress"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!run || !["queued", "in_progress"].includes(String((run as { status?: string }).status || ""))) {
        setResumableTask(null);
        return;
      }

      const continuationKey = String((run as { continuation_key?: string }).continuation_key || "");
      const { data: cp } = await supabase
        .from("long_task_checkpoints" as any)
        .select("continuation_index, content, metadata, updated_at")
        .eq("continuation_key", continuationKey)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const cpRow = cp as { continuation_index?: number; metadata?: { lastUserMessage?: unknown } } | null;
      setResumableTask({
        continuationKey,
        phase: String((run as { phase?: string }).phase || "running"),
        progress: Number((run as { progress?: number }).progress || 0),
        continuationIndex: Number(cpRow?.continuation_index || 0),
        lastUserMessage:
          typeof cpRow?.metadata?.lastUserMessage === "string"
            ? (cpRow.metadata.lastUserMessage as string)
            : undefined,
      });
    } catch {
      /* best effort */
    }
  }, [user, isSending]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const scheduleFetch = () => {
      if (cancelled) return;
      void fetchResumableTask();
    };

    scheduleFetch();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleFetch();
      }
    };

    const t = window.setInterval(scheduleFetch, 15000);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, fetchResumableTask]);

  const logPlanLearningEvent = useCallback(
    async (eventType: "opened" | "completed", metadata?: Record<string, unknown>) => {
      if (!resolvedBrandId) return;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-learning-event`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            businessId: resolvedBrandId,
            workspaceId: activeWorkspaceId || undefined,
            cardId: "chat.strategic_plan",
            tab: "chat",
            eventType,
            source: "chat_strategic_plan",
            category: "planning",
            metadata: { theme: "strategic_plan", ...(metadata || {}) },
          }),
        });
      } catch {
        /* best effort */
      }
    },
    [resolvedBrandId, activeWorkspaceId],
  );

  useEffect(() => {
    if (activeBrandId) {
      const brand = brands.find((b) => b.id === activeBrandId);
      if (brand) setSelectedAgent(brand.agentName || brand.name || "AI");
    } else if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0].name);
    }
  }, [activeBrandId, brands, agents]);

  const fetchWithTimeout = useMemo(() => createFetchWithTimeout(abortControllerRef), []);

  const transport = useAgentChatTransports({
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
  });
  const { runAgentChat, runAgentChatWithBrowser, runEmployeeChat, runComputerMode } = transport;

  const autoRunEmployee = async (emp: { id: string; name: string; role: string }) => {
    if (isSending) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please log in first");
      return;
    }

    setIsActionMode(true);

    if (!extensionConnected) {
      toast.error("Browser extension not connected. Please install or enable the Timewarp extension to run employees.", { duration: 5000 });
      return;
    }

    setIsSending(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: `Run ${emp.name}: Execute the standard operating procedure.`,
      employees: [emp],
    };
    setMessages((prev) => [...prev, userMsg]);
    setSelectedChatEmployees([emp]);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", isStreaming: true, streamStartTime: Date.now() }]);
    activeAssistantIdRef.current = assistantId;
    stalledRef.current = false;
    lastActivityRef.current = Date.now();

    try {
      await runComputerMode(session, userMsg, assistantId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m;
          const updatedSteps = (m.taskSteps || []).map((s) => (s.status === "running" ? { ...s, status: "error" as const } : s));
          updatedSteps.push({ action: "error", label: `Failed: ${message}`, status: "error" as const });
          return { ...m, content: `⚠️ ${message || "Something went wrong. Please try again."}`, taskSteps: updatedSteps, isStreaming: false };
        }),
      );
    }
    setIsSending(false);
  };

  const handleSendMessage = async () => {
    if (isSending) return;
    const inputText = chatInputRef.current?.innerText?.trim() || "";
    if (!inputText && uploadedFiles.length === 0) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please log in first");
      return;
    }

    setIsSending(true);

    const fileResults = await processFiles(uploadedFiles, session, user!.id, (path, file) =>
      supabase.storage.from("business-data").upload(path, file),
    );

    let userContent = inputText;
    if (fileResults.length > 0) {
      userContent += `\n\n📎 Attached files:\n`;
      for (const f of fileResults) {
        userContent += `\n--- ${f.name} ---\n${f.content}\n`;
      }
    }
    if (referencedUrls.length > 0) {
      userContent += `\n\n🔗 Referenced URLs:`;
      const urlFetches = await Promise.allSettled(
        referencedUrls.map(async (r) => {
          try {
            const res = await fetchWithTimeout(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-content`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({ url: r.url, type: "url" }),
              },
              30000,
            );
            if (res.ok) {
              const data = await res.json();
              return { url: r.url, content: data.analyzed_content || data.content || "" };
            }
            return { url: r.url, content: "" };
          } catch {
            return { url: r.url, content: "" };
          }
        }),
      );
      for (const result of urlFetches) {
        if (result.status === "fulfilled" && result.value.content) {
          userContent += `\n\n--- ${result.value.url} ---\n${result.value.content.slice(0, 5000)}\n`;
        } else {
          const url = result.status === "fulfilled" ? result.value.url : "unknown";
          userContent += `\n${url} (could not fetch content)`;
        }
      }
    }
    let resolvedGraphic = selectedGraphic;
    if (!resolvedGraphic) {
      const gate = runGraphicGate(inputText);
      if (gate.suggestGraphic && gate.autoApply && gate.graphicType) {
        resolvedGraphic = gate.graphicType;
        toast.message(`Auto-generating ${gate.graphicType.toLowerCase()} output for this request.`);
      } else if (gate.suggestGraphic && gate.graphicType) {
        userContent += `\n\nIf a ${gate.graphicType.toLowerCase()} would clarify this answer, include the appropriate code block.`;
      }
    }
    const displayContent = userContent;
    userContent = appendGraphicInstructionsToUserContent(userContent, resolvedGraphic);

    const resolveEmployeeContext = (): { id: string; name: string; role: string }[] | undefined => {
      if (selectedChatEmployees.length > 0) return [...selectedChatEmployees];
      const lastEmpMsg = [...messages].reverse().find((m) => m.employees && m.employees.length > 0);
      if (lastEmpMsg?.employees && lastEmpMsg.employees.length > 0) return [...lastEmpMsg.employees];
      return undefined;
    };

    const selectedEmployeesForMessage = resolveEmployeeContext();

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userContent,
      displayContent,
      files: uploadedFiles.map((f) => ({ name: f.name })),
      employees: selectedEmployeesForMessage,
    };

    const hasSelectedEmployeeForMessage = (selectedEmployeesForMessage?.length ?? 0) > 0;
    const shouldUseEmployeeComputerMode =
      hasSelectedEmployeeForMessage && isActionMode && extensionConnected && isExplicitEmployeeComputerRequest(inputText);

    if (hasSelectedEmployeeForMessage && selectedChatEmployees.length === 0 && selectedEmployeesForMessage) {
      setSelectedChatEmployees(selectedEmployeesForMessage);
    }

    setMessages((prev) => [...prev, userMsg]);

    if (chatInputRef.current) chatInputRef.current.innerHTML = "";
    setUploadedFiles([]);
    setReferencedUrls([]);
    setSelectedGraphic(null);
    setMentionState({ active: false, node: null, startOffset: 0, endOffset: 0 });

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", isStreaming: true, streamStartTime: Date.now() }]);
    activeAssistantIdRef.current = assistantId;
    stalledRef.current = false;
    lastActivityRef.current = Date.now();

    try {
      const hasFiles = userMsg.files && userMsg.files.length > 0;

      if (hasFiles && hasSelectedEmployeeForMessage) {
        await runEmployeeChat(session, userMsg, assistantId);
      } else if (hasFiles) {
        await runAgentChat(session, userMsg, assistantId);
      } else if (shouldUseEmployeeComputerMode) {
        await runComputerMode(session, userMsg, assistantId);
      } else if (isActionMode && extensionConnected && !hasSelectedEmployeeForMessage) {
        await runAgentChatWithBrowser(session, userMsg, assistantId);
      } else if (hasSelectedEmployeeForMessage) {
        await runEmployeeChat(session, userMsg, assistantId);
      } else {
        await runAgentChat(session, userMsg, assistantId);
      }
    } catch (err: unknown) {
      console.error("Send error:", err);
      const errMessage = err instanceof Error ? err.message : "";
      const isCancelled = errMessage === "Cancelled";
      const errorMsg = isCancelled ? "Message cancelled" : errMessage || "Something went wrong";
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m;
          const updatedSteps = (m.taskSteps || []).map((s) => (s.status === "running" ? { ...s, status: "done" as const } : s));
          if (isCancelled) {
            updatedSteps.push({ action: "cancel", label: "Cancelled by user", status: "done" as const });
            if (m.content && m.content.trim().length > 5) {
              return { ...m, content: m.content + "\n\n---\n*⏹ Generation stopped by user*", taskSteps: updatedSteps, isStreaming: false };
            }
            return { ...m, content: "⏹ Message cancelled", taskSteps: updatedSteps, isStreaming: false };
          }
          updatedSteps.push({ action: "error", label: `Failed: ${errorMsg}`, status: "error" as const });
          if (m.content && m.content.trim().length > 20) {
            return {
              ...m,
              content: m.content + "\n\n---\n⚠️ *Response was cut short. Try again with a more specific request.*",
              taskSteps: updatedSteps,
              isStreaming: false,
            };
          }
          return { ...m, content: `⚠️ ${errorMsg}`, taskSteps: updatedSteps, isStreaming: false };
        }),
      );
    }

    setIsSending(false);
  };

  const handleCancelMessage = () => {
    stalledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleResumeLongTask = async () => {
    if (!resumableTask || isSending || resumingTask) return;
    const resumeEmployee =
      selectedChatEmployees[0] || [...messages].reverse().find((m) => m.employees && m.employees.length > 0)?.employees?.[0];
    if (!resumeEmployee) {
      toast.error("Select an employee to resume this task.");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please log in first");
      return;
    }
    setResumingTask(true);
    setIsSending(true);
    const resumePrompt = resumableTask.lastUserMessage
      ? `Continue exactly where you left off and finish this task:\n${resumableTask.lastUserMessage}`
      : "Continue exactly where you left off from the last checkpoint.";
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: resumePrompt,
      employees: [resumeEmployee],
    };
    setMessages((prev) => [...prev, userMsg]);
    setMessages((prev) => {
      const existing = prev.find((m) => m.id === resumableTask.continuationKey);
      if (existing) {
        return prev.map((m) =>
          m.id === resumableTask.continuationKey ? { ...m, isStreaming: true, streamStartTime: Date.now(), content: m.content || "" } : m,
        );
      }
      return [...prev, { id: resumableTask.continuationKey, role: "assistant", content: "", isStreaming: true, streamStartTime: Date.now() }];
    });
    activeAssistantIdRef.current = resumableTask.continuationKey;
    stalledRef.current = false;
    lastActivityRef.current = Date.now();
    try {
      await runEmployeeChat(session, userMsg, resumableTask.continuationKey);
      setResumableTask(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resume task");
    } finally {
      setIsSending(false);
      setResumingTask(false);
      void fetchResumableTask();
    }
  };

  const insertReference = (result: { url: string; name: string; logo: string }) => {
    if (!chatInputRef.current) return;
    insertReferenceIntoChatInput(chatInputRef.current, mentionState, result, () =>
      setMentionState({ active: false, node: null, startOffset: 0, endOffset: 0 }),
    );
  };

  const searchResults = useMemo(
    () =>
      referenceUrlInput.length > 2
        ? (() => {
            const cleanInput = referenceUrlInput.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
            const baseName = cleanInput.split(".")[0];
            return [
              { id: "1", url: `https://${cleanInput}`, name: cleanInput, logo: `https://www.google.com/s2/favicons?domain=${cleanInput}&sz=64` },
              { id: "2", url: `https://${baseName}.com`, name: `${baseName}.com`, logo: `https://www.google.com/s2/favicons?domain=${baseName}.com&sz=64` },
              { id: "3", url: `https://${baseName}.io`, name: `${baseName}.io`, logo: `https://www.google.com/s2/favicons?domain=${baseName}.io&sz=64` },
            ].filter((v, i, a) => a.findIndex((t) => t.name === v.name) === i);
          })()
        : [],
    [referenceUrlInput],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropupRef.current && !dropupRef.current.contains(event.target as Node)) {
        setIsDropupOpen(false);
        setShowEmployeesMenu(false);
        setShowReference(false);
        setShowGraphicsMenu(false);
      }
    }
    if (isDropupOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropupOpen]);

  const activeSubMenu = showReference ? "reference" : showGraphicsMenu ? "graphics" : showEmployeesMenu ? "employees" : null;

  const referenceSubContent = (
    <div className="py-2" onClick={(e) => e.stopPropagation()}>
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search website or app..."
            className="w-full border border-border/50 rounded-xl pl-9 pr-3 py-2.5 text-[16px] sm:text-sm focus:ring-0 focus:border-border outline-none transition-all placeholder-muted-foreground text-foreground bg-card"
            value={referenceUrlInput}
            onChange={(e) => setReferenceUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchResults.length > 0) {
                const result = searchResults[0];
                setReferencedUrls((prev) => [...prev, { id: Math.random().toString(), ...result }]);
                insertReference(result);
                setReferenceUrlInput("");
                setIsDropupOpen(false);
                setShowReference(false);
              }
            }}
            autoFocus
          />
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 flex flex-col gap-1 max-h-[200px] overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => {
                  setReferencedUrls((prev) => [...prev, { id: Math.random().toString(), ...result }]);
                  insertReference(result);
                  setReferenceUrlInput("");
                  setIsDropupOpen(false);
                  setShowReference(false);
                }}
                className="w-full flex items-center gap-3 p-2 hover:bg-muted/50 rounded-xl transition-colors text-left"
              >
                <img src={result.logo} alt="" className="w-8 h-8 rounded-full bg-card p-1 shadow-sm object-contain" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-semibold text-foreground truncate">{result.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{result.url}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const graphicsSubContent = (
    <div className="py-2 px-2">
      {[
        { label: "Document", icon: FileText, desc: "Generate a formatted document" },
        { label: "Graph", icon: BarChart3, desc: "Create a data visualization" },
        { label: "Analytics", icon: PieChart, desc: "Build an analytics report" },
        { label: "Spreadsheet", icon: Table2, desc: "Generate a spreadsheet" },
        { label: "Slide", icon: Presentation, desc: "Create a presentation slide" },
      ].map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            setSelectedGraphic(item.label);
            setIsDropupOpen(false);
            setShowGraphicsMenu(false);
          }}
          className={cn(
            "w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded-lg transition-colors flex items-center gap-3",
            selectedGraphic === item.label ? "bg-primary/10 text-primary" : "text-muted-foreground",
          )}
        >
          <item.icon className="w-4 h-4 shrink-0" />
          <div className="flex flex-col">
            <span className={cn("font-medium", selectedGraphic === item.label ? "text-primary" : "text-foreground")}>{item.label}</span>
            <span className="text-xs text-muted-foreground">{item.desc}</span>
          </div>
          {selectedGraphic === item.label && (
            <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">Selected</span>
          )}
        </button>
      ))}
    </div>
  );

  const employeesSubContent = (
    <div className="py-2 px-2">
      <div className="max-h-64 overflow-y-auto">
        {employees.length > 0 ? (
          employees.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => {
                const empData = { id: emp.id, name: emp.name, role: emp.role };
                if (!selectedChatEmployees.find((e) => e.id === emp.id)) {
                  setSelectedChatEmployees([empData]);
                }
                setIsDropupOpen(false);
                setShowEmployeesMenu(false);
                setTimeout(() => void autoRunEmployee(empData), 100);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded-lg transition-colors text-muted-foreground flex flex-col"
            >
              <span className="font-medium text-foreground">{emp.name}</span>
              <span className="text-xs text-muted-foreground">{emp.role}</span>
            </button>
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-muted-foreground text-center">No employees added</div>
        )}
      </div>
      <div className="border-t border-border mt-1 pt-1">
        <button
          type="button"
          onClick={() => {
            setIsSettingsOpen(true);
            setSettingsTab("employees");
            setIsDropupOpen(false);
            setShowEmployeesMenu(false);
          }}
          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded-lg transition-colors text-primary font-medium flex items-center gap-2"
        >
          <Settings className="w-3 h-3" />
          Manage Employees
        </button>
      </div>
    </div>
  );

  const handleMentionInput = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      const offset = range.startOffset;
      const textBeforeCursor = text.slice(0, offset);
      const match = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);
      if (match) {
        setMentionState({ active: true, node, startOffset: offset - match[1].length - 1, endOffset: offset });
        setReferenceUrlInput(match[1]);
        setIsDropupOpen(true);
        setShowReference(true);
      } else if (mentionState.active) {
        setMentionState({ active: false, node: null, startOffset: 0, endOffset: 0 });
        setShowReference(false);
        setIsDropupOpen(false);
      }
    }
  };

  const onInsertReferenceFromInput = (result: { url: string; name: string; logo: string }) => {
    setReferencedUrls((prev) => [...prev, { id: Math.random().toString(), ...result }]);
    insertReference(result);
    setReferenceUrlInput("");
    setIsDropupOpen(false);
    setShowReference(false);
  };

  const isOnboardingActive = !hasMessages && (forceOnboarding || onboardingLocked);

  const composerSuggestionOverlay =
    !isOnboardingActive && hasMessages
      ? (() => {
          const lastAssistant = [...messages].reverse().find(
            (m) => m.role === "assistant" && !m.isStreaming && m.suggestions && m.suggestions.length > 0,
          );
          if (!lastAssistant || dismissedSuggestionIds.has(lastAssistant.id)) return null;
          return (
            <div className="absolute inset-x-3 sm:inset-x-4 md:inset-x-6 bottom-3 sm:bottom-4 md:bottom-6 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <AssistantSuggestions
                suggestions={lastAssistant.suggestions!}
                variant="overlay"
                title={lastAssistant.suggestionTitle}
                onSelect={(suggestion) => {
                  setDismissedSuggestionIds((prev) => new Set(prev).add(lastAssistant.id));
                  const mapped = lastAssistant.planActionPayloads?.[suggestion];
                  if (chatInputRef.current) {
                    chatInputRef.current.innerText = mapped || suggestion;
                    chatInputRef.current.focus();
                  }
                  setTimeout(() => void handleSendMessage(), 0);
                }}
                onDismiss={() => {
                  setDismissedSuggestionIds((prev) => new Set(prev).add(lastAssistant.id));
                }}
                onCustom={(value) => {
                  setDismissedSuggestionIds((prev) => new Set(prev).add(lastAssistant.id));
                  if (chatInputRef.current) {
                    chatInputRef.current.innerText = value;
                    chatInputRef.current.focus();
                  }
                  setTimeout(() => void handleSendMessage(), 0);
                }}
              />
            </div>
          );
        })()
      : null;

  return (
    <div className="h-full min-h-0 w-full flex relative overflow-hidden bg-background">
      <div className="flex-1 flex h-full min-h-0 flex-col overflow-hidden bg-background">
        <header className="shrink-0 z-20 flex justify-center items-center py-3 backdrop-blur-md bg-background">
          {!isOnboardingActive && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="absolute right-4 p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              title={showHistory ? "Hide chat history" : "Show chat history"}
            >
              {showHistory ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          )}
          <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground">
            <Bot className="w-4 h-4 text-muted-foreground" />
            {selectedAgent || "AI"}
          </div>
        </header>

        <main ref={chatContainerRef} className="flex-1 min-h-0 flex flex-col relative z-10 overflow-y-auto overscroll-contain bg-background">
          {resumableTask && !isSending && (
            <div className="max-w-3xl mx-auto w-full px-4 md:px-6 pt-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Long task available to resume</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Phase: {resumableTask.phase} · Progress: {Math.max(0, Math.min(100, Math.round(resumableTask.progress)))}% · Checkpoint #
                    {resumableTask.continuationIndex}
                  </p>
                </div>
                <Button size="sm" onClick={() => void handleResumeLongTask()} disabled={resumingTask}>
                  {resumingTask ? "Resuming..." : "Resume Long Task"}
                </Button>
              </div>
            </div>
          )}
          {!hasMessages && (forceOnboarding || onboardingLocked) ? (
            <ChatOnboardingFlow
              initialUrl={onboardingInitialUrl}
              onComplete={(agentName, brandId, supercharge, transcript) => {
                const seeded: ChatMessage[] = transcript.map((m, i) => ({
                  id: `onb-${Date.now()}-${i}`,
                  role: m.role,
                  content: m.content,
                }));
                setMessages(seeded);
                if (agentName) setSelectedAgent(agentName);
                setOnboardingLocked(false);
                onOnboardingComplete?.(agentName, brandId, supercharge);
              }}
            />
          ) : !hasMessages ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4 bg-background">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 animate-in fade-in zoom-in duration-700">
                <BusinessBrainOrb size={typeof window !== "undefined" && window.innerWidth < 640 ? 180 : 280} />
              </div>
              <div className="mt-6 sm:mt-8 text-center z-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{selectedAgent}</h2>
                <p className="text-muted-foreground mt-2 font-medium text-sm sm:text-base">Ready to assist you</p>
              </div>
            </div>
          ) : (
            <AgentChatMessageList
              messages={messages}
              messagesEndRef={messagesEndRef}
              resolvedBrandId={resolvedBrandId}
              activeWorkspaceId={activeWorkspaceId}
              user={user}
              setMessages={setMessages}
              logPlanLearningEvent={logPlanLearningEvent}
            />
          )}
        </main>

        {!isOnboardingActive && (
        <AgentChatInput
          dropupRef={dropupRef}
          fileInputRef={fileInputRef}
          chatInputRef={chatInputRef}
          isMobileChatView={isMobileChatView}
          isDropupOpen={isDropupOpen}
          setIsDropupOpen={setIsDropupOpen}
          sessionMemoryOpen={sessionMemoryOpen}
          setSessionMemoryOpen={setSessionMemoryOpen}
          sessionMemory={sessionMemory}
          setSessionMemory={setSessionMemory}
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          selectedChatEmployees={selectedChatEmployees}
          setSelectedChatEmployees={setSelectedChatEmployees}
          selectedGraphic={selectedGraphic}
          setSelectedGraphic={setSelectedGraphic}
          isActionMode={isActionMode}
          setIsActionMode={setIsActionMode}
          extensionConnected={extensionConnected}
          onRetryExtensionDetection={retryDetection}
          showReference={showReference}
          setShowReference={setShowReference}
          showGraphicsMenu={showGraphicsMenu}
          setShowGraphicsMenu={setShowGraphicsMenu}
          showEmployeesMenu={showEmployeesMenu}
          setShowEmployeesMenu={setShowEmployeesMenu}
          setIsSettingsOpen={setIsSettingsOpen}
          isSending={isSending}
          mentionState={mentionState}
          setMentionState={setMentionState}
          referenceUrlInput={referenceUrlInput}
          setReferenceUrlInput={setReferenceUrlInput}
          searchResults={searchResults}
          onInsertReference={onInsertReferenceFromInput}
          onSend={() => void handleSendMessage()}
          onCancel={handleCancelMessage}
          onInputForMention={handleMentionInput}
          activeSubMenu={activeSubMenu}
          referenceSubContent={referenceSubContent}
          graphicsSubContent={graphicsSubContent}
          employeesSubContent={employeesSubContent}
        />
        )}

        <AgentChatSettingsModal
          open={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          agents={agents}
          selectedAgent={selectedAgent}
          setSelectedAgent={setSelectedAgent}
          brands={brands}
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          employees={employees}
          onDeleteEmployee={handleDeleteEmployee}
          onUpdateEmployee={handleUpdateEmployee}
          onOpenAddEmployee={() => setShowAddEmployee(true)}
        />

        <CreateEmployeeDialog
          open={showAddEmployee}
          onClose={() => {
            setShowAddEmployee(false);
            setAddEmployeePrompt("");
            setGeneratedEmployee(null);
          }}
          addEmployeePrompt={addEmployeePrompt}
          setAddEmployeePrompt={setAddEmployeePrompt}
          isGeneratingEmployee={isGeneratingEmployee}
          generatedEmployee={generatedEmployee}
          setGeneratedEmployee={setGeneratedEmployee}
          onGenerate={() => void handleGenerateEmployee()}
          onConfirm={() => void handleConfirmEmployee()}
        />
      </div>

      {showHistory && !isMobileChatView && !isOnboardingActive && (
        <div className="hidden md:block shrink-0 h-[calc(100%-16px)] my-2 mr-2">
          <ChatHistorySidebar activeChatId={activeChatId} onSelectChat={handleSelectChat} onNewChat={handleNewChat} />
        </div>
      )}

      {isMobileChatView && !isOnboardingActive && (
        <Sheet open={showHistory} onOpenChange={setShowHistory}>
          <SheetContent side="right" className="w-[85vw] max-w-sm p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Chat History</SheetTitle>
            </SheetHeader>
            <ChatHistorySidebar
              activeChatId={activeChatId}
              onSelectChat={(session) => {
                handleSelectChat(session);
                setShowHistory(false);
              }}
              onNewChat={() => {
                handleNewChat();
                setShowHistory(false);
              }}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
