import React, { useState, useEffect, useMemo } from "react";
import { Plug, Plug2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConnectorOAuth } from "@/hooks/useConnectorOAuth";
import { toast } from "sonner";
import { FloatingChat } from "./FloatingChat";

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

interface ConnectorGridProps {
  onConnect: (name: "Google" | "Microsoft" | "Slack") => void;
}

export function ConnectorGrid({ onConnect }: ConnectorGridProps) {
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean>>({
    Google: false,
    Microsoft: false,
    Slack: false,
  });

  // Check connection status on mount
  useEffect(() => {
    checkConnections();
  }, []);

  async function checkConnections() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;

      // Check Google
      const { data: googleConn } = await supabase
        .from("google_workspace_connections")
        .select("connected")
        .eq("user_id", userId)
        .single();

      // Check Slack
      const { data: slackInstalls } = await supabase
        .from("slack_installations")
        .select("team_name")
        .limit(1);

      setConnectionStatus({
        Google: googleConn?.connected ?? false,
        Microsoft: false, // Will check once table is populated
        Slack: (slackInstalls && slackInstalls.length > 0) ?? false,
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
      } catch {
        // Table might not exist yet in types
      }
    } catch (error) {
      console.error("[ConnectorGrid] Error checking connections:", error);
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

  const hasAnyConnection = useMemo(
    () => Object.values(connectionStatus).some(Boolean),
    [connectionStatus]
  );

  return (
    <>
      <div
        style={{
          animation: "fadeSlideUp 0.5s ease-out forwards",
          transition: "all 0.5s ease",
          ...(hasAnyConnection
            ? {
                position: "absolute" as const,
                top: 24,
                left: 0,
                right: 0,
              }
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

      {hasAnyConnection && <FloatingChat />}
    </>
  );
}
