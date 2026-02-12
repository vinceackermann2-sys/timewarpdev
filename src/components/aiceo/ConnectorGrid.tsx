import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Plug, Plug2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConnectorOAuth } from "@/hooks/useConnectorOAuth";
import { toast } from "sonner";
import { FloatingChat } from "./FloatingChat";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";

interface ConnectorDef {
  name: "Microsoft";
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  connectedColor: string;
}

const connectors: ConnectorDef[] = [
  {
    name: "Microsoft",
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28">
        <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
        <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
      </svg>
    ),
    color: "rgba(0, 164, 239, 0.12)",
    borderColor: "rgba(0, 164, 239, 0.25)",
    connectedColor: "rgba(0, 164, 239, 0.3)",
  },
];

interface ConnectorCardProps {
  connector: ConnectorDef;
  connected: boolean;
  index: number;
  onConnect: () => void;
  onDisconnect: () => void;
}

function ConnectorCard({ connector, connected, index, onConnect, onDisconnect }: ConnectorCardProps) {
  const isMobile = window.innerWidth < 640;
  return (
    <button
      onClick={connected ? onDisconnect : onConnect}
      style={{
        display: "flex",
        flexDirection: isMobile ? "row" as const : "column" as const,
        alignItems: "center",
        justifyContent: "center",
        gap: isMobile ? 6 : 10,
        padding: isMobile ? "8px 12px" : "18px 20px",
        borderRadius: isMobile ? 12 : 16,
        background: connected ? connector.connectedColor : connector.color,
        border: `1.5px solid ${connected ? "rgba(255,255,255,0.2)" : connector.borderColor}`,
        cursor: "pointer",
        transition: "all 0.3s ease",
        animation: `fadeSlideUp 0.4s ease-out ${index * 0.1}s both`,
        position: "relative",
        minWidth: isMobile ? 0 : 100,
      }}
      className="hover:scale-[1.05] active:scale-[0.97]"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 24px ${connector.borderColor}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
      }}
    >
      {connected ? (
        <Plug2
          size={isMobile ? 18 : 28}
          style={{
            color: "rgba(255, 255, 255, 0.9)",
            filter: "drop-shadow(0 0 6px rgba(255,255,255,0.3))",
          }}
        />
      ) : (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: isMobile ? 20 : undefined, height: isMobile ? 20 : undefined }}>
          {React.cloneElement(connector.icon as React.ReactElement, isMobile ? { width: 20, height: 20 } : {})}
        </span>
      )}
      <span
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: isMobile ? 11 : 13,
          fontWeight: 600,
          color: connected ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.6)",
          letterSpacing: "0.01em",
        }}
      >
        {connector.name}
      </span>
    {connected && !isMobile && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: "rgba(74, 222, 128, 0.9)",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}
          >
            Connected
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255, 100, 100, 0.85)",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 6,
              background: "rgba(255, 80, 80, 0.1)",
              border: "1px solid rgba(255, 80, 80, 0.2)",
            }}
          >
            <Plug size={10} />
            Disconnect
          </span>
        </div>
      )}
    </button>
  );
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isSyncing?: boolean;
}

const MAX_MESSAGES = 3;

interface ConnectorGridProps {
  onConnect: (name: "Microsoft") => void;
  onModeChange: (mode: "research" | "action") => void;
}

