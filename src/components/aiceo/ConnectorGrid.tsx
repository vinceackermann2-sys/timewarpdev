import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Plug, Plug2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConnectorOAuth } from "@/hooks/useConnectorOAuth";
import { toast } from "sonner";
import { FloatingChat } from "./FloatingChat";
import ReactMarkdown from "react-markdown";

interface ConnectorDef {
  name: "Google" | "Microsoft" | "Slack";
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  connectedColor: string;
}

const connectors: ConnectorDef[] = [
  {
    name: "Google",
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    color: "rgba(66, 133, 244, 0.15)",
    borderColor: "rgba(66, 133, 244, 0.25)",
    connectedColor: "rgba(66, 133, 244, 0.3)",
  },
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
  {
    name: "Slack",
    icon: (
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
        <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
        <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
        <path d="M15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" fill="#ECB22E"/>
      </svg>
    ),
    color: "rgba(46, 182, 125, 0.12)",
    borderColor: "rgba(46, 182, 125, 0.25)",
    connectedColor: "rgba(46, 182, 125, 0.3)",
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
  return (
    <button
      onClick={connected ? onDisconnect : onConnect}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "24px 28px",
        borderRadius: 16,
        background: connected ? connector.connectedColor : connector.color,
        border: `1.5px solid ${connected ? "rgba(255,255,255,0.2)" : connector.borderColor}`,
        cursor: "pointer",
        transition: "all 0.3s ease",
        animation: `fadeSlideUp 0.4s ease-out ${index * 0.1}s both`,
        position: "relative",
        minWidth: 130,
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
          size={28}
          style={{
            color: "rgba(255, 255, 255, 0.9)",
            filter: "drop-shadow(0 0 6px rgba(255,255,255,0.3))",
          }}
        />
      ) : (
        connector.icon
      )}
      <span
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: connected ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.6)",
          letterSpacing: "0.01em",
        }}
      >
        {connector.name}
      </span>
    {connected && (
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
}

const MAX_MESSAGES = 3;

interface ConnectorGridProps {
  onConnect: (name: "Google" | "Microsoft" | "Slack") => void;
  onModeChange: (mode: "research" | "action") => void;
}

const RESEARCH_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-chat`;

export function ConnectorGrid({ onConnect, onModeChange }: ConnectorGridProps) {
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean>>({
    Google: false,
    Microsoft: false,
    Slack: false,
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({ name: "", email: "", phone: "" });
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  useEffect(() => {
    checkConnections();
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

      const { data: googleConn } = await supabase
        .from("google_workspace_connections")
        .select("connected")
        .eq("user_id", userId)
        .single();

      const { data: slackInstalls } = await supabase
        .from("slack_installations")
        .select("team_name")
        .limit(1);

      const googleConnected = googleConn?.connected ?? false;
      const slackConnected = (slackInstalls && slackInstalls.length > 0) ?? false;

      setConnectionStatus({
        Google: googleConnected,
        Microsoft: false,
        Slack: slackConnected,
      });

      // Check Microsoft
      try {
        const { data: msConn } = await supabase
          .from("microsoft_workspace_connections" as any)
          .select("connected")
          .eq("user_id", userId)
          .single();
        if (msConn) {
          setConnectionStatus(prev => ({ ...prev, Microsoft: (msConn as any).connected ?? false }));
        }
      } catch {}

      // If any connector is connected, load workspace data
      if (googleConnected || slackConnected) {
        loadWorkspaceData(userId);
      }
    } catch (error) {
      console.error("[ConnectorGrid] Error checking connections:", error);
    }
  }

  async function loadWorkspaceData(userId: string) {
    try {
      const { data } = await supabase
        .from("workspace_research")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (data) {
        setWorkspaceData(data);
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

      if (name === "Google") {
        await supabase
          .from("google_workspace_connections")
          .update({ connected: false })
          .eq("user_id", userId);
        await supabase
          .from("google_workspace_tokens")
          .delete()
          .eq("user_id", userId);
      } else if (name === "Microsoft") {
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
      setShowWaitlist(true);
      return;
    }
    const newCount = userMessageCount + 1;
    setUserMessageCount(newCount);
    const userMsg: ChatMessage = { role: "user", content: message };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    // Build context from workspace data
    const connectedContexts: any[] = [];
    if (workspaceData) {
      connectedContexts.push({
        type: "business-db",
        label: "Google Workspace Data",
        content: workspaceData,
      });
    }

    let assistantSoFar = "";
    try {
      const resp = await fetch(RESEARCH_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          connectedContexts,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (err: any) {
      console.error("Research chat error:", err);
      toast.error(err.message || "Failed to get AI response");
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process that request. Please try again." }]);
    } finally {
      setIsStreaming(false);
    }
  }, [messages, workspaceData, userMessageCount]);

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
            ? { position: "absolute" as const, top: 24, left: 0, right: 0, zIndex: 10 }
            : {}),
        }}
        className="flex flex-col items-center"
      >
        {!hasAnyConnection && (
          <h2
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "clamp(40px, 5.5vw, 64px)",
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
        <div className="flex items-center gap-5">
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
            top: 180,
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
            <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: msg.role === "user" ? "70%" : "95%",
                    padding: msg.role === "user" ? "12px 16px" : "20px 24px",
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
                  ) : (
                    <div
                      className="research-chat-md prose prose-invert max-w-none"
                      style={{ fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      <ReactMarkdown>{msg.content.replace(/\[INSIGHT:[^\]]+\]/g, '').replace(/\[SUGGEST:[^\]]+\]/g, '')}</ReactMarkdown>
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
                  gap: 12,
                  padding: "16px 0",
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
                </div>
              )}

              {/* Locked state — all messages used */}
              {userMessageCount >= MAX_MESSAGES && (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  padding: "32px 0",
                  animation: "fadeSlideUp 0.4s ease-out forwards",
                }}>
                  {/* Lock icon */}
                  <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 36 }}>🔒</span>
                  </div>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.6)",
                  }}>
                    You've used all {MAX_MESSAGES} free messages
                  </span>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.3)",
                    textAlign: "center",
                    maxWidth: 300,
                    lineHeight: 1.5,
                  }}>
                    Join the waitlist to get full access when we launch
                  </span>
                  {/* Arrow pointing down to button */}
                  <span style={{
                    fontSize: 20,
                    color: "rgba(99, 102, 241, 0.6)",
                    animation: "bounceArrow 1.2s ease-in-out infinite",
                  }}>
                    ↓
                  </span>
                  <button
                    onClick={() => setShowWaitlist(true)}
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#fff",
                      background: "hsl(var(--primary))",
                      border: "none",
                      borderRadius: 14,
                      padding: "12px 28px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: "0 0 24px rgba(99, 102, 241, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    Join Waitlist
                  </button>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
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

      <FloatingChat
        mode="research"
        onModeChange={onModeChange}
        onSend={handleResearchSend}
        disabled={isStreaming || userMessageCount >= MAX_MESSAGES}
      />
    </>
  );
}
