import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Settings, ArrowUp, FileUp, Users, X, Globe, ChevronRight,
  Monitor, Search, Shield, Link, User, FileText, Bot, ChevronDown,
  Plug, Loader2, Sparkles, ExternalLink, Download, PanelRightOpen, PanelRightClose, Square
} from "lucide-react";
import { ChatHistorySidebar, type ChatSession } from "./ChatHistorySidebar";
import { useExtensionBridge } from "@/hooks/useExtensionBridge";
import { InlineChatChart } from "./InlineChatChart";
import { TaskStepsDisplay } from "./TaskStepsDisplay";
import { ThinkingTimer } from "./ThinkingTimer";
import { SettingsView } from "@/components/database/SettingsView";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useBusinessDNA } from "./BusinessDNAContext";
import { IntegrationRequestDialog } from "@/components/database/IntegrationRequestDialog";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import logoMicrosoft from "@/assets/logo-microsoft.png";
import logoGoogle from "@/assets/logo-google.png";
import logoSlack from "@/assets/logo-slack.png";
import logoHubspot from "@/assets/logo-hubspot.png";
import logoFortknox from "@/assets/logo-fortknox.png";
import adEvoIcon from "@/assets/ad-evo-icon.svg";
import type { AIEmployee } from "./EmployeesView";