const RESEARCH_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-chat`;

export function ConnectorGrid({ onConnect, onModeChange }: ConnectorGridProps) {
  const navigate = useNavigate();

  // Seed connection status from URL params so the animation triggers immediately on OAuth return
  const initialStatus = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      Microsoft: params.has("microsoft_connected"),
    };
  }, []);

  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean>>(initialStatus);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const syncAttemptRef = useRef(0);
  const syncInProgressRef = useRef(false);
  const syncPromiseRef = useRef<Promise<void> | null>(null);
  const syncResolveRef = useRef<(() => void) | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({ name: "", email: "", phone: "" });
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const isOAuthReturn = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("microsoft_connected");
  }, []);

  // Trigger an immediate background sync after OAuth return so data is available right away
  async function triggerImmediateSync() {
    if (syncInProgressRef.current) {
      console.log("[ConnectorGrid] Sync already in progress, skipping");
      return;
    }
    syncInProgressRef.current = true;
    // Create a promise that handleResearchSend can await
    syncPromiseRef.current = new Promise<void>((resolve) => {
      syncResolveRef.current = resolve;
    });
    try {
      console.log("[ConnectorGrid] Triggering immediate data sync...");
      const resp = await supabase.functions.invoke("sync-research");
      console.log("[ConnectorGrid] Immediate sync result:", resp.data);
    } catch (e) {
      console.error("[ConnectorGrid] Immediate sync failed:", e);
    } finally {
      syncInProgressRef.current = false;
      // Resolve the promise so any waiting handleResearchSend can proceed
      syncResolveRef.current?.();
      syncResolveRef.current = null;
      syncPromiseRef.current = null;
    }
  }

  useEffect(() => {
    // Listen for auth state changes (e.g. magic link sign-in after OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        console.log("[ConnectorGrid] Auth state changed:", event);
        checkConnections();

        // If this is an OAuth return, trigger immediate sync then load data
        if (isOAuthReturn) {
          syncAttemptRef.current = 0;
          await triggerImmediateSync();
        }
        loadWorkspaceData(session.user.id);
      }
    });

    checkConnections();

    // Also try to load workspace data immediately if we already have a session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        if (isOAuthReturn) {
          syncAttemptRef.current = 0;
          await triggerImmediateSync();
        }
        loadWorkspaceData(session.user.id);
      }
    });

    // Poll for data updates (sync may complete after initial load)
    const interval = setInterval(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) loadWorkspaceData(session.user.id);
      });
    }, isOAuthReturn ? 5000 : 15000); // Poll faster after OAuth return
    return () => { subscription.unsubscribe(); clearInterval(interval); };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function checkConnections() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;

      let microsoftConnected = false;

      // Microsoft
      try {
        const { data: msConn } = await supabase
          .from("microsoft_workspace_connections" as any)
          .select("connected")
          .eq("user_id", userId)
          .single();
        if (msConn) {
          microsoftConnected = (msConn as any).connected ?? false;
        }
      } catch {}

      setConnectionStatus(prev => ({
        Microsoft: prev.Microsoft || microsoftConnected,
      }));

      // Always load workspace data when we have a session
      loadWorkspaceData(userId);
    } catch (error) {
      console.error("[ConnectorGrid] Error checking connections:", error);
    }
  }

  async function loadWorkspaceData(userId: string) {
    try {
      const { data, error } = await supabase
        .from("workspace_research")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("[ConnectorGrid] loadWorkspaceData error:", error.message);
        return;
      }

      if (data) {
        const rawData = (data as any)?.raw_data || {};
        console.log("[ConnectorGrid] Workspace data loaded — sources:", rawData.sources, "emails:", (rawData.emails || []).length, "docs:", (rawData.documents || []).length);
        setWorkspaceData(data);
      } else {
        console.log("[ConnectorGrid] No workspace data yet for user", userId, "— will retry via polling");
        syncAttemptRef.current += 1;
      }
    } catch (error) {
      console.error("Error loading workspace data:", error);
    }
  }

  async function handleDisconnect(name: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;

      if (name === "Microsoft") {
        await (supabase as any)
          .from("microsoft_workspace_connections")
          .update({ connected: false })
          .eq("user_id", userId);
        await (supabase as any)
          .from("microsoft_workspace_tokens")
          .delete()
          .eq("user_id", userId);
      }

      setConnectionStatus(prev => ({ ...prev, [name]: false }));
      toast.success(`${name} disconnected`);
    } catch (error) {
      console.error(`[ConnectorGrid] Error disconnecting ${name}:`, error);
      toast.error(`Failed to disconnect ${name}`);
    }
  }

  const handleResearchSend = useCallback(async (message: string) => {
    if (userMessageCount >= MAX_MESSAGES) {
      setShowLimitPopup(true);
      return;
    }

    const newCount = userMessageCount + 1;
    setUserMessageCount(newCount);

    const userMsg: ChatMessage = { role: "user", content: message };

    // Always show an immediate waiting animation so the UI never gets stuck on an empty "Thinking..." bubble.
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "", isSyncing: true }]);
    setIsStreaming(true);

    let assistantSoFar = "";
    const controller = new AbortController();
    let hardFailsafe: ReturnType<typeof setTimeout> | undefined;

    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    const isWorkspaceReady = (data: any) => {
      const raw = data?.raw_data || {};
      const sources = Array.isArray(raw?.sources) ? raw.sources : [];
      return sources.length > 0;
    };

    const updateLastAssistant = (patch: Partial<ChatMessage>) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant") return prev;
        return prev.map((m, i) => (i === prev.length - 1 ? { ...m, ...patch } : m));
      });
    };

    const getSessionWithRetry = async (maxMs: number) => {
      const start = Date.now();
      let triedRefresh = false;

      while (Date.now() - start < maxMs) {
        const { data } = await supabase.auth.getSession();
        if (data.session) return data.session;

        if (!triedRefresh) {
          triedRefresh = true;
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData.session) return refreshData.session;
        }

        await sleep(500);
      }

      return null;
    };

    const waitForWorkspaceReady = async (userId: string, maxMs: number) => {
      const start = Date.now();

      while (Date.now() - start < maxMs) {
        const { data, error } = await supabase
          .from("workspace_research")
          .select("raw_data, updated_at")
          .eq("user_id", userId)
          .maybeSingle();

        if (!error && data && isWorkspaceReady(data)) {
          setWorkspaceData(data);
          return true;
        }

        await sleep(2500);
      }

      return false;
    };

    try {
      // 1) Ensure the user session is actually established after OAuth redirect.
      //    This is the main reason the very first message can fail (no session => no sync kickoff).
      const session = await getSessionWithRetry(8000);
      const accessToken = session?.access_token || "";
      const userId = session?.user?.id || null;

      // 2) If we have a user, ensure their workspace data is actually analyzed before calling the AI.
      //    (No credits are spent during this wait.)
      if (userId) {
        // Quick check first
        const { data: currentWs } = await supabase
          .from("workspace_research")
          .select("raw_data")
          .eq("user_id", userId)
          .maybeSingle();

        const alreadyReady = isWorkspaceReady(currentWs);

        if (!alreadyReady) {
          // Kick off a sync if one isn't running (or wait for the in-flight one).
          try {
            if (!syncInProgressRef.current) {
              await triggerImmediateSync();
            } else if (syncPromiseRef.current) {
              await Promise.race([syncPromiseRef.current, sleep(60000)]);
            }
          } catch (e) {
            console.warn("[ResearchChat] Sync kickoff/wait error (continuing):", e);
          }

          // Now wait until the DB has usable data.
          await waitForWorkspaceReady(userId, 120000);
        }
      }

      // 3) Only start the request timeout AFTER data is ready (or we timed out waiting for it).
      hardFailsafe = setTimeout(() => {
        console.warn("[ResearchChat] 60s failsafe — aborting");
        controller.abort();
        setIsStreaming(false);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content) {
            return prev.map((m, i) =>
              i === prev.length - 1
                ? { ...m, content: "Request timed out. Please try again.", isSyncing: false }
                : m
            );
          }
          return prev;
        });
      }, 60000);

      console.log("[ResearchChat] Sending request to research-chat...");

      const resp = await fetch(RESEARCH_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      console.log("[ResearchChat] Response status:", resp.status);

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();

        if (done) {
          // Final buffer flush — handle data without trailing newline
          if (textBuffer.trim()) {
            const remaining = textBuffer.trim();
            if (remaining.startsWith("data: ")) {
              const jsonStr = remaining.slice(6).trim();
              if (jsonStr !== "[DONE]") {
                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    assistantSoFar += content;
                    setMessages((prev) => {
                      const last = prev[prev.length - 1];
                      if (last?.role === "assistant") {
                        return prev.map((m, i) =>
                          i === prev.length - 1
                            ? { ...m, content: assistantSoFar, isSyncing: false }
                            : m
                        );
                      }
                      return [...prev, { role: "assistant", content: assistantSoFar }];
                    });
                  }
                } catch {
                  // ignore
                }
              }
            }
          }
          break;
        }

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          const line = textBuffer.slice(0, newlineIndex).replace(/\r$/, "");
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1
                      ? { ...m, content: assistantSoFar, isSyncing: false }
                      : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            console.warn(
              "[ResearchChat] Skipping unparseable SSE chunk:",
              jsonStr?.slice(0, 80)
            );
          }
        }
      }

      if (!assistantSoFar.trim()) {
        console.warn("[ResearchChat] Stream completed but no content received");
        updateLastAssistant({
          content: "I received your question but couldn't generate a response. Please try again.",
          isSyncing: false,
        });
      }
    } catch (err: any) {
      console.error("[ResearchChat] Error:", err);
      const errorMsg =
        err.name === "AbortError"
          ? "Request timed out. Please try again."
          : err.message || "Failed to get AI response";

      toast.error(errorMsg);

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) {
          return prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, content: `Sorry, something went wrong: ${errorMsg}`, isSyncing: false }
              : m
          );
        }
        if (last?.role === "assistant" && last.content) return prev;
        return [...prev, { role: "assistant", content: `Sorry, something went wrong: ${errorMsg}` }];
      });
    } finally {
      clearTimeout(hardFailsafe);
      setIsStreaming(false);
    }
  }, [messages, userMessageCount]);


  const handleWaitlistSubmit = useCallback(async () => {
    if (!waitlistForm.name.trim() || !waitlistForm.email.trim() || !waitlistForm.phone.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setWaitlistLoading(true);
    try {
      const { error } = await supabase.from("waitlist" as any).insert({
        name: waitlistForm.name.trim(),
        email: waitlistForm.email.trim(),
        phone: waitlistForm.phone.trim(),
      });
      if (error) throw error;
      setWaitlistSubmitted(true);
      toast.success("You've been added to the waitlist!");
    } catch (err: any) {
      console.error("Waitlist error:", err);
      toast.error("Failed to join waitlist. Please try again.");
    } finally {
      setWaitlistLoading(false);
    }
  }, [waitlistForm]);

  const hasAnyConnection = useMemo(
    () => Object.values(connectionStatus).some(Boolean),
    [connectionStatus]
  );

  return (
    <>
      {/* Connectors row — always at top, never affected by chat */}
      <div
        style={{
          animation: "fadeSlideUp 0.5s ease-out forwards",
          transition: "all 0.5s ease",
          ...(hasAnyConnection
            ? { position: "absolute" as const, top: 12, left: 0, right: 0, zIndex: 10 }
            : {}),
        }}
        className="flex flex-col items-center"
      >
        {!hasAnyConnection && (
          <h2
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "clamp(28px, 5.5vw, 64px)",
              fontWeight: 800,
              color: "#fff",
              textAlign: "center",
              marginBottom: 48,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            Know your{" "}
            <span className="text-primary">business</span>
          </h2>
        )}
        <div className="flex items-center gap-3 sm:gap-5 flex-wrap justify-center">
          {connectors.map((connector, i) => (
            <ConnectorCard
              key={connector.name}
              connector={connector}
              connected={connectionStatus[connector.name]}
              index={i}
              onConnect={() => onConnect(connector.name)}
              onDisconnect={() => handleDisconnect(connector.name)}
            />
          ))}
        </div>
      </div>

      {/* Chat area — sits below connectors with independent scroll */}
      {hasAnyConnection && (
        <div
          style={{
            position: "absolute",
            top: window.innerWidth < 640 ? 70 : 180,
            left: 0,
            right: 0,
            bottom: 90,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="custom-chat-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 24px 0",
            }}
          >
            <style>{`
              .custom-chat-scroll::-webkit-scrollbar {
                width: 6px;
              }
              .custom-chat-scroll::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.04);
                border-radius: 3px;
              }
              .custom-chat-scroll::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.15);
                border-radius: 3px;
              }
              .custom-chat-scroll::-webkit-scrollbar-thumb:hover {
                background: rgba(255,255,255,0.25);
              }
              .research-chat-md {
                font-size: 15px !important;
                line-height: 1.75 !important;
                color: rgba(255,255,255,0.88) !important;
              }
              .research-chat-md h1 {
                font-size: 26px !important;
                font-weight: 800 !important;
                margin: 20px 0 10px !important;
                color: #fff !important;
                border-bottom: 2px solid rgba(99,102,241,0.5);
                padding-bottom: 8px;
                letter-spacing: -0.02em;
              }
              .research-chat-md h2 {
                font-size: 21px !important;
                font-weight: 700 !important;
                margin: 18px 0 8px !important;
                color: #fff !important;
                border-bottom: 1px solid rgba(255,255,255,0.12);
                padding-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
              }
              .research-chat-md h3 {
                font-size: 17px !important;
                font-weight: 700 !important;
                margin: 14px 0 6px !important;
                color: rgba(167,139,250,1) !important;
                letter-spacing: -0.01em;
              }
              .research-chat-md h4 {
                font-size: 15px !important;
                font-weight: 700 !important;
                margin: 10px 0 4px !important;
                color: rgba(129,140,248,1) !important;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                font-size: 12px !important;
              }
              .research-chat-md strong {
                color: #fff !important;
                font-weight: 700 !important;
                background: rgba(99,102,241,0.1);
                padding: 0 3px;
                border-radius: 3px;
              }
              .research-chat-md em {
                color: rgba(253,224,71,0.9) !important;
                font-style: italic;
              }
              .research-chat-md p {
                margin: 8px 0 !important;
                line-height: 1.75 !important;
                color: rgba(255,255,255,0.85) !important;
              }
              .research-chat-md ul {
                margin: 10px 0 !important;
                padding-left: 0 !important;
                list-style: none !important;
              }
              .research-chat-md ol {
                margin: 10px 0 !important;
                padding-left: 24px !important;
              }
              .research-chat-md ul > li {
                margin: 6px 0 !important;
                color: rgba(255,255,255,0.88) !important;
                padding: 6px 12px !important;
                background: rgba(255,255,255,0.03) !important;
                border-radius: 8px !important;
                border-left: 3px solid rgba(99,102,241,0.4) !important;
                display: flex !important;
                align-items: flex-start !important;
                gap: 8px !important;
              }
              .research-chat-md ul > li::before {
                content: '▸' !important;
                color: rgba(99,102,241,0.8) !important;
                font-weight: 700 !important;
                flex-shrink: 0;
              }
              .research-chat-md ol > li {
                margin: 6px 0 !important;
                color: rgba(255,255,255,0.88) !important;
                padding: 4px 0 !important;
              }
              .research-chat-md ol > li::marker {
                color: rgba(99,102,241,0.8) !important;
                font-weight: 700 !important;
              }
              .research-chat-md blockquote {
                border-left: 4px solid rgba(99,102,241,0.7) !important;
                background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.04)) !important;
                padding: 12px 18px !important;
                margin: 12px 0 !important;
                border-radius: 0 12px 12px 0 !important;
                color: rgba(255,255,255,0.95) !important;
                font-weight: 500;
                font-size: 15px !important;
              }
              .research-chat-md blockquote p {
                margin: 4px 0 !important;
              }
              .research-chat-md hr {
                border: none !important;
                height: 2px !important;
                background: linear-gradient(90deg, transparent, rgba(99,102,241,0.5), rgba(167,139,250,0.3), transparent) !important;
                margin: 16px 0 !important;
              }
              .research-chat-md code {
                background: rgba(99,102,241,0.18) !important;
                padding: 3px 8px !important;
                border-radius: 6px !important;
                font-size: 13px !important;
                color: rgba(167,139,250,1) !important;
                font-weight: 600 !important;
                border: 1px solid rgba(99,102,241,0.2) !important;
              }
              .research-chat-md pre {
                background: rgba(15,15,30,0.6) !important;
                border: 1px solid rgba(99,102,241,0.2) !important;
                border-radius: 12px !important;
                padding: 16px !important;
                margin: 12px 0 !important;
                overflow-x: auto !important;
              }
              .research-chat-md pre code {
                background: transparent !important;
                border: none !important;
                padding: 0 !important;
                font-size: 13px !important;
                line-height: 1.6 !important;
              }
              .research-chat-md table {
                width: 100% !important;
                border-collapse: separate !important;
                border-spacing: 0 !important;
                margin: 12px 0 !important;
                border-radius: 12px !important;
                overflow: hidden !important;
                border: 1px solid rgba(99,102,241,0.2) !important;
              }
              .research-chat-md th {
                background: rgba(99,102,241,0.18) !important;
                color: #fff !important;
                font-weight: 700 !important;
                padding: 10px 14px !important;
                text-align: left !important;
                font-size: 13px !important;
                text-transform: uppercase !important;
                letter-spacing: 0.04em !important;
                border-bottom: 2px solid rgba(99,102,241,0.3) !important;
              }
              .research-chat-md td {
                padding: 8px 14px !important;
                border-bottom: 1px solid rgba(255,255,255,0.06) !important;
                color: rgba(255,255,255,0.85) !important;
                font-size: 14px !important;
              }
              .research-chat-md tr:hover td {
                background: rgba(99,102,241,0.05) !important;
              }
              .research-chat-md a {
                color: rgba(129,140,248,1) !important;
                text-decoration: underline !important;
                text-underline-offset: 3px !important;
              }
            `}</style>
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 8px", display: "flex", flexDirection: "column", gap: 16, width: "100%", boxSizing: "border-box" }}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: msg.role === "user" ? "85%" : "100%",
                    overflowWrap: "break-word" as const,
                    wordBreak: "break-word" as const,
                    minWidth: 0,
                    padding: msg.role === "user" ? "10px 14px" : "16px 18px",
                    borderRadius: 16,
                    background: msg.role === "user"
                      ? "rgba(99, 102, 241, 0.2)"
                      : "rgba(255, 255, 255, 0.04)",
                    border: `1px solid ${msg.role === "user" ? "rgba(99, 102, 241, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
                    animation: "fadeSlideUp 0.3s ease-out forwards",
                  }}
                >
                  {msg.role === "user" ? (
                    <p style={{ color: "#fff", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                      {msg.content}
                    </p>
                  ) : msg.isSyncing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Loader2 size={16} className="animate-spin" style={{ color: "rgba(99, 102, 241, 0.8)" }} />
                        <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Analyzing your business data...</span>
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                        This usually takes 15–30 seconds on first connection. I'll respond to your question as soon as I have your data.
                      </p>
                      <div style={{ width: "100%", height: 4, borderRadius: 2, background: "rgba(99, 102, 241, 0.1)", overflow: "hidden" }}>
                        <div style={{ 
                          height: "100%", 
                          borderRadius: 2,
                          background: "linear-gradient(90deg, rgba(99, 102, 241, 0.6), rgba(139, 92, 246, 0.6))",
                          animation: "syncPulse 2s ease-in-out infinite",
                          width: "60%",
                        }} />
                      </div>
                    </div>
                  ) : msg.content ? (
                    <div
                      className="research-chat-md prose prose-invert max-w-none"
                      style={{ fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      <ReactMarkdown>{msg.content.replace(/\[INSIGHT:[^\]]+\]/g, '').replace(/\[SUGGEST:[^\]]+\]/g, '')}</ReactMarkdown>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                      <Loader2 size={14} className="animate-spin" style={{ color: "rgba(99, 102, 241, 0.7)" }} />
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Thinking...</span>
                    </div>
                  )}
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                  <Loader2 size={16} className="animate-spin" style={{ color: "rgba(99, 102, 241, 0.7)" }} />
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Analyzing your business data...</span>
                </div>
              )}

              {/* Message counter & waitlist button — show after first AI response */}
              {userMessageCount >= 1 && userMessageCount < MAX_MESSAGES && !isStreaming && (
                 <div style={{
                   display: "flex",
                   alignItems: "center",
                   justifyContent: "center",
                   gap: 8,
                   padding: "12px 0",
                   flexWrap: "wrap",
                  animation: "fadeSlideUp 0.3s ease-out forwards",
                }}>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.4)",
                  }}>
                    {MAX_MESSAGES - userMessageCount} message{MAX_MESSAGES - userMessageCount !== 1 ? "s" : ""} left
                  </span>
                  <button
                    onClick={() => setShowWaitlist(true)}
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "hsl(var(--primary))",
                      background: "rgba(99, 102, 241, 0.15)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      borderRadius: 10,
                      padding: "6px 16px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(99, 102, 241, 0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(99, 102, 241, 0.15)";
                    }}
                  >
                     Join Waitlist
                   </button>
                   <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>or</span>
                   <button
                     onClick={() => navigate("/timewarp-og")}
                     style={{
                       fontFamily: "'Plus Jakarta Sans', sans-serif",
                       fontSize: 13,
                       fontWeight: 700,
                       color: "#fff",
                       background: "linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(245, 158, 11, 0.15))",
                       border: "1px solid rgba(251, 191, 36, 0.4)",
                       borderRadius: 10,
                       padding: "6px 16px",
                       cursor: "pointer",
                       transition: "all 0.2s ease",
                     }}
                     onMouseEnter={(e) => {
                       e.currentTarget.style.background = "linear-gradient(135deg, rgba(251, 191, 36, 0.4), rgba(245, 158, 11, 0.25))";
                       e.currentTarget.style.transform = "scale(1.05)";
                     }}
                     onMouseLeave={(e) => {
                       e.currentTarget.style.background = "linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(245, 158, 11, 0.15))";
                       e.currentTarget.style.transform = "scale(1)";
                     }}
                   >
                     ⚡ Become TimeWarp OG
                   </button>
                 </div>
               )}

              {/* Locked state — all messages used */}
               {userMessageCount >= MAX_MESSAGES && !showLimitPopup && (
                 <div style={{
                   display: "flex",
                   flexDirection: "column",
                   alignItems: "center",
                   gap: 16,
                   padding: "32px 0",
                   animation: "fadeSlideUp 0.4s ease-out forwards",
                 }}>
                   <div style={{
                     width: 72, height: 72, borderRadius: 20,
                     background: "rgba(255,255,255,0.04)",
                     border: "1px solid rgba(255,255,255,0.08)",
                     display: "flex", alignItems: "center", justifyContent: "center",
                   }}>
                     <span style={{ fontSize: 36 }}>🔒</span>
                   </div>
                   <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>
                     You've used all {MAX_MESSAGES} free messages
                   </span>
                   <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", maxWidth: 300, lineHeight: 1.5 }}>
                     Unlock full access to your AI business advisor
                   </span>
                   <span style={{ fontSize: 20, color: "rgba(99, 102, 241, 0.6)", animation: "bounceArrow 1.2s ease-in-out infinite" }}>↓</span>
                   <button
                     onClick={() => setShowLimitPopup(true)}
                     style={{
                       fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700,
                       color: "#fff", background: "hsl(var(--primary))", border: "none",
                       borderRadius: 14, padding: "12px 28px", cursor: "pointer",
                       transition: "all 0.2s ease", boxShadow: "0 0 24px rgba(99, 102, 241, 0.3)",
                     }}
                     onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
                     onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                   >
                     Continue
                   </button>
                 </div>
               )}

              <div ref={chatEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Limit reached — choice popup */}
      {showLimitPopup && !showWaitlist && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(8px)",
            animation: "fadeSlideUp 0.3s ease-out forwards",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLimitPopup(false); }}
        >
          <div style={{
            width: "min(90vw, 420px)", background: "rgba(15, 18, 35, 0.98)",
            border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: 20,
            padding: "36px 28px", display: "flex", flexDirection: "column", gap: 20, alignItems: "center",
          }}>
            <span style={{ fontSize: 48 }}>🚀</span>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", textAlign: "center", margin: 0 }}>
              Unlock Full Access
            </h3>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
              You've used all {MAX_MESSAGES} free messages. Choose how you'd like to continue:
            </p>

            {/* Waitlist option */}
            <button
              onClick={() => { setShowLimitPopup(false); setShowWaitlist(true); }}
              style={{
                width: "100%", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700,
                color: "#fff", background: "hsl(var(--primary))", border: "none",
                borderRadius: 14, padding: "14px 28px", cursor: "pointer",
                transition: "all 0.2s ease", boxShadow: "0 0 24px rgba(99, 102, 241, 0.3)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              📋 Join Waitlist
            </button>

            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>or</span>

            {/* OG option */}
            <button
              onClick={() => navigate("/timewarp-og")}
              style={{
                width: "100%", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700,
                color: "#fff", background: "linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.2))",
                border: "1px solid rgba(251, 191, 36, 0.4)", borderRadius: 14,
                padding: "14px 28px", cursor: "pointer", transition: "all 0.2s ease",
                boxShadow: "0 0 24px rgba(251, 191, 36, 0.2)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 0 32px rgba(251, 191, 36, 0.35)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 0 24px rgba(251, 191, 36, 0.2)"; }}
            >
              ⚡ Become TimeWarp OG
            </button>
          </div>
        </div>
      )}

      {/* Waitlist modal overlay */}
      {showWaitlist && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(8px)",
            animation: "fadeSlideUp 0.3s ease-out forwards",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowWaitlist(false);
          }}
        >
          <div
            style={{
              width: "min(90vw, 400px)",
              background: "rgba(15, 18, 35, 0.98)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              borderRadius: 20,
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {waitlistSubmitted ? (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontSize: 48 }}>🎉</span>
                <h3 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#fff",
                }}>
                  You're on the list!
                </h3>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.5)",
                }}>
                  We'll reach out when more capacity is available.
                </p>
                <button
                  onClick={() => setShowWaitlist(false)}
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#fff",
                    background: "hsl(var(--primary))",
                    border: "none",
                    borderRadius: 12,
                    padding: "10px 24px",
                    cursor: "pointer",
                    marginTop: 8,
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div style={{ textAlign: "center" }}>
                  <h3 style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#fff",
                    marginBottom: 6,
                  }}>
                    Join the Waitlist
                  </h3>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.4)",
                  }}>
                    {userMessageCount >= MAX_MESSAGES
                      ? `You've used all ${MAX_MESSAGES} messages. Join the waitlist for full access.`
                      : `${MAX_MESSAGES - userMessageCount} message${MAX_MESSAGES - userMessageCount !== 1 ? "s" : ""} left. Join the waitlist for full access.`}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input
                    type="text"
                    placeholder="Name"
                    value={waitlistForm.name}
                    onChange={(e) => setWaitlistForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      fontSize: 14,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      outline: "none",
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={waitlistForm.email}
                    onChange={(e) => setWaitlistForm(prev => ({ ...prev, email: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      fontSize: 14,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      outline: "none",
                    }}
                  />
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={waitlistForm.phone}
                    onChange={(e) => setWaitlistForm(prev => ({ ...prev, phone: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      fontSize: 14,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  onClick={handleWaitlistSubmit}
                  disabled={waitlistLoading}
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#fff",
                    background: "hsl(var(--primary))",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 24px",
                    cursor: waitlistLoading ? "not-allowed" : "pointer",
                    opacity: waitlistLoading ? 0.7 : 1,
                    transition: "all 0.2s ease",
                  }}
                >
                  {waitlistLoading ? "Submitting..." : "Join Waitlist"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Arrow instruction when no source connected */}
      {!hasAnyConnection && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            left: 0,
            right: 0,
            zIndex: 49,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            animation: "bounceArrow 2s ease-in-out infinite",
            pointerEvents: "none",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ transform: "rotate(180deg)" }}>
            <path d="M12 5v14M5 12l7 7 7-7" stroke="rgba(99, 102, 241, 0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.45)",
              letterSpacing: "0.02em",
            }}
          >
            Connect a source first to start chatting
          </span>
        </div>
      )}

      <FloatingChat
        mode="research"
        onModeChange={onModeChange}
        onSend={handleResearchSend}
        disabled={isStreaming || userMessageCount >= MAX_MESSAGES || !hasAnyConnection}
      />
    </>
  );
}
