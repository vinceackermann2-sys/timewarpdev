import React, { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoMicrosoft from "@/assets/logo-microsoft.png";
import logoSlack from "@/assets/logo-slack.png";
import { SyncPreferencesDialog } from "@/components/database/SyncPreferencesDialog";

interface ConnectorDef {
  id: string;
  name: string;
  description: string;
  logo: string;
  authType: "oauth" | "credentials";
}

const connectors: ConnectorDef[] = [
  { id: "microsoft", name: "Microsoft", description: "Outlook, OneDrive, Calendar", logo: logoMicrosoft, authType: "oauth" },
  { id: "slack", name: "Slack", description: "Channels, Messages, Team", logo: logoSlack, authType: "oauth" },
];

interface ConnectorGridProps {
  onConnect: (name: "Microsoft") => void;
  onModeChange: (mode: "research" | "action") => void;
  brandId?: string;
}

export function ConnectorGrid({ onConnect, onModeChange, brandId }: ConnectorGridProps) {
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [showSyncPrefs, setShowSyncPrefs] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check for OAuth return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    const oauthError = params.get("oauth_error");

    if (oauthSuccess) {
      toast.success(`${oauthSuccess.charAt(0).toUpperCase() + oauthSuccess.slice(1)} connected!`);
      window.history.replaceState({}, "", window.location.pathname);
      // Show sync preferences dialog instead of redirecting
      setConnectedProviders(prev => prev.includes(oauthSuccess) ? prev : [...prev, oauthSuccess]);
      setShowSyncPrefs(true);
      return;
    }
    if (oauthError) {
      toast.error(`Connection failed: ${oauthError}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Check existing connections
  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: "check-status" }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const connected = (data.connected || []).map((c: any) => c.provider);
        setConnectedProviders(connected);
      }
    } catch (err) {
      console.error("Failed to check connections:", err);
    }
  }, []);

  const handleConnect = async (connector: ConnectorDef) => {
    setConnectingProvider(connector.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in first");
        setConnectingProvider(null);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            provider: connector.id,
            action: "get-auth-url",
            returnPath: window.location.pathname,
            origin: window.location.origin,
            brandId,
          }),
        }
      );

      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error(data.error || "Failed to get authorization URL");
      }
    } catch (err) {
      console.error("Connect error:", err);
      toast.error("Failed to start connection");
    }
    setConnectingProvider(null);
  };

  const handleSyncConfirm = async (
    categories: { emails: boolean; events: boolean; files: boolean },
    limits: { emails: number; events: number; files: number }
  ) => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-provider-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ provider: "microsoft", categories, limits }),
        }
      );

      if (response.ok) {
        toast.success("Data synced successfully!");
        setShowSyncPrefs(false);
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Sync failed");
      }
    } catch (err) {
      toast.error("Sync failed");
    }
    setIsSyncing(false);
  };

  const isMobile = window.innerWidth < 640;

  return (
    <>
      <div
        className="flex flex-col items-center"
        style={{ animation: "fadeSlideUp 0.5s ease-out forwards" }}
      >
        <h2
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "clamp(28px, 5.5vw, 64px)",
            fontWeight: 800,
            color: "#fff",
            textAlign: "center",
            marginBottom: 16,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          Connect your{" "}
          <span className="text-primary">business</span>
        </h2>
        <p
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "clamp(14px, 3vw, 16px)",
            color: "rgba(255,255,255,0.45)",
            textAlign: "center",
            marginBottom: 48,
            maxWidth: 400,
            lineHeight: 1.6,
          }}
        >
          Connect one of your business tools to get started with your AI CEO
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 20,
            maxWidth: 280,
            width: "100%",
            padding: "0 16px",
          }}
        >
          {connectors.map((connector, i) => {
            const isConnected = connectedProviders.includes(connector.id);
            const isConnecting = connectingProvider === connector.id;

            return (
              <button
                key={connector.id}
                onClick={() => {
                  if (isConnected) {
                    setShowSyncPrefs(true);
                  } else if (!isConnecting) {
                    handleConnect(connector);
                  }
                }}
                disabled={isConnecting}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: isMobile ? "20px 12px" : "28px 20px",
                  borderRadius: 20,
                  background: isConnected
                    ? "rgba(74, 222, 128, 0.08)"
                    : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${isConnected ? "rgba(74, 222, 128, 0.3)" : "rgba(255,255,255,0.1)"}`,
                  cursor: isConnecting ? "wait" : "pointer",
                  transition: "all 0.3s ease",
                  animation: `fadeSlideUp 0.4s ease-out ${i * 0.1}s both`,
                }}
                className={!isConnecting ? "hover:scale-[1.05] active:scale-[0.97]" : ""}
                onMouseEnter={(e) => {
                  if (!isConnected) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99, 102, 241, 0.4)";
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(99, 102, 241, 0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isConnected) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                  }
                }}
              >
                {isConnecting ? (
                  <Loader2 size={32} className="animate-spin" style={{ color: "rgba(99, 102, 241, 0.8)" }} />
                ) : isConnected ? (
                  <CheckCircle size={32} style={{ color: "rgba(74, 222, 128, 0.9)" }} />
                ) : (
                  <img
                    src={connector.logo}
                    alt={connector.name}
                    style={{
                      width: 36,
                      height: 36,
                      objectFit: "contain",
                    }}
                  />
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 14,
                      fontWeight: 700,
                      color: isConnected ? "rgba(74, 222, 128, 0.9)" : "#fff",
                    }}
                  >
                    {isConnected ? "Connected — Configure Sync" : connector.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.35)",
                      textAlign: "center",
                    }}
                  >
                    {connector.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <SyncPreferencesDialog
        open={showSyncPrefs}
        onOpenChange={setShowSyncPrefs}
        onConfirm={handleSyncConfirm}
        isSyncing={isSyncing}
        currentUsageBytes={0}
        dataLimitBytes={1073741824}
        planLabel="Free"
      />

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