/* ─── Task Report Viewer (popup dialog) ─── */
function TaskReportViewer({ content, onSaveToDb, savedToDb }: {
  content: string;
  onSaveToDb?: (updatedContent: string) => Promise<void>;
  savedToDb?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!savedToDb);

  const handleDownload = () => {
    const blob = new Blob([editContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "task-results.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!onSaveToDb) return;
    setSaving(true);
    try {
      await onSaveToDb(editContent);
      setSaved(true);
      toast.success("Document saved");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all text-sm font-medium text-foreground group"
      >
        <FileText className="w-4 h-4 text-primary" />
        View Task Results
        {saved && <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">Saved</span>}
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Dialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setOpen(false)}>
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground flex-1">Task Results</span>
              {saved && <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">Saved</span>}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={cn("text-xs px-2.5 py-1 rounded-lg transition-colors", isEditing ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
              >
                {isEditing ? "Preview" : "Edit"}
              </button>
              {onSaveToDb && (
                <button onClick={handleSave} disabled={saving} className="text-xs px-2.5 py-1 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-1.5 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                  Save
                </button>
              )}
              <button onClick={handleDownload} className="text-xs px-2.5 py-1 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-1.5 transition-colors">
                <Download className="w-3 h-3" />
                Download
              </button>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[400px] p-5 bg-transparent text-sm text-foreground font-mono resize-none focus:outline-none border-none"
                  spellCheck={false}
                />
              ) : (
                <div className="p-6 max-w-none text-foreground text-[14.5px] leading-[1.75]">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({children}) => <h1 className="text-xl font-bold text-foreground mt-6 mb-3 pb-2 border-b border-border/40">{children}</h1>,
                      h2: ({children}) => <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">{children}</h2>,
                      h3: ({children}) => <h3 className="text-base font-semibold text-foreground mt-5 mb-2">{children}</h3>,
                      p: ({children}) => <p className="mb-4 last:mb-0 leading-[1.8] text-foreground/90">{children}</p>,
                      ul: ({children}) => <ul className="my-4 pl-6 space-y-2 list-disc marker:text-foreground/40">{children}</ul>,
                      ol: ({children}) => <ol className="my-4 pl-6 space-y-2 list-decimal marker:text-foreground/40">{children}</ol>,
                      li: ({children}) => <li className="leading-[1.7] text-foreground/90 pl-1">{children}</li>,
                      strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                      blockquote: ({children}) => <blockquote className="my-4 pl-4 border-l-2 border-primary/30 text-foreground/70 italic">{children}</blockquote>,
                      hr: () => <hr className="my-6 border-border/50" />,
                      code: ({children, className: cName}) => {
                        const isBlock = cName?.includes("language-");
                        return isBlock
                          ? <code className={cn("block", cName)}>{children}</code>
                          : <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] font-mono text-foreground/80">{children}</code>;
                      },
                      pre: ({children}) => <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4 text-[13px]">{children}</pre>,
                      table: ({children}) => <div className="my-4 overflow-x-auto rounded-lg border border-border/50"><table className="w-full text-sm">{children}</table></div>,
                      thead: ({children}) => <thead className="bg-muted/50 border-b border-border/50">{children}</thead>,
                      th: ({children}) => <th className="px-4 py-2.5 text-left font-semibold text-foreground text-[13px]">{children}</th>,
                      td: ({children}) => <td className="px-4 py-2.5 border-t border-border/30 text-foreground/80">{children}</td>,
                      a: ({children, href}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">{children}</a>,
                    }}
                  >{editContent}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Types ─── */
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  files?: { name: string; url?: string }[];
  employees?: { id: string; name: string; role: string }[];
  isStreaming?: boolean;
  streamStartTime?: number;
  taskSteps?: { action: string; label: string; status: "running" | "done" | "error"; detail?: string }[];
  currentStepIndex?: number;
  reportContent?: string;
  reportSavedToDb?: boolean;
}

/* ─── Main view ─── */
export function AgentChatView() {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const { brands } = useBusinessDNA();
  const { extensionConnected, detecting, getPageContext, executeAction, signalStart, signalStop, updateOverlay } = useExtensionBridge();

  /* ── Agents = brands from Business DNA ── */
  const agents = brands.map(b => ({ id: b.id, name: b.agentName || b.name || "AI CEO" }));

  /* ── Employees (from DB) ── */
  const [employees, setEmployees] = useState<AIEmployee[]>([]);
  const loadEmployees = async () => {
    if (!user) return;
    let query = supabase
      .from("ai_employees" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (activeWorkspaceId) query = query.eq("workspace_id", activeWorkspaceId);
    else query = query.eq("user_id", user.id);
    const { data } = await query;
    if (data) setEmployees(data as unknown as AIEmployee[]);
  };
  useEffect(() => { loadEmployees(); }, [user, activeWorkspaceId]);

  /* ── UI state ── */
  const [isDropupOpen, setIsDropupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [showAgents, setShowAgents] = useState(false);
  const [showEmployeesMenu, setShowEmployeesMenu] = useState(false);
  const [isActionMode, setIsActionMode] = useState(false);
  const [settingsTab, setSettingsTab] = useState("safety");
  const [showReference, setShowReference] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; name: string; file?: File }[]>([]);
  const [referencedUrls, setReferencedUrls] = useState<{ id: string; url: string; name: string; logo: string }[]>([]);
  const [referenceUrlInput, setReferenceUrlInput] = useState("");
  const [mentionState, setMentionState] = useState<{ active: boolean; node: Node | null; startOffset: number; endOffset: number }>({ active: false, node: null, startOffset: 0, endOffset: 0 });
  const [selectedChatEmployees, setSelectedChatEmployees] = useState<{ id: string; name: string; role: string }[]>([]);

  /* ── Chat state ── */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  /* ── Chat history sidebar state ── */
  const isMobileChatView = useIsMobile();
  const [showHistory, setShowHistory] = useState(false);

  // On desktop, default history open; on mobile keep closed
  useEffect(() => {
    if (!isMobileChatView) {
      setShowHistory(true);
    } else {
      setShowHistory(false);
    }
  }, [isMobileChatView]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Auto-save chat to DB (debounced) ── */
  const saveChatSession = useCallback(async (msgs: ChatMessage[], chatId: string | null) => {
    if (!user || msgs.length === 0) return;
    const nonStreaming = msgs.filter(m => !m.isStreaming);
    if (nonStreaming.length === 0) return;

    const title = nonStreaming.find(m => m.role === "user")?.content?.slice(0, 60) || "New Chat";
    const payload = {
      user_id: user.id,
      workspace_id: activeWorkspaceId || null,
      agent_name: selectedAgent || null,
      title,
      messages: nonStreaming,
      updated_at: new Date().toISOString(),
    };

    try {
      if (chatId) {
        await (supabase as any).from("agent_chat_sessions")
          .update({ messages: nonStreaming, updated_at: new Date().toISOString(), title })
          .eq("id", chatId);
      } else {
        const { data } = await (supabase as any).from("agent_chat_sessions")
          .insert(payload)
          .select("id")
          .maybeSingle();
        if (data?.id) setActiveChatId(data.id);
      }
    } catch (e) { console.warn("Failed to save chat session:", e); }
  }, [user, activeWorkspaceId, selectedAgent]);

  // Debounced save when messages change
  useEffect(() => {
    if (messages.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveChatSession(messages, activeChatId), 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [messages, activeChatId, saveChatSession]);

  const handleSelectChat = (session: ChatSession) => {
    setActiveChatId(session.id);
    setMessages(session.messages as ChatMessage[]);
    if (session.agent_name) setSelectedAgent(session.agent_name);
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  /* ── Integration connection state ── */
  const [connectedProviders, setConnectedProviders] = useState<Record<string, boolean>>({});
  const [connectingProvider, setConnectingProvider] = useState<string | false>(false);

  const activeBrandForConnections = brands.find(b => (b.agentName || b.name || "AI CEO") === selectedAgent);
  const activeBrandId = activeBrandForConnections?.id ?? null;

  // Check connections at user level (not brand-scoped)
  const checkConnection = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ action: "check-status" }) }
      );
      if (response.ok) {
        const data = await response.json();
        const map: Record<string, boolean> = {};
        for (const c of (data.connected || [])) map[c.provider] = true;
        setConnectedProviders(map);
      }
    } catch (err) { console.error("Check connection error:", err); }
  }, []);

  useEffect(() => { checkConnection(); }, [checkConnection]);

  // Handle OAuth return in agent chat
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    if (oauthSuccess) {
      window.history.replaceState({}, "", window.location.pathname);
      checkConnection();
    }
  }, [checkConnection]);

  const handleProviderConnect = async (provider: string) => {
    setConnectingProvider(provider);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please log in first"); setConnectingProvider(false); return; }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ provider, action: "get-auth-url", returnPath: window.location.pathname, origin: window.location.origin, brandId: activeBrandId }) }
      );
      const data = await response.json();
      if (data.authUrl) window.location.href = data.authUrl;
      else toast.error(data.error || "Failed to get authorization URL");
    } catch { toast.error("Failed to start connection"); }
    setConnectingProvider(false);
  };

  const handleProviderDisconnect = async (provider: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ provider, action: "disconnect" }) }
      );
      setConnectedProviders(prev => { const next = { ...prev }; delete next[provider]; return next; });
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} disconnected`);
    } catch { toast.error("Failed to disconnect"); }
  };

  const dropupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLDivElement>(null);

  /* set default agent from first brand */
  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) setSelectedAgent(agents[0].name);
  }, [agents]);

  const IMAGE_ANALYSIS_MAX_DIMENSION = 1600;
  const IMAGE_ANALYSIS_MAX_BYTES = 2_000_000;

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const optimizeImageForAnalysis = async (
    file: File
  ): Promise<{ base64: string; mimeType: string }> => {
    const originalDataUrl = await fileToDataUrl(file);
    const originalBase64 = originalDataUrl.split(",")[1] || "";

    // Keep smaller images untouched to preserve fidelity and speed.
    if (!file.type.startsWith("image/") || file.size <= 1_500_000) {
      return { base64: originalBase64, mimeType: file.type || "image/png" };
    }

    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl as string;
      });

      const largestSide = Math.max(img.naturalWidth, img.naturalHeight, 1);
      const scale = Math.min(1, IMAGE_ANALYSIS_MAX_DIMENSION / largestSide);
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return { base64: originalBase64, mimeType: file.type || "image/png" };
      }

      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = "image/jpeg";
      let quality = 0.82;
      let optimizedDataUrl = canvas.toDataURL(mimeType, quality);
      let estimatedBytes = Math.ceil((optimizedDataUrl.length * 3) / 4);

      while (estimatedBytes > IMAGE_ANALYSIS_MAX_BYTES && quality > 0.45) {
        quality -= 0.1;
        optimizedDataUrl = canvas.toDataURL(mimeType, quality);
        estimatedBytes = Math.ceil((optimizedDataUrl.length * 3) / 4);
      }

      return {
        base64: optimizedDataUrl.split(",")[1] || originalBase64,
        mimeType,
      };
    } catch {
      return { base64: originalBase64, mimeType: file.type || "image/png" };
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  };

  /* ── Read file contents — text read directly, images kept as base64 for vision ── */
  const readFileContent = async (file: File, _session: any): Promise<string> => {
    const textTypes = ["text/", "application/json", "application/xml", "text/csv", "application/csv"];
    const isText = textTypes.some(t => file.type.startsWith(t)) || /\.(txt|md|csv|json|xml|html|css|js|ts|py|log|yml|yaml|toml|ini|cfg|env)$/i.test(file.name);

    if (isText) {
      const text = await file.text();
      return text.slice(0, 50000);
    }

    // For images: optimize and return as a special JSON marker so we can send as vision
    if (file.type.startsWith("image/")) {
      try {
        const optimized = await optimizeImageForAnalysis(file);
        // Return a JSON marker that the chat functions will parse into multimodal content
        return `__IMAGE_BASE64__${optimized.mimeType}__${optimized.base64}`;
      } catch {
        return `[File: ${file.name} (image, ${(file.size / 1024).toFixed(1)}KB)]`;
      }
    }

    // For other binary files (PDFs, audio, etc.) — call analyze-content
    try {
      const base64Data = (await fileToDataUrl(file)).split(",")[1] || "";
      let analyzeType = "document";
      let contentBody: any = { documentName: file.name, fileBase64: base64Data, fileMimeType: file.type };

      if (file.type.startsWith("audio/")) {
        analyzeType = "audio";
        contentBody = { fileName: file.name, fileBase64: base64Data, fileMimeType: file.type };
      } else if (file.type.startsWith("video/")) {
        analyzeType = "video";
        contentBody = { fileName: file.name, fileBase64: base64Data, fileMimeType: file.type };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${_session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          signal: controller.signal,
          body: JSON.stringify({ type: analyzeType, content: contentBody }),
        }
      );
      clearTimeout(timeout);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.analysis) {
          return `[Analysis of ${file.name}]\n${result.analysis}`;
        }
      }
    } catch (err) {
      console.error("File analysis error:", err);
    }

    return `[File: ${file.name} (${file.type || "unknown"}, ${(file.size / 1024).toFixed(1)}KB) — could not analyze]`;
  };

  /* ── Process files: read content in parallel, upload in background ── */
  const processFiles = async (files: { id: string; name: string; file?: File }[], session: any): Promise<{ name: string; content: string }[]> => {
    const validFiles = files.filter(f => f.file);
    if (validFiles.length === 0) return [];

    // Upload to storage in background (non-blocking)
    for (const f of validFiles) {
      if (!f.file) continue;
      const path = `${user!.id}/chat/${Date.now()}-${f.name}`;
      supabase.storage.from("business-data").upload(path, f.file).catch(() => {});
    }

    // Read all file contents in parallel
    const results = await Promise.all(
      validFiles.map(async (f) => ({
        name: f.name,
        content: await readFileContent(f.file!, session),
      }))
    );
    return results;
  };

  /* ── Auto-run employee when selected from menu ── */
  const autoRunEmployee = async (emp: { id: string; name: string; role: string }) => {
    if (isSending) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Please log in first"); return; }

    // Auto-enable Computer Mode for employees
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
    setMessages(prev => [...prev, userMsg]);
    setSelectedChatEmployees([]);

    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", isStreaming: true, streamStartTime: Date.now() }]);

    try {
      await runComputerMode(session, userMsg, assistantId);
    } catch (err: any) {
      setMessages(prev => prev.map(m => {
        if (m.id !== assistantId) return m;
        const updatedSteps = (m.taskSteps || []).map(s => s.status === "running" ? { ...s, status: "error" as const } : s);
        updatedSteps.push({ action: "error", label: `Failed: ${err.message || "Unknown error"}`, status: "error" as const });
        return { ...m, content: `⚠️ ${err.message || "Something went wrong. Please try again."}`, taskSteps: updatedSteps, isStreaming: false };
      }));
    }
    setIsSending(false);
  };

  /* ── Send message ── */
  const handleSendMessage = async () => {
    if (isSending) return;
    const inputText = chatInputRef.current?.innerText?.trim() || "";
    if (!inputText && uploadedFiles.length === 0) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Please log in first"); return; }

    setIsSending(true);

    const fileResults = await processFiles(uploadedFiles, session);

    // Build user message
    let userContent = inputText;
    if (fileResults.length > 0) {
      userContent += `\n\n📎 Attached files:\n`;
      for (const f of fileResults) {
        userContent += `\n--- ${f.name} ---\n${f.content}\n`;
      }
    }
    if (referencedUrls.length > 0) {
      userContent += `\n\n🔗 Referenced: ${referencedUrls.map(r => r.url).join(", ")}`;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userContent,
      files: uploadedFiles.map(f => ({ name: f.name })),
      employees: selectedChatEmployees.length > 0 ? [...selectedChatEmployees] : undefined,
    };

    setMessages(prev => [...prev, userMsg]);

    // Clear inputs
    if (chatInputRef.current) chatInputRef.current.innerHTML = "";
    setUploadedFiles([]);
    setReferencedUrls([]);
    setSelectedChatEmployees([]);
    setMentionState({ active: false, node: null, startOffset: 0, endOffset: 0 });

    // Add assistant placeholder
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", isStreaming: true, streamStartTime: Date.now() }]);

    try {
      // If files are attached, always use chat mode (not browser automation) so the AI analyzes them
      const hasFiles = userMsg.files && userMsg.files.length > 0;

      if (hasFiles && selectedChatEmployees.length > 0) {
        // Files attached with employee: use employee chat to analyze files
        await runEmployeeChat(session, userMsg, assistantId);
      } else if (hasFiles) {
        // Files attached without employee: use agent chat to analyze files
        await runAgentChat(session, userMsg, assistantId);
      } else if (isActionMode && extensionConnected && selectedChatEmployees.length > 0) {
        // Computer mode with employee: run employee via extension
        await runComputerMode(session, userMsg, assistantId);
      } else if (isActionMode && extensionConnected) {
        // Computer mode without employee: agent chat with browser context
        await runAgentChatWithBrowser(session, userMsg, assistantId);
      } else if (selectedChatEmployees.length > 0) {
        // Employee chat (non-computer mode)
        await runEmployeeChat(session, userMsg, assistantId);
      } else {
        // Agent chat (streaming via extension-agent)
        await runAgentChat(session, userMsg, assistantId);
      }
    } catch (err: any) {
      console.error("Send error:", err);
      const errorMsg = err.message || "Something went wrong";
      setMessages(prev => prev.map(m => {
        if (m.id !== assistantId) return m;
        // Mark any running task steps as error
        const updatedSteps = (m.taskSteps || []).map(s => 
          s.status === "running" ? { ...s, status: "error" as const } : s
        );
        // Add an explicit error step
        updatedSteps.push({ action: "error", label: `Failed: ${errorMsg}`, status: "error" as const });
        // If we already have partial content from streaming, keep it with a notice
        if (m.content && m.content.trim().length > 20) {
          return { ...m, content: m.content + "\n\n---\n⚠️ *Response was cut short. Try again with a more specific request.*", taskSteps: updatedSteps, isStreaming: false };
        }
        return { ...m, content: `⚠️ ${errorMsg}`, taskSteps: updatedSteps, isStreaming: false };
      }));
    }

    setIsSending(false);
  };

  /* ── Helper: build multimodal message content from text that may contain image markers ── */
  const buildMultimodalContent = (text: string): any => {
    const IMAGE_MARKER = "__IMAGE_BASE64__";
    if (!text.includes(IMAGE_MARKER)) return text;

    // Split text around image markers and build multimodal content array
    const parts: any[] = [];
    let remaining = text;

    while (remaining.includes(IMAGE_MARKER)) {
      const markerStart = remaining.indexOf(IMAGE_MARKER);
      const beforeMarker = remaining.slice(0, markerStart).trim();
      if (beforeMarker) parts.push({ type: "text", text: beforeMarker });

      const afterMarker = remaining.slice(markerStart + IMAGE_MARKER.length);
      const mimeEnd = afterMarker.indexOf("__");
      const mimeType = afterMarker.slice(0, mimeEnd);
      const restAfterMime = afterMarker.slice(mimeEnd + 2);

      // Find end of base64 (next marker or end of string)
      const nextMarker = restAfterMime.indexOf(IMAGE_MARKER);
      let base64: string;
      if (nextMarker >= 0) {
        base64 = restAfterMime.slice(0, nextMarker).trim();
        remaining = restAfterMime.slice(nextMarker);
      } else {
        base64 = restAfterMime.trim();
        remaining = "";
      }

      parts.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` },
      });
    }

    if (remaining.trim()) parts.push({ type: "text", text: remaining.trim() });
    return parts.length === 1 && parts[0].type === "text" ? parts[0].text : parts;
  };

  /* ── Fetch with timeout to prevent infinite hanging ── */
  const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs = 120000): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
      .catch(err => {
        if (err.name === "AbortError") throw new Error("Request timed out. The server took too long to respond.");
        throw err;
      })
      .finally(() => clearTimeout(timer));
  };

  /* ── Agent chat (streaming) ── */
  const runAgentChat = async (session: any, userMsg: ChatMessage, assistantId: string) => {
    const chatHistory = messages.filter(m => !m.isStreaming).map(m => ({ role: m.role, content: m.content }));
    const userContent = buildMultimodalContent(userMsg.content);
    chatHistory.push({ role: "user", content: userContent });

    const activeBrand = brands.find(b => (b.agentName || b.name || "AI CEO") === selectedAgent);
    const brandRowId = activeBrand ? (activeBrand as any)._rowId : undefined;

    const taskSteps: ChatMessage["taskSteps"] = [];
    const addStep = (label: string, status: "running" | "done" | "error" = "running") => {
      taskSteps.push({ action: "process", label, status });
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, taskSteps: [...taskSteps], currentStepIndex: taskSteps.length - 1, isStreaming: true, streamStartTime: m.streamStartTime || Date.now() } : m));
    };
    const completeStep = () => {
      if (taskSteps.length > 0) taskSteps[taskSteps.length - 1].status = "done";
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, taskSteps: [...taskSteps], isStreaming: true } : m));
    };

    addStep("Working on memory...");

    const response = await fetchWithTimeout(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extension-agent`,
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
        }),
      }
    );

    if (!response.ok) {
      completeStep();
      addStep("Error");
      taskSteps[taskSteps.length - 1].status = "error";
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Failed to get response");
    }

    completeStep();
    addStep("Generating response...");

    // Stream SSE response
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || "";
          if (delta) {
            fullContent += delta;
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullContent, taskSteps: [...taskSteps], isStreaming: true } : m));
          }
        } catch {}
      }
    }

    completeStep();
    addStep("Done");
    completeStep();

    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullContent || "I'm ready to help. What would you like me to do?", taskSteps: [...taskSteps], isStreaming: false } : m));
  };

  /* ── Agent chat with browser context (computer mode, no employee) ── */
  const runAgentChatWithBrowser = async (session: any, userMsg: ChatMessage, assistantId: string) => {
    const activeBrand = brands.find(b => (b.agentName || b.name || "AI CEO") === selectedAgent);
    const brandRowId = activeBrand ? (activeBrand as any)._rowId : undefined;

    // Signal extension
    await signalStart("agent", selectedAgent || "AI Agent");
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
        const pageContext = await getPageContext();
        const stepTime = new Date();
        updateOverlay({ visible: true, employeeName: selectedAgent || "AI Agent", currentStep: `Step ${stepCount + 1}...` });

        const response = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extension-agent`,
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
            }),
          }
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || "Browser step failed");
        }

        const data = await response.json();
        const content = data.content || "";
        conversationHistory.push({ role: "assistant" as const, content });

        // Parse action JSON
        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
        if (!jsonMatch) {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: content, taskSteps: [...taskSteps], isStreaming: false } : m));
          break;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(jsonMatch[1]);
        } catch (parseErr) {
          conversationHistory.push({ role: "user" as const, content: "Error: Your last response contained invalid JSON. Please re-send your action as valid JSON inside ```json``` fences." });
          stepCount++;
          continue;
        }
        // Support batched steps array or single action
        const actions = parsed.steps ? parsed.steps : [parsed];
        let shouldBreak = false;
        let shouldContinue = false;

        for (const action of actions) {
          if (stepCount >= maxSteps) break;
          const stepLabel = action.reasoning || action.action;
          const timeStr = formatTime(stepTime);

          stepLogs.push({ step: stepCount + 1, action: action.action, reasoning: stepLabel, result: "pending", timestamp: timeStr, url: pageContext?.url || action.url });
          const stepDetail = [action.reasoning, action.url, action.selector].filter(Boolean).join(" · ");
          taskSteps.push({ action: action.action, label: stepLabel, status: "running", detail: stepDetail || undefined });

          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: stepLabel, taskSteps: [...taskSteps], currentStepIndex: taskSteps.length - 1, isStreaming: true } : m));
          updateOverlay({ visible: true, employeeName: selectedAgent || "AI Agent", currentStep: stepLabel });

          if (action.done || action.action === "done") {
            finalMessage = action.message || "Task completed.";
            stepLogs[stepLogs.length - 1].result = "done";
            taskSteps[taskSteps.length - 1].status = "done";
            shouldBreak = true;
            break;
          }

          if (action.action === "respond") {
            stepLogs[stepLogs.length - 1].result = "respond";
            taskSteps[taskSteps.length - 1].status = "done";
            taskSteps[taskSteps.length - 1].detail = action.message || "";
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: action.message || stepLabel, taskSteps: [...taskSteps], currentStepIndex: taskSteps.length - 1, isStreaming: true } : m));
            conversationHistory.push({ role: "user" as const, content: `Noted. Now proceed with the next action to execute the task. Do NOT respond again — take an actual browser action (navigate, click, type, etc.).` });
            stepCount++;
            shouldContinue = true;
            break;
          }

          // Handle wait action client-side (don't send to extension)
          if (action.action === "wait") {
            const waitMs = Math.min(action.duration || 1000, 5000);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            stepLogs[stepLogs.length - 1].result = "success";
            taskSteps[taskSteps.length - 1].status = "done";
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, taskSteps: [...taskSteps], isStreaming: true } : m));
            consecutiveErrors = 0;
            conversationHistory.push({ role: "user" as const, content: `Action result: {"success":true,"action":"wait"}` });
            stepCount++;
            continue;
          }

          // Execute action via extension
          let result = await executeAction(action);

          // Fallback for extract: if extension can't extract, use page context
          if (!result.success && action.action === "extract" && pageContext?.pageContent) {
            result = { success: true, action: "extract", data: { content: pageContext.pageContent.slice(0, 5000), fallback: true } };
          }

          // Detect extension disconnection
          if (!result.success && result.error === "Timeout waiting for extension") {
            taskSteps[taskSteps.length - 1].status = "error";
            taskSteps[taskSteps.length - 1].detail = "Browser extension disconnected";
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "⚠️ Browser extension lost connection. Please check your extension is running and try again.", taskSteps: [...taskSteps], isStreaming: false } : m));
            break;
          }

          stepLogs[stepLogs.length - 1].result = result.success ? "success" : (result.error || "failed");
          taskSteps[taskSteps.length - 1].status = result.success ? "done" : "error";
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: stepLabel, taskSteps: [...taskSteps], currentStepIndex: taskSteps.length - 1, isStreaming: true } : m));

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

          // Handle extract with success but empty data
          if (result.success && action.action === "extract" && (!result.data || !result.data.content) && pageContext?.pageContent) {
            conversationHistory[conversationHistory.length - 1] = { role: "user" as const, content: `Action result: ${JSON.stringify({ success: true, action: "extract", data: { content: pageContext.pageContent.slice(0, 5000), fallback: true } })}` };
          }

          stepCount++;
        }

        if (shouldBreak) break;
        if (shouldContinue) continue;
        if (!shouldBreak && !shouldContinue && actions.length > 0) continue;
      }

      // If no explicit done message, collect results from conversation
      if (!finalMessage) {
        const respondMessages = stepLogs.filter(s => s.result === "respond").map(s => s.reasoning);
        const extractResults = conversationHistory
          .filter(m => m.role === "user" && m.content.startsWith("Action result:"))
          .map(m => {
            try {
              const parsed = JSON.parse(m.content.replace("Action result: ", ""));
              if (parsed.success && parsed.action === "extract" && parsed.data?.content) {
                return parsed.data.content;
              }
            } catch {}
            return null;
          })
          .filter(Boolean);

        if (respondMessages.length > 0 || extractResults.length > 0) {
          const parts: string[] = [];
          if (respondMessages.length > 0) parts.push(respondMessages.join("\n\n"));
          if (extractResults.length > 0) parts.push("## Extracted Data\n\n" + extractResults.join("\n\n---\n\n"));
          finalMessage = parts.join("\n\n");
        } else {
          const lastAiMsg = [...conversationHistory].reverse().find(m => m.role === "assistant");
          if (lastAiMsg) {
            finalMessage = lastAiMsg.content.replace(/```json[\s\S]*?```/g, "").trim() || "Task ran but no structured results were returned.";
          }
        }
      }

      // Generate results document
      const endTime = new Date();
      const durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      const report = generateTaskReport(selectedAgent || "AI Agent", userMsg.content, stepLogs, startTime, endTime, durationSec, finalMessage);

      setMessages(prev => prev.map(m => m.id === assistantId ? {
        ...m,
        content: finalMessage || `Task completed — ${durationSec}s`,
        taskSteps: [...taskSteps],
        isStreaming: false,
        reportContent: report,
        reportSavedToDb: false,
      } : m));
    } catch (err: any) {
      taskSteps.push({ action: "error", label: err.message || "Unknown error", status: "error" });
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: err.message || "Something went wrong.", taskSteps: [...taskSteps], isStreaming: false } : m));
      throw err;
    } finally {
      updateOverlay({ visible: false });
      signalStop("agent");
    }
  };

  const runEmployeeChat = async (session: any, userMsg: ChatMessage, assistantId: string) => {
    const emp = userMsg.employees?.[0];
    if (!emp) return;

    const startTime = new Date();
    const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const taskSteps: ChatMessage["taskSteps"] = [];
    const addStep = (label: string, status: "running" | "done" | "error" = "running") => {
      taskSteps.push({ action: "process", label, status });
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, taskSteps: [...taskSteps], currentStepIndex: taskSteps.length - 1, isStreaming: true, streamStartTime: m.streamStartTime || Date.now() } : m));
    };
    const completeStep = () => {
      if (taskSteps.length > 0) taskSteps[taskSteps.length - 1].status = "done";
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, taskSteps: [...taskSteps], isStreaming: true } : m));
    };

    // Show processing state
    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "", isStreaming: true, streamStartTime: Date.now(), taskSteps: [], currentStepIndex: -1 } : m));

    addStep("Working on memory...");

    // Log to DB
    supabase.from("ai_employee_logs").insert({ employee_id: emp.id, user_id: user!.id, status: "running", step_label: "Task started", message: userMsg.content }).then(() => {});

    const chatHistory = messages.filter(m => !m.isStreaming).map(m => ({ role: m.role, content: m.content }));
    const userContent = buildMultimodalContent(userMsg.content);
    chatHistory.push({ role: "user", content: userContent });

    const brandRowId = (() => { const ab = brands.find(b => (b.agentName || b.name || "AI CEO") === selectedAgent); return ab ? (ab as any)._rowId : undefined; })();

    completeStep();
    addStep("Analyzing request...");

    // Continuation loop
    let accumulatedContent = "";
    let continuationCount = 0;
    const MAX_CONTINUATIONS = 5;

    while (continuationCount <= MAX_CONTINUATIONS) {
      if (continuationCount > 0) {
        addStep(`Continuing generation... (${continuationCount})`);
      }

      const response = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-employee`,
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
            ...(accumulatedContent ? { continuationContent: accumulatedContent } : {}),
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        completeStep();
        addStep("Error");
        taskSteps[taskSteps.length - 1].status = "error";
        supabase.from("ai_employee_logs").insert({ employee_id: emp.id, user_id: user!.id, status: "error", step_label: "Error", message: err.error || "Failed" }).then(() => {});
        throw new Error(err.error || "Employee failed");
      }

      const data = await response.json();
      accumulatedContent = data.content || accumulatedContent;

      completeStep();

      // Update message with accumulated content
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: accumulatedContent, taskSteps: [...taskSteps], isStreaming: true } : m));

      if (!data.continuation) break;
      continuationCount++;
    }

    addStep("Done");
    completeStep();

    const endTime = new Date();
    const durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    supabase.from("ai_employee_logs").insert({ employee_id: emp.id, user_id: user!.id, status: "completed", step_label: "Task completed", message: `Completed in ${durationSec}s` }).then(() => {});

    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: accumulatedContent || "Task completed.", taskSteps: [...taskSteps], isStreaming: false } : m));
  };

  /* ── Computer mode: run employee via browser extension ── */
  const runComputerMode = async (session: any, userMsg: ChatMessage, assistantId: string) => {
    const emp = userMsg.employees?.[0];
    if (!emp) { toast.error("Select an employee to use Computer mode"); return; }

    // Signal extension to start
    await signalStart(emp.id, emp.name);
    updateOverlay({ visible: true, employeeName: emp.name, currentStep: "Starting..." });

    let stepCount = 0;
    let consecutiveErrors = 0;
    const maxSteps = 30;
    let finalMessage = "";
    let conversationHistory: { role: "user" | "assistant"; content: string }[] = [{ role: "user", content: userMsg.content }];
    const startTime = new Date();

    // Structured log for report
    interface StepLog { step: number; action: string; reasoning: string; result: string; timestamp: string; url?: string }
    const stepLogs: StepLog[] = [];
    const taskSteps: ChatMessage["taskSteps"] = [];

    const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Starting task...", taskSteps: [], currentStepIndex: -1, isStreaming: true } : m));

    // Log to DB
    supabase.from("ai_employee_logs").insert({ employee_id: emp.id, user_id: user!.id, status: "running", step_label: "Task started", message: userMsg.content }).then(() => {});

    try {
      while (stepCount < maxSteps) {
        // Get page context from extension
        const pageContext = await getPageContext();
        const stepTime = new Date();

        updateOverlay({ visible: true, employeeName: emp.name, currentStep: `Step ${stepCount + 1}...` });

        // Call run-employee
        const response = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-employee`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              employee_id: emp.id,
              messages: conversationHistory.slice(-6),
              pageContext,
              skip_action: stepCount > 0,
              brandId: (() => { const ab = brands.find(b => (b.agentName || b.name || "AI CEO") === selectedAgent); return ab ? (ab as any)._rowId : undefined; })(),
              workspaceId: activeWorkspaceId,
            }),
          }
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || "Employee step failed");
        }

        const data = await response.json();
        const content = data.content || "";
        conversationHistory.push({ role: "assistant" as const, content });

        // Parse action JSON from response
        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
        if (!jsonMatch) {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: content, taskSteps: [...taskSteps], isStreaming: false } : m));
          stepLogs.push({ step: stepCount + 1, action: "response", reasoning: content, result: "completed", timestamp: formatTime(stepTime), url: pageContext?.url });
          break;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(jsonMatch[1]);
        } catch (parseErr) {
          conversationHistory.push({ role: "user" as const, content: "Error: Your last response contained invalid JSON. Please re-send your action as valid JSON inside ```json``` fences." });
          stepCount++;
          continue;
        }
        const actions = parsed.steps ? parsed.steps : [parsed];
        let shouldBreak = false;
        let shouldContinue = false;

        for (const action of actions) {
          if (stepCount >= maxSteps) break;
          const stepLabel = action.reasoning || action.action;
          const timeStr = formatTime(stepTime);

          stepLogs.push({ step: stepCount + 1, action: action.action, reasoning: stepLabel, result: "pending", timestamp: timeStr, url: pageContext?.url || action.url });
          const stepDetail = [action.reasoning, action.url, action.selector].filter(Boolean).join(" · ");
          taskSteps.push({ action: action.action, label: stepLabel, status: "running", detail: stepDetail || undefined });

          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: stepLabel, taskSteps: [...taskSteps], currentStepIndex: taskSteps.length - 1, isStreaming: true } : m));

          supabase.from("ai_employee_logs").insert({ employee_id: emp.id, user_id: user!.id, status: "running", step_label: `Step ${stepCount + 1}: ${action.action}`, message: stepLabel }).then(() => {});

          updateOverlay({ visible: true, employeeName: emp.name, currentStep: stepLabel });

          if (action.done || action.action === "done") {
            finalMessage = action.message || "Task completed.";
            stepLogs[stepLogs.length - 1].result = "done";
            taskSteps[taskSteps.length - 1].status = "done";
            shouldBreak = true;
            break;
          }

          if (action.action === "respond") {
            stepLogs[stepLogs.length - 1].result = "respond";
            taskSteps[taskSteps.length - 1].status = "done";
            taskSteps[taskSteps.length - 1].detail = action.message || "";
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: action.message || stepLabel, taskSteps: [...taskSteps], currentStepIndex: taskSteps.length - 1, isStreaming: true } : m));
            conversationHistory.push({ role: "user" as const, content: `Noted. Now proceed with the next action to execute the task. Do NOT respond again — take an actual browser action (navigate, click, type, etc.).` });
            stepCount++;
            shouldContinue = true;
            break;
          }

          // Handle wait action client-side (don't send to extension)
          if (action.action === "wait") {
            const waitMs = Math.min(action.duration || 1000, 5000);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            stepLogs[stepLogs.length - 1].result = "success";
            taskSteps[taskSteps.length - 1].status = "done";
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, taskSteps: [...taskSteps], isStreaming: true } : m));
            consecutiveErrors = 0;
            conversationHistory.push({ role: "user" as const, content: `Action result: {"success":true,"action":"wait"}` });
            stepCount++;
            continue;
          }

          let result = await executeAction(action);

          // Fallback for extract: if extension can't extract, use page context
          if (!result.success && action.action === "extract" && pageContext?.pageContent) {
            result = { success: true, action: "extract", data: { content: pageContext.pageContent.slice(0, 5000), fallback: true } };
          }

          // Detect extension disconnection
          if (!result.success && result.error === "Timeout waiting for extension") {
            taskSteps[taskSteps.length - 1].status = "error";
            taskSteps[taskSteps.length - 1].detail = "Browser extension disconnected";
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "⚠️ Browser extension lost connection. Please check your extension is running and try again.", taskSteps: [...taskSteps], isStreaming: false } : m));
            break;
          }

          stepLogs[stepLogs.length - 1].result = result.success ? "success" : (result.error || "failed");
          taskSteps[taskSteps.length - 1].status = result.success ? "done" : "error";
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: stepLabel, taskSteps: [...taskSteps], currentStepIndex: taskSteps.length - 1, isStreaming: true } : m));

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

          // Handle extract with success but empty data
          if (result.success && action.action === "extract" && (!result.data || !result.data.content) && pageContext?.pageContent) {
            conversationHistory[conversationHistory.length - 1] = { role: "user" as const, content: `Action result: ${JSON.stringify({ success: true, action: "extract", data: { content: pageContext.pageContent.slice(0, 5000), fallback: true } })}` };
          }

          stepCount++;
        }

        if (shouldBreak) break;
        if (shouldContinue) continue;
        if (!shouldBreak && !shouldContinue && actions.length > 0) continue;
      }

      // If no explicit done message, collect results from conversation
      if (!finalMessage) {
        // Gather all respond messages and extract data from AI responses
        const respondMessages = stepLogs.filter(s => s.result === "respond").map(s => s.reasoning);
        const extractResults = conversationHistory
          .filter(m => m.role === "user" && m.content.startsWith("Action result:"))
          .map(m => {
            try {
              const parsed = JSON.parse(m.content.replace("Action result: ", ""));
              if (parsed.success && parsed.action === "extract" && parsed.data?.content) {
                return parsed.data.content;
              }
            } catch {}
            return null;
          })
          .filter(Boolean);

        if (respondMessages.length > 0 || extractResults.length > 0) {
          const parts: string[] = [];
          if (respondMessages.length > 0) parts.push(respondMessages.join("\n\n"));
          if (extractResults.length > 0) parts.push("## Extracted Data\n\n" + extractResults.join("\n\n---\n\n"));
          finalMessage = parts.join("\n\n");
        } else {
          // Last resort: use the last AI response content
          const lastAiMsg = [...conversationHistory].reverse().find(m => m.role === "assistant");
          if (lastAiMsg) {
            // Strip JSON code blocks, keep text
            finalMessage = lastAiMsg.content.replace(/```json[\s\S]*?```/g, "").trim() || "Task ran but no structured results were returned.";
          }
        }
      }

      // Generate results document
      const endTime = new Date();
      const durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      const report = generateTaskReport(emp.name, userMsg.content, stepLogs, startTime, endTime, durationSec, finalMessage);

      setMessages(prev => prev.map(m => m.id === assistantId ? {
        ...m,
        content: finalMessage || `Task completed — ${durationSec}s`,
        taskSteps: [...taskSteps],
        isStreaming: false,
        reportContent: report,
        reportSavedToDb: false,
      } : m));

      // Log completion to DB
      supabase.from("ai_employee_logs").insert({ employee_id: emp.id, user_id: user!.id, status: "completed", step_label: "Task completed", message: `${stepLogs.length} steps in ${durationSec}s` }).then(() => {});

    } catch (err: any) {
      taskSteps.push({ action: "error", label: err.message || "Unknown error", status: "error" });
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: err.message || "Something went wrong.", taskSteps: [...taskSteps], isStreaming: false } : m));
      supabase.from("ai_employee_logs").insert({ employee_id: emp.id, user_id: user!.id, status: "error", step_label: "Error", message: err.message || "Unknown error" }).then(() => {});
      throw err;
    } finally {
      updateOverlay({ visible: false });
      signalStop(emp.id);
    }
  };

  /* ── Generate results-focused document (data only, no metadata noise) ── */
  const generateTaskReport = (
    agentName: string,
    task: string,
    steps: { step: number; action: string; reasoning: string; result: string; timestamp: string; url?: string }[],
    startTime: Date,
    endTime: Date,
    durationSec: number,
    finalMessage?: string
  ): string => {
    const lines: string[] = [];

    // The final message IS the deliverable — show it front and center
    if (finalMessage) {
      lines.push(finalMessage);
    } else {
      // Fallback: collect all respond messages as results
      const respondSteps = steps.filter(s => s.result === "respond" || s.result === "done");
      if (respondSteps.length > 0) {
        lines.push(respondSteps.map(s => s.reasoning).join("\n\n"));
      } else {
        lines.push("No results were collected for this task.");
      }
    }

    // Append sources at the end
    const urls = [...new Set(steps.filter(s => s.url && !s.url.includes("about:blank")).map(s => s.url!))];
    if (urls.length > 0) {
      lines.push(`\n\n---\n**Sources:**`);
      urls.forEach(u => lines.push(`- ${u}`));
    }

    return lines.join("\n");
  };

  /* ── @mention / reference helpers ── */
  const insertReference = (result: { url: string; name: string; logo: string }) => {
    if (!chatInputRef.current) return;
    chatInputRef.current.focus();
    const selection = window.getSelection();
    let range: Range;
    if (mentionState.active && mentionState.node && document.contains(mentionState.node)) {
      range = document.createRange();
      range.setStart(mentionState.node, mentionState.startOffset);
      range.setEnd(mentionState.node, mentionState.endOffset);
      range.deleteContents();
      setMentionState({ active: false, node: null, startOffset: 0, endOffset: 0 });
    } else if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      if (!chatInputRef.current.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(chatInputRef.current);
        range.collapse(false);
      }
    } else {
      range = document.createRange();
      range.selectNodeContents(chatInputRef.current);
      range.collapse(false);
    }
    const beforeSpace = document.createTextNode("\u200B");
    range.insertNode(beforeSpace);
    range.setStartAfter(beforeSpace);
    range.collapse(true);
    const refNode = document.createElement("span");
    refNode.contentEditable = "false";
    refNode.className =
      "inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-card border border-border align-middle mx-1 cursor-default shadow-sm select-none";
    refNode.innerHTML = `<img src="${result.logo}" alt="" class="w-3.5 h-3.5 rounded-sm pointer-events-none" /><span class="text-xs font-medium text-foreground max-w-[120px] truncate pointer-events-none">${result.name}</span>`;
    range.insertNode(refNode);
    range.setStartAfter(refNode);
    range.collapse(true);
    const afterSpace = document.createTextNode("\u00A0");
    range.insertNode(afterSpace);
    range.setStartAfter(afterSpace);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const searchResults =
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
      : [];

  /* click-outside */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropupRef.current && !dropupRef.current.contains(event.target as Node)) {
        setIsDropupOpen(false);
        setShowAgents(false);
        setShowEmployeesMenu(false);
        setShowReference(false);
      }
    }
    if (isDropupOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropupOpen]);

  /* ── Employee CRUD helpers (settings modal) ── */
  const handleDeleteEmployee = async (id: string) => {
    await supabase.from("ai_employees" as any).delete().eq("id", id);
    loadEmployees();
  };

  const handleUpdateEmployee = async (emp: AIEmployee) => {
    await supabase
      .from("ai_employees" as any)
      .update({ name: emp.name, role: emp.role, sop_purpose: emp.sop_purpose } as any)
      .eq("id", emp.id);
    loadEmployees();
  };

  const handleAddEmployee = async (employeeData: {
    name: string; role: string;
    sop_title?: string; sop_purpose?: string; sop_scope?: string;
    sop_procedure?: string[]; sop_responsibilities?: string[]; sop_safety_notes?: string;
  }) => {
    if (!user) return;
    await supabase.from("ai_employees" as any).insert({
      user_id: user.id,
      workspace_id: activeWorkspaceId || null,
      name: employeeData.name,
      role: employeeData.role,
      sop_title: employeeData.sop_title || null,
      sop_purpose: employeeData.sop_purpose || null,
      sop_scope: employeeData.sop_scope || null,
      sop_procedure: employeeData.sop_procedure || [],
      sop_responsibilities: employeeData.sop_responsibilities || [],
      sop_safety_notes: employeeData.sop_safety_notes || null,
      status: "active",
    } as any);
    loadEmployees();
  };

  /* ── Add Employee dialog state ── */
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [addEmployeePrompt, setAddEmployeePrompt] = useState("");
  const [isGeneratingEmployee, setIsGeneratingEmployee] = useState(false);
  const [generatedEmployee, setGeneratedEmployee] = useState<any>(null);

  const handleGenerateEmployee = async () => {
    if (!addEmployeePrompt.trim()) return;
    setIsGeneratingEmployee(true);
    setGeneratedEmployee(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please log in first"); return; }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-employee`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ prompt: addEmployeePrompt.trim() }),
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Failed to generate employee");
        return;
      }
      const data = await response.json();
      setGeneratedEmployee(data.employee);
    } catch {
      toast.error("Failed to generate employee");
    } finally {
      setIsGeneratingEmployee(false);
    }
  };

  const handleConfirmEmployee = async () => {
    if (!generatedEmployee) return;
    await handleAddEmployee(generatedEmployee);
    setShowAddEmployee(false);
    setAddEmployeePrompt("");
    setGeneratedEmployee(null);
    toast.success(`${generatedEmployee.name} has been created!`);
  };

  /* ─────────── Render ─────────── */
  return (
    <div className="h-full min-h-0 w-full bg-background flex relative overflow-hidden">
      {/* Main chat area */}
      <div className="flex-1 flex h-full min-h-0 flex-col overflow-hidden">
      {/* Sticky top agent selector */}
      <header className="shrink-0 z-20 flex justify-center items-center py-3 bg-background/80 backdrop-blur-md border-b border-border/30">
        {/* History toggle button */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="absolute right-4 p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          title={showHistory ? "Hide chat history" : "Show chat history"}
        >
          {showHistory ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>
        <div className="relative">
          <button
            onClick={() => setShowAgents(!showAgents)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            <Bot className="w-4 h-4 text-muted-foreground" />
            {selectedAgent || "Select Agent"}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showAgents ? "rotate-180" : ""}`} />
          </button>
          {showAgents && (
            <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] w-56 max-h-[60vh] overflow-y-auto bg-card rounded-2xl shadow-xl border border-border py-2 animate-in fade-in zoom-in-95 duration-200 z-50">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => { setSelectedAgent(agent.name); setShowAgents(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors ${selectedAgent === agent.name ? "text-primary font-semibold" : "text-muted-foreground"}`}
                >
                  {agent.name}
                </button>
              ))}
              {agents.length === 0 && (
                <p className="px-4 py-2 text-sm text-muted-foreground text-center">No agents yet — add a business in Business DNA</p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Central area: Orb when no messages, chat when messages exist */}
      <main ref={chatContainerRef} className="flex-1 min-h-0 flex flex-col relative z-10 overflow-y-auto overscroll-contain">
        {!hasMessages ? (
          /* ── Empty state with centered orb ── */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 animate-in fade-in zoom-in duration-700">
              <BusinessBrainOrb size={window.innerWidth < 640 ? 180 : 280} />
            </div>
            <div className="mt-6 sm:mt-8 text-center z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{selectedAgent}</h2>
              <p className="text-muted-foreground mt-2 font-medium text-sm sm:text-base">Ready to assist you</p>
            </div>
          </div>
        ) : (
          /* ── Chat messages ── */
          <div className="flex-1 min-h-full px-4 md:px-6 py-6 space-y-5 max-w-3xl mx-auto w-full">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 mr-3 mt-1">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
                      <BusinessBrainOrb size={32} />
                    </div>
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-5 py-3 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "rounded-bl-md text-foreground"
                )}>
                  {msg.role === "assistant" ? (
                    <div className="max-w-none text-foreground text-[14.5px] leading-[1.75]">
                      {/* Task step indicators */}
                      {msg.taskSteps && msg.taskSteps.length > 0 && (
                        <TaskStepsDisplay
                          steps={msg.taskSteps}
                          currentStepIndex={msg.currentStepIndex ?? -1}
                          isStreaming={msg.isStreaming}
                        />
                      )}
                      {/* Main content */}
                      {msg.content && (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({children}) => <h1 className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0">{children}</h1>,
                            h2: ({children}) => <h2 className="text-lg font-bold text-foreground mt-6 mb-3 first:mt-0">{children}</h2>,
                            h3: ({children}) => <h3 className="text-[15px] font-semibold text-foreground mt-5 mb-2 first:mt-0">{children}</h3>,
                            p: ({children}) => <p className="mb-4 last:mb-0 leading-[1.8] text-foreground/90">{children}</p>,
                            ul: ({children}) => <ul className="my-4 pl-6 space-y-2 list-disc marker:text-foreground/40">{children}</ul>,
                            ol: ({children}) => <ol className="my-4 pl-6 space-y-2 list-decimal marker:text-foreground/40">{children}</ol>,
                            li: ({children}) => <li className="leading-[1.7] text-foreground/90 pl-1">{children}</li>,
                            strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                            blockquote: ({children}) => <blockquote className="my-4 pl-4 border-l-2 border-primary/30 text-foreground/70 italic">{children}</blockquote>,
                            hr: () => <hr className="my-6 border-border/50" />,
                            code: ({children, className}) => {
                              const isChart = className?.includes("language-chart");
                              if (isChart) {
                                const text = String(children).replace(/\n$/, "");
                                return <InlineChatChart jsonString={text} />;
                              }
                              const isBlock = className?.includes("language-");
                              return isBlock
                                ? <code className={cn("block", className)}>{children}</code>
                                : <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] font-mono text-foreground/80">{children}</code>;
                            },
                            pre: ({children}) => {
                              // If the child is a chart, don't wrap in pre styling
                              const child = children as any;
                              if (child?.props?.className?.includes("language-chart")) {
                                return <>{children}</>;
                              }
                              return <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4 text-[13px]">{children}</pre>;
                            },
                            table: ({children}) => <div className="my-4 overflow-x-auto rounded-lg border border-border/50"><table className="w-full text-sm">{children}</table></div>,
                            thead: ({children}) => <thead className="bg-muted/50 border-b border-border/50">{children}</thead>,
                            th: ({children}) => <th className="px-4 py-2.5 text-left font-semibold text-foreground text-[13px]">{children}</th>,
                            td: ({children}) => <td className="px-4 py-2.5 border-t border-border/30 text-foreground/80">{children}</td>,
                            a: ({children, href}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">{children}</a>,
                          }}
                        >{msg.content}</ReactMarkdown>
                      )}
                      {msg.isStreaming && !msg.content && (!msg.taskSteps || msg.taskSteps.length === 0) && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-muted-foreground">Thinking...</span>
                          {msg.streamStartTime && <ThinkingTimer startTime={msg.streamStartTime} className="text-[11px]" />}
                        </div>
                      )}
                      {msg.isStreaming && msg.content && (!msg.taskSteps || msg.taskSteps.length === 0) && (
                        <span className="inline-block w-1.5 h-4 bg-foreground/50 animate-pulse ml-0.5" />
                      )}
                      {/* Inline document viewer */}
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
                    </div>
                  ) : (
                    <>
                      {msg.content}
                      {msg.employees && msg.employees.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {msg.employees.map(e => (
                            <span key={e.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-foreground/20 text-xs">
                              <User className="w-3 h-3" /> {e.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Chat Input */}
      <footer className="shrink-0 p-3 sm:p-4 md:p-6 w-full max-w-3xl mx-auto relative z-20 bg-background">
        <input
          type="file"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files) {
              const newFiles = Array.from(e.target.files).map((f) => ({ name: f.name, id: Math.random().toString(), file: f }));
              setUploadedFiles((prev) => [...prev, ...newFiles]);
            }
            e.target.value = "";
          }}
        />

        <div ref={dropupRef} className="relative flex flex-col bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border rounded-2xl p-2">
          {/* Chips row: files, employees, computer mode — all inline */}
          {(uploadedFiles.length > 0 || selectedChatEmployees.length > 0 || (isActionMode && extensionConnected)) && (
            <div className="flex flex-wrap gap-1.5 px-1 pb-2">
              {isActionMode && extensionConnected && (
                <div className="flex items-center gap-1.5 bg-foreground/10 border border-foreground/20 rounded-lg px-2.5 py-1.5">
                  <Monitor className="w-3.5 h-3.5 text-foreground" />
                  <span className="text-xs font-medium text-foreground">Computer ON</span>
                </div>
              )}
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-1.5 bg-foreground/10 border border-foreground/20 rounded-lg px-2.5 py-1.5 animate-in fade-in slide-in-from-bottom-2">
                  <FileUp className="w-3.5 h-3.5 text-foreground" />
                  <span className="text-xs font-medium text-foreground max-w-[120px] truncate">{file.name}</span>
                  <button onClick={() => setUploadedFiles((fs) => fs.filter((f) => f.id !== file.id))} className="text-foreground/60 hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {selectedChatEmployees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-1.5 bg-foreground/10 border border-foreground/20 rounded-lg px-2.5 py-1.5 animate-in fade-in slide-in-from-bottom-2">
                  <User className="w-3.5 h-3.5 text-foreground" />
                  <span className="text-xs font-medium text-foreground max-w-[120px] truncate">{emp.name}</span>
                  <button onClick={() => setSelectedChatEmployees((es) => es.filter((e) => e.id !== emp.id))} className="text-foreground/60 hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="relative flex items-center">
          {/* Dropup Menu */}
          {isDropupOpen && (
            <div className="absolute bottom-[calc(100%+12px)] left-0 w-72 max-h-[60vh] overflow-y-auto bg-card rounded-2xl shadow-xl border border-border py-2 animate-in slide-in-from-bottom-2 fade-in duration-200 z-40">
              <button
                onClick={() => { fileInputRef.current?.click(); setIsDropupOpen(false); }}
                className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 text-sm font-medium text-foreground transition-colors"
              >
                <FileUp className="w-4 h-4 text-muted-foreground" />
                Upload Files
              </button>

              {/* Reference sub-menu (inline expand) */}
              <div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowReference(!showReference); setShowEmployeesMenu(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center justify-between text-sm font-medium text-foreground transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    Reference (@)
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showReference ? "rotate-180" : ""}`} />
                </button>
                {showReference && (
                  <div className="px-3 pb-2" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search website or app..."
                        className="w-full bg-background/50 border border-border/50 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-0 focus:border-border outline-none transition-all placeholder-muted-foreground text-foreground"
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
                )}
              </div>

              {/* Employees sub-menu (inline expand) */}
              <div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowEmployeesMenu(!showEmployeesMenu); setShowReference(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center justify-between text-sm font-medium text-foreground transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    Employees
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showEmployeesMenu ? "rotate-180" : ""}`} />
                </button>
                {showEmployeesMenu && (
                  <div className="px-2 pb-2">
                    <div className="max-h-64 overflow-y-auto">
                      {employees.length > 0 ? (
                        employees.map((emp) => (
                          <button
                            key={emp.id}
                            onClick={() => {
                              const empData = { id: emp.id, name: emp.name, role: emp.role };
                              if (!selectedChatEmployees.find((e) => e.id === emp.id)) {
                                setSelectedChatEmployees([empData]);
                              }
                              setIsDropupOpen(false);
                              setShowEmployeesMenu(false);
                              setTimeout(() => autoRunEmployee(empData), 100);
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
                        onClick={() => { setIsSettingsOpen(true); setSettingsTab("employees"); setIsDropupOpen(false); setShowEmployeesMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded-lg transition-colors text-primary font-medium flex items-center gap-2"
                      >
                        <Settings className="w-3 h-3" />
                        Manage Employees
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action mode toggle / Extension install */}
              {!extensionConnected ? (
                <a
                  href="https://microsoftedge.microsoft.com/addons/detail/timewarp-%E2%80%93-ai-ceo/fajgkgjioehbiccafonfbdkjhoedceim"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { setIsDropupOpen(false); setShowEmployeesMenu(false); setShowReference(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center justify-between text-sm font-medium text-foreground transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                    Computer
                  </div>
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    Get Extension
                  </span>
                </a>
              ) : (
                <button
                  onClick={() => { setIsActionMode(!isActionMode); setIsDropupOpen(false); setShowEmployeesMenu(false); setShowReference(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center justify-between text-sm font-medium text-foreground transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Monitor className={`w-4 h-4 ${isActionMode ? "text-primary" : "text-muted-foreground"}`} />
                    Computer
                  </div>
                  <span className={`text-xs font-semibold ${isActionMode ? "text-primary" : "text-muted-foreground"}`}>
                    {isActionMode ? "ON" : "OFF"}
                  </span>
                </button>
              )}

              {/* Settings */}
              <button
                onClick={() => { setIsSettingsOpen(true); setIsDropupOpen(false); setShowEmployeesMenu(false); setShowReference(false); }}
                className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 text-sm font-medium text-foreground transition-colors"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                Settings
              </button>
            </div>
          )}

          {/* Plus button */}
          <div className="group relative">
            <button
              onClick={() => { setIsDropupOpen(!isDropupOpen); if (isDropupOpen) { setShowEmployeesMenu(false); setShowReference(false); } }}
              className={`p-2.5 rounded-full transition-all active:scale-95 flex items-center justify-center ${
                isActionMode
                  ? isDropupOpen ? "bg-primary/20 text-primary" : "text-primary hover:bg-primary/10"
                  : isDropupOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Contenteditable input */}
          <div className="flex-1 flex items-center px-3 py-1">
            <div
              ref={chatInputRef}
              contentEditable
              suppressContentEditableWarning
              className="flex-1 bg-transparent border-none outline-none text-foreground text-base min-w-[120px] max-h-[120px] overflow-y-auto whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:cursor-text cursor-text"
              data-placeholder="Ask me anything..."
              onInput={() => {
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
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (mentionState.active && searchResults.length > 0) {
                    const result = searchResults[0];
                    setReferencedUrls((prev) => [...prev, { id: Math.random().toString(), ...result }]);
                    insertReference(result);
                    setReferenceUrlInput("");
                    setIsDropupOpen(false);
                    setShowReference(false);
                    return;
                  }
                  handleSendMessage();
                }
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={isSending}
            className={`p-2.5 rounded-full text-primary-foreground transition-all active:scale-95 flex items-center justify-center shadow-sm ${
              isSending ? "opacity-50 cursor-not-allowed" : ""
            } ${isActionMode ? "bg-primary hover:bg-primary/90" : "bg-foreground hover:bg-foreground/90"}`}
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
          </button>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative w-full sm:max-w-4xl h-[85vh] sm:h-[600px] bg-background shadow-2xl border border-border rounded-t-2xl sm:rounded-2xl z-50 animate-in slide-in-from-bottom sm:zoom-in-95 fade-in duration-200 flex flex-col overflow-hidden">
            {/* Modal header with agent dropdown */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-card">
              <div className="w-8" />
              <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center">
                <h3 className="text-base sm:text-lg font-bold text-foreground">Settings</h3>
                <span className="text-muted-foreground">·</span>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="bg-transparent border border-border rounded-lg px-2 sm:px-3 py-1.5 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all cursor-pointer max-w-[140px] sm:max-w-none truncate"
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.name}>{agent.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
              {/* Sidebar — horizontal on mobile */}
              <div className="sm:w-64 bg-card border-b sm:border-b-0 sm:border-r border-border p-2 sm:p-4 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-y-auto shrink-0">
                {([
                  { key: "safety", label: "Safety", icon: Shield },
                  { key: "employees", label: "Employees", icon: Users },
                  { key: "connections", label: "Connections", icon: Link },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setSettingsTab(key)}
                    className={`text-left px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 sm:gap-3 whitespace-nowrap ${settingsTab === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 p-4 sm:p-8 overflow-y-auto flex flex-col">
                {settingsTab === "safety" && (
                  <div className="flex-1">
                    {(() => {
                      const activeBrand = brands.find(b => (b.agentName || b.name || "AI CEO") === selectedAgent);
                      if (activeBrand) {
                        return <SettingsView activeBrandId={activeBrand.id} />;
                      }
                      return (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                          <p>Select an agent to configure safety settings.</p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {settingsTab === "employees" && (
                  <div className="space-y-6 flex-1">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-4">Manage Employees</h4>
                      <div className="space-y-4">
                        {employees.map((emp) => (
                          <div key={emp.id} className="bg-card border border-border p-4 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 mr-4">
                                <input
                                  type="text"
                                  defaultValue={emp.name}
                                  onBlur={(e) => handleUpdateEmployee({ ...emp, name: e.target.value })}
                                  className="font-semibold text-foreground bg-transparent border-none p-0 focus:ring-0 w-full placeholder-muted-foreground outline-none"
                                  placeholder="Employee Name"
                                />
                                <input
                                  type="text"
                                  defaultValue={emp.role}
                                  onBlur={(e) => handleUpdateEmployee({ ...emp, role: e.target.value })}
                                  className="text-xs text-muted-foreground bg-transparent border-none p-0 focus:ring-0 w-full mt-0.5 placeholder-muted-foreground outline-none"
                                  placeholder="Role / Title"
                                />
                              </div>
                              <button onClick={() => handleDeleteEmployee(emp.id)} className="text-destructive hover:text-destructive/80 p-1 flex-shrink-0">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowAddEmployee(true)}
                        className="mt-4 w-full py-2.5 border border-dashed border-border text-muted-foreground rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Employee
                      </button>
                    </div>
                  </div>
                )}

                {settingsTab === "connections" && (
                  <div className="space-y-6 flex-1">
                    <h4 className="text-sm font-semibold text-foreground">Integrations</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Microsoft */}
                      {(() => { const connected = !!connectedProviders["microsoft"]; return (
                      <div className={cn(
                        "flex flex-col gap-3 p-5 rounded-xl border transition-all",
                        connected ? "border-primary/40 bg-primary/5" : "border-border/50 hover:border-primary/30"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center p-1.5">
                            <img src={logoMicrosoft} alt="Microsoft" className="h-7 w-7 object-contain" />
                          </div>
                          {connected && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">Enabled</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Microsoft</p>
                          <p className="text-xs text-muted-foreground">Outlook, OneDrive, Calendar</p>
                        </div>
                        {connected ? (
                          <Button variant="outline" size="sm" className="h-8 text-xs w-full gap-1.5 text-destructive hover:text-destructive" onClick={() => handleProviderDisconnect("microsoft")}>
                            Disconnect
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="h-8 text-xs w-full gap-1.5" onClick={() => handleProviderConnect("microsoft")} disabled={!!connectingProvider}>
                            {connectingProvider === "microsoft" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                            Connect
                          </Button>
                        )}
                      </div>
                      ); })()}

                      {/* Slack */}
                      {(() => { const connected = !!connectedProviders["slack"]; return (
                      <div className={cn(
                        "flex flex-col gap-3 p-5 rounded-xl border transition-all",
                        connected ? "border-primary/40 bg-primary/5" : "border-border/50 hover:border-primary/30"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center p-1.5">
                            <img src={logoSlack} alt="Slack" className="h-7 w-7 object-contain" />
                          </div>
                          {connected && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">Enabled</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Slack</p>
                          <p className="text-xs text-muted-foreground">Channels, Messages, Files</p>
                        </div>
                        {connected ? (
                          <Button variant="outline" size="sm" className="h-8 text-xs w-full gap-1.5 text-destructive hover:text-destructive" onClick={() => handleProviderDisconnect("slack")}>
                            Disconnect
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="h-8 text-xs w-full gap-1.5" onClick={() => handleProviderConnect("slack")} disabled={!!connectingProvider}>
                            {connectingProvider === "slack" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                            Connect
                          </Button>
                        )}
                      </div>
                      ); })()}

                      {/* HubSpot */}
                      {(() => { const connected = !!connectedProviders["hubspot"]; return (
                      <div className={cn(
                        "flex flex-col gap-3 p-5 rounded-xl border transition-all",
                        connected ? "border-primary/40 bg-primary/5" : "border-border/50 hover:border-primary/30"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center p-1.5">
                            <img src={logoHubspot} alt="HubSpot" className="h-7 w-7 object-contain" />
                          </div>
                          {connected && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">Enabled</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">HubSpot</p>
                          <p className="text-xs text-muted-foreground">CRM, Contacts, Deals</p>
                        </div>
                        {connected ? (
                          <Button variant="outline" size="sm" className="h-8 text-xs w-full gap-1.5 text-destructive hover:text-destructive" onClick={() => handleProviderDisconnect("hubspot")}>
                            Disconnect
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="h-8 text-xs w-full gap-1.5" onClick={() => handleProviderConnect("hubspot")} disabled={!!connectingProvider}>
                            {connectingProvider === "hubspot" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                            Connect
                          </Button>
                        )}
                      </div>
                      ); })()}

                      <div className="flex flex-col gap-3 p-5 rounded-xl border border-border/50 opacity-60">
                        <div className="flex items-center justify-between">
                          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center p-1.5">
                            <img src={logoGoogle} alt="Google" className="h-7 w-7 object-contain" loading="lazy" />
                          </div>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Soon</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Google</p>
                          <p className="text-xs text-muted-foreground">Gmail, Drive, Calendar</p>
                        </div>
                      </div>

                      {/* FortKnox - Coming Soon */}
                      <div className="flex flex-col gap-3 p-5 rounded-xl border border-border/50 opacity-60">
                        <div className="flex items-center justify-between">
                          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center p-1.5">
                            <img src={logoFortknox} alt="FortKnox" className="h-7 w-7 object-contain" loading="lazy" />
                          </div>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Soon</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">FortKnox</p>
                          <p className="text-xs text-muted-foreground">Secure data vault integration</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-center pt-2">
                      <IntegrationRequestDialog />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Dialog */}
      {showAddEmployee && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-base font-semibold">Create AI Employee</h3>
              </div>
              <button onClick={() => { setShowAddEmployee(false); setAddEmployeePrompt(""); setGeneratedEmployee(null); }} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {!generatedEmployee ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Describe what you want this employee to do. AI will configure it with the optimal name, role, and procedure.
                    </p>
                    <textarea
                      value={addEmployeePrompt}
                      onChange={(e) => setAddEmployeePrompt(e.target.value)}
                      placeholder="e.g. I need someone who monitors our social media mentions every morning, summarizes sentiment, and drafts response suggestions for negative comments..."
                      className="w-full h-32 px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
                      autoFocus
                      disabled={isGeneratingEmployee}
                    />
                  </div>
                  <Button
                    onClick={handleGenerateEmployee}
                    disabled={isGeneratingEmployee || addEmployeePrompt.trim().length < 3}
                    className="w-full gap-2"
                  >
                    {isGeneratingEmployee ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing & Configuring...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Generate Employee</>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {/* Preview generated employee */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{generatedEmployee.name}</p>
                        <p className="text-xs text-muted-foreground">{generatedEmployee.role}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Purpose</p>
                        <p className="text-sm text-foreground">{generatedEmployee.sop_purpose}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Scope</p>
                        <p className="text-sm text-foreground">{generatedEmployee.sop_scope}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Procedure</p>
                        <ol className="list-decimal list-inside space-y-1">
                          {(generatedEmployee.sop_procedure || []).map((step: string, i: number) => (
                            <li key={i} className="text-sm text-foreground">{step}</li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Responsibilities</p>
                        <ul className="list-disc list-inside space-y-1">
                          {(generatedEmployee.sop_responsibilities || []).map((r: string, i: number) => (
                            <li key={i} className="text-sm text-foreground">{r}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Safety Notes</p>
                        <p className="text-sm text-foreground">{generatedEmployee.sop_safety_notes}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setGeneratedEmployee(null); }}>
                      Regenerate
                    </Button>
                    <Button className="flex-1 gap-2" onClick={handleConfirmEmployee}>
                      <Plus className="w-4 h-4" /> Create Employee
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>{/* end main chat area */}

      {/* Chat History Sidebar — hidden on mobile */}
      {/* Desktop: inline sidebar */}
      {showHistory && !isMobileChatView && (
        <div className="hidden md:block shrink-0 h-full max-h-full">
          <ChatHistorySidebar
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
          />
        </div>
      )}

      {/* Mobile: Sheet overlay */}
      {isMobileChatView && (
        <Sheet open={showHistory} onOpenChange={setShowHistory}>
          <SheetContent side="right" className="w-[85vw] max-w-sm p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Chat History</SheetTitle>
            </SheetHeader>
            <ChatHistorySidebar
              activeChatId={activeChatId}
              onSelectChat={(session) => { handleSelectChat(session); setShowHistory(false); }}
              onNewChat={() => { handleNewChat(); setShowHistory(false); }}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
