import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Settings,
  TrendingUp,
  Megaphone,
  DollarSign,
  Mail,
  BarChart2,
  Rocket
} from "lucide-react";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { useExtensionBridge } from "@/hooks/useExtensionBridge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useBusinessDNA } from "./BusinessDNAContext";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import type { ChatMessage, GoalState } from "@/lib/agentChat/types";
import { useAssistantChat } from "@/hooks/useAssistantChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useProviderConnections } from "@/hooks/useProviderConnections";
import { useEmployeeManagement } from "@/hooks/useEmployeeManagement";
import { useChatPersistence } from "@/hooks/useChatPersistence";
import { processFiles, type UploadedFileChip } from "@/lib/agentChat/fileProcessing";
import { runAgentLoop } from "@/lib/agentChat/agentLoop";
import { createFetchWithTimeout } from "@/lib/agentChat/fetchWithTimeout";
import { insertReferenceIntoChatInput } from "@/lib/agentChat/mentionHelpers";
import type { MentionState } from "@/lib/agentChat/mentionHelpers";
import { AssistantSuggestions } from "./AssistantSuggestions";
import { ChatOnboardingFlow } from "./aiceo/ChatOnboardingFlow";
import { AgentChatMessageList } from "./chat/AgentChatMessageList";
import { AgentChatInput } from "./chat/AgentChatInput";
import { AgentChatSettingsModal } from "./chat/AgentChatSettingsModal";
import { CreateEmployeeDialog } from "./chat/CreateEmployeeDialog";

const typewriterPhrases = [
  "banging out today?",
  "crushing today?",
  "shipping today?",
  "automating today?",
  "scaling today?",
  "launching today?",
  "dominating today?"
];

function TypewriterEffect() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = typewriterPhrases[phraseIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting && text === currentPhrase) {
      timeout = setTimeout(() => setIsDeleting(true), 2500);
    } else if (isDeleting && text === "") {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % typewriterPhrases.length);
    } else {
      const delay = isDeleting ? 30 : 70;
      timeout = setTimeout(() => {
        setText(currentPhrase.substring(0, text.length + (isDeleting ? -1 : 1)));
      }, delay);
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIndex]);

  return (
    <span className="text-foreground relative inline-block min-w-[200px]">
      {text}
      <span className="absolute -right-[4px] top-[10%] h-[80%] w-[3px] bg-foreground/80 animate-[pulse_1s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
    </span>
  );
}

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
  onOnboardingComplete?: (agentName: string, brandId: string) => void;
  onOnboardingActiveChange?: (active: boolean) => void;
}) {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const { brands } = useBusinessDNA();
  const { extensionConnected, retryDetection, getPageContext, executeAction, signalStart, signalStop, updateOverlay, cancelPending } = useExtensionBridge();

  useProviderConnections(activeBrandId ?? undefined, activeWorkspaceId ?? undefined);

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
  const [userStartedTyping, setUserStartedTyping] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [isActionMode, setIsActionMode] = useState(false);
  const [isPlanMode, setIsPlanMode] = useState(false);
  const [settingsTab, setSettingsTab] = useState("safety");
  const [showReference, setShowReference] = useState(false);
  const [showGraphicsMenu, setShowGraphicsMenu] = useState(false);
  const [showEmployeesMenu, setShowEmployeesMenu] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileChip[]>([]);
  const [referencedUrls, setReferencedUrls] = useState<{ id: string; url: string; name: string; logo: string }[]>([]);
  const [referenceUrlInput, setReferenceUrlInput] = useState("");
  const [referenceSearchResults, setReferenceSearchResults] = useState<{ id: string; url: string; name: string; logo: string }[]>([]);
  const [referenceSearchLoading, setReferenceSearchLoading] = useState(false);
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
  const cancelledRef = useRef<boolean>(false);
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
    // Seed activity timestamp the moment a send starts so the watchdog doesn't
    // immediately trip on a stale (or zero) lastActivityRef before the
    // assistant message is registered.
    lastActivityRef.current = Date.now();
    stalledRef.current = false;
    stallIntervalRef.current = setInterval(() => {
      if (stalledRef.current) return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed < STALL_TIMEOUT_MS) return;
      stalledRef.current = true;
      cancelledRef.current = true;
      const assistantId = activeAssistantIdRef.current;
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch {
          /* noop */
        }
        abortControllerRef.current = null;
      }
      try { cancelPending?.(); } catch { /* noop */ }
      try { signalStop("agent"); } catch { /* noop */ }
      try { updateOverlay({ visible: false }); } catch { /* noop */ }
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

  const { activeChatId, setGoalState, handleSelectChat, handleNewChat, sidebarRefreshKey } = useChatPersistence({
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

  const fetchWithTimeout = useMemo(() => createFetchWithTimeout(abortControllerRef), []);
  const edgeBaseUrl = useMemo(() => {
    const envBase = String(import.meta.env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const clientBase = String((supabase as any)?.supabaseUrl || "").trim().replace(/\/+$/, "");
    // Prefer runtime client config; env can be stale in deployed builds.
    return clientBase || envBase;
  }, []);

  const logPlanLearningEvent = useCallback(
    async (eventType: "opened" | "completed", metadata?: Record<string, unknown>) => {
      if (!resolvedBrandId) return;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;
        await fetch(`${edgeBaseUrl}/functions/v1/dashboard-learning-event`, {
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
    [resolvedBrandId, activeWorkspaceId, edgeBaseUrl],
  );

  useEffect(() => {
    if (activeBrandId) {
      const brand = brands.find((b) => b.id === activeBrandId);
      if (brand) setSelectedAgent(brand.agentName || brand.name || "AI");
    } else if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0].name);
    }
  }, [activeBrandId, brands, agents]);


  useEffect(() => {
    if (referenceUrlInput.trim().length < 3) {
      setReferenceSearchResults([]);
      return;
    }
    const handle = setTimeout(() => {
      void (async () => {
        setReferenceSearchLoading(true);
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) return;
          const res = await fetchWithTimeout(
            `${edgeBaseUrl}/functions/v1/reference-search`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({ q: referenceUrlInput.trim() }),
            },
            45_000,
          );
          if (res.ok) {
            const data = (await res.json()) as { results?: { id: string; url: string; name: string; logo: string }[] };
            setReferenceSearchResults(Array.isArray(data.results) ? data.results : []);
          } else {
            setReferenceSearchResults([]);
          }
        } catch {
          setReferenceSearchResults([]);
        } finally {
          setReferenceSearchLoading(false);
        }
      })();
    }, 450);
    return () => clearTimeout(handle);
  }, [referenceUrlInput, fetchWithTimeout, edgeBaseUrl]);

  const transport = useAssistantChat({
    messages,
    setMessages,
    brands,
    selectedAgent,
    activeWorkspaceId,
    sessionMemory,
    user,
    supabase,
    fetchWithTimeout,
    extension: { getPageContext, executeAction, signalStart, signalStop, updateOverlay, cancelPending },
    cancelledRef,
    planMode: isPlanMode,
  });
  const { runAgentChat, runAgentChatWithBrowser, runEmployeeChat, runComputerMode } = transport;

  const autoRunEmployee = async (emp: { id: string; name: string; role: string }) => {
    if (isSending) return;
    cancelledRef.current = false;
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

    const runGoal: GoalState = {
      id: crypto.randomUUID(),
      type: "action",
      summary: `Run ${emp.name}`,
      status: "active",
      requiresConclusion: true,
      dataTier: "mixed",
      createdAt: new Date().toISOString(),
    };
    setGoalState(runGoal);

    try {
      await runAgentLoop({
        session,
        userMsg,
        assistantId,
        isActionMode: true,
        extensionConnected,
        transport: { runAgentChat, runAgentChatWithBrowser, runEmployeeChat, runComputerMode },
      });
      setGoalState((g) => (g ? { ...g, status: "completed" } : null));
    } catch (err: unknown) {
      setGoalState(null);
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

  const handleSendMessage = async (overrideText?: string) => {
    if (isSending) return;
    cancelledRef.current = false;
    const inputText = (overrideText ?? chatInputRef.current?.innerText ?? "").trim();
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
              `${edgeBaseUrl}/functions/v1/analyze-content`,
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
    const displayContent = userContent;

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

    if (hasSelectedEmployeeForMessage && selectedChatEmployees.length === 0 && selectedEmployeesForMessage) {
      setSelectedChatEmployees(selectedEmployeesForMessage);
    }

    setMessages((prev) => [...prev, userMsg]);

    // Dismiss any active clarifying-question / suggestion overlay since the
    // user has now answered. Without this, the questions panel lingers above
    // the composer after sending.
    {
      const lastAssistantWithPrompt = [...messages].reverse().find(
        (m) =>
          m.role === "assistant" &&
          !m.isStreaming &&
          ((m.suggestionQuestions && m.suggestionQuestions.length > 0) || (m.suggestions && m.suggestions.length > 0)),
      );
      if (lastAssistantWithPrompt) {
        setDismissedSuggestionIds((prev) => {
          const next = new Set(prev);
          next.add(lastAssistantWithPrompt.id);
          return next;
        });
      }
    }

    if (chatInputRef.current) chatInputRef.current.innerHTML = "";
    setUploadedFiles([]);
    setReferencedUrls([]);
    setMentionState({ active: false, node: null, startOffset: 0, endOffset: 0 });

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", isStreaming: true, streamStartTime: Date.now() }]);
    activeAssistantIdRef.current = assistantId;
    stalledRef.current = false;
    lastActivityRef.current = Date.now();

    const activeGoal: GoalState = {
      id: crypto.randomUUID(),
      type: "analysis",
      summary: inputText.slice(0, 160) || "Chat",
      status: "active",
      requiresConclusion: true,
      dataTier: "mixed",
      createdAt: new Date().toISOString(),
    };
    setGoalState(activeGoal);

    try {
      await runAgentLoop({
        session,
        userMsg,
        assistantId,
        isActionMode,
        extensionConnected,
        transport: { runAgentChat, runAgentChatWithBrowser, runEmployeeChat, runComputerMode },
      });
      setGoalState((g) => (g ? { ...g, status: "completed" } : null));
    } catch (err: unknown) {
      console.error("Send error:", err);
      const errMessage = err instanceof Error ? err.message : "";
      const isCancelled = errMessage === "Cancelled";
      setGoalState(null);
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
    cancelledRef.current = true;
    // Abort any in-flight fetch (chat SSE / step request).
    if (abortControllerRef.current) {
      try { abortControllerRef.current.abort(); } catch { /* noop */ }
      abortControllerRef.current = null;
    }
    // Resolve any pending extension promises immediately so the loop unwinds.
    try { cancelPending?.(); } catch { /* noop */ }
    // Tell the extension to stop and close the grouped tab.
    try { signalStop("agent"); } catch { /* noop */ }
    const lastEmp = [...messages].reverse().find((m) => m.employees && m.employees.length > 0)?.employees?.[0];
    if (lastEmp?.id) { try { signalStop(lastEmp.id); } catch { /* noop */ } }
    try { updateOverlay({ visible: false }); } catch { /* noop */ }
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

  const searchResults = referenceSearchResults;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropupRef.current && !dropupRef.current.contains(event.target as Node)) {
        setIsDropupOpen(false);
        setShowReference(false);
      }
    }
    if (isDropupOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropupOpen]);

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
        {referenceSearchLoading && referenceUrlInput.length > 2 && (
          <div className="mt-2 text-xs text-muted-foreground px-1">Searching the web…</div>
        )}
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

  const activeComposerPrompt =
    !isOnboardingActive && hasMessages && !userStartedTyping
      ? [...messages].reverse().find(
          (m) =>
            m.role === "assistant" &&
            !m.isStreaming &&
            !dismissedSuggestionIds.has(m.id) &&
            ((m.suggestionQuestions && m.suggestionQuestions.length > 0) || (m.suggestions && m.suggestions.length > 0)),
        )
      : null;
  const composerHasQuestions = !!activeComposerPrompt?.suggestionQuestions?.length;

  const composerSuggestionOverlay = activeComposerPrompt
      ? (() => {
          const lastAssistant = activeComposerPrompt;
          return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <AssistantSuggestions
                questions={lastAssistant.suggestionQuestions}
                suggestions={lastAssistant.suggestions}
                title={lastAssistant.suggestionTitle}
                variant="overlay"
                onSelect={(suggestion) => {
                  // Don't dismiss — let the next assistant reply replace these chips.
                  // Chips persist until the user starts typing or explicitly dismisses.
                  const mapped = lastAssistant.planActionPayloads?.[suggestion];
                  const textToSend = (mapped || suggestion || "").trim();
                  if (!textToSend) return;
                  if (chatInputRef.current) chatInputRef.current.innerHTML = "";
                  setUserStartedTyping(false);
                  setTimeout(() => void handleSendMessage(textToSend), 0);
                }}
                onDismiss={() => {
                  setDismissedSuggestionIds((prev) => new Set(prev).add(lastAssistant.id));
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

        <main ref={chatContainerRef} className={`relative z-10 overflow-y-auto overscroll-contain bg-background ${hasMessages ? "flex-1 min-h-0 flex flex-col" : "hidden"}`}>
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
          {hasMessages && (
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

        {!hasMessages && (forceOnboarding || onboardingLocked) && (
          <div className="flex-1 min-h-0 overflow-y-auto bg-background">
            <ChatOnboardingFlow
              initialUrl={onboardingInitialUrl}
              onComplete={(agentName, brandId, transcript) => {
                const seeded: ChatMessage[] = transcript.map((m, i) => ({
                  id: `onb-${Date.now()}-${i}`,
                  role: m.role,
                  content: m.content,
                }));
                setMessages(seeded);
                if (agentName) setSelectedAgent(agentName);
                setOnboardingLocked(false);
                onOnboardingComplete?.(agentName, brandId);
              }}
            />
          </div>
        )}

        {!hasMessages && !(forceOnboarding || onboardingLocked) && (
          <div className="flex-1 flex flex-col justify-end items-center px-4 pb-6 bg-background">
            <div className="px-3 py-1 rounded-full border border-border/50 text-xs font-medium text-muted-foreground bg-muted/20 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
              Free plan &nbsp;|&nbsp; <span className="text-primary font-semibold cursor-pointer">Upgrade to Pro</span>
            </div>
            <div className="flex items-center gap-3 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
              <BusinessBrainOrb size={36} />
              <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">What are we <TypewriterEffect /></h2>
            </div>
          </div>
        )}

        {!isOnboardingActive && (
        <AgentChatInput
          composerOverlay={composerSuggestionOverlay}
          hideComposerBar={composerHasQuestions}
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
          contextTokens={Math.round(
            (messages.reduce((acc, m) => acc + (m.content?.length || 0), 0) + sessionMemory.length) / 4,
          )}
          contextTokenLimit={1_000_000}
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          employees={employees}
          selectedChatEmployees={selectedChatEmployees}
          setSelectedChatEmployees={setSelectedChatEmployees}
          onQuickRunEmployee={(emp) => void autoRunEmployee(emp)}
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
          isPlanMode={isPlanMode}
          setIsPlanMode={setIsPlanMode}
          isSending={isSending}
          mentionState={mentionState}
          searchResults={searchResults}
          onInsertReference={onInsertReferenceFromInput}
          onSend={() => void handleSendMessage()}
          onCancel={handleCancelMessage}
          onInputForMention={() => {
            handleMentionInput();
            const text = chatInputRef.current?.innerText?.trim() || "";
            setUserStartedTyping(text.length > 0);
          }}
          referenceSubContent={referenceSubContent}
          referenceUrlInput={referenceUrlInput}
          setReferenceUrlInput={setReferenceUrlInput}
        />
        )}

        {!hasMessages && !(forceOnboarding || onboardingLocked) && (
          <div className="flex-[1.5] flex flex-col justify-start items-center px-4 pt-6 bg-background">
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl animate-in fade-in duration-1000 delay-300 fill-mode-both">
              <button onClick={() => handleSendMessage("Build a strategic plan for my business")} className="px-3.5 py-1.5 rounded-xl border border-border/60 bg-white dark:bg-card hover:bg-muted shadow-sm text-[13px] text-muted-foreground flex items-center gap-1.5 transition-colors"><TrendingUp className="w-3.5 h-3.5"/> Strategic Plan</button>
              <button onClick={() => handleSendMessage("Analyze my competitors")} className="px-3.5 py-1.5 rounded-xl border border-border/60 bg-white dark:bg-card hover:bg-muted shadow-sm text-[13px] text-muted-foreground flex items-center gap-1.5 transition-colors"><Search className="w-3.5 h-3.5"/> Analyze Competitors</button>
              <button onClick={() => handleSendMessage("Brainstorm growth and launch ideas")} className="px-3.5 py-1.5 rounded-xl border border-border/60 bg-white dark:bg-card hover:bg-muted shadow-sm text-[13px] text-muted-foreground flex items-center gap-1.5 transition-colors"><Rocket className="w-3.5 h-3.5"/> Brainstorm Growth</button>
              <button onClick={() => handleSendMessage("Configure an agent workflow")} className="px-3.5 py-1.5 rounded-xl border border-border/60 bg-white dark:bg-card hover:bg-muted shadow-sm text-[13px] text-muted-foreground flex items-center gap-1.5 transition-colors"><Bot className="w-3.5 h-3.5"/> Agent Workflow</button>
            </div>
          </div>
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
          <ChatHistorySidebar activeChatId={activeChatId} onSelectChat={handleSelectChat} onNewChat={handleNewChat} refreshKey={sidebarRefreshKey} />
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
              refreshKey={sidebarRefreshKey}
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
