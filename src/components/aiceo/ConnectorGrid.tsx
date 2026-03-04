import React, { useState, useEffect, useCallback } from "react";
import { Plug2, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import logoMicrosoft from "@/assets/logo-microsoft.png";
import logoWordpress from "@/assets/logo-wordpress.png";

interface ConnectorDef {
  id: string;
  name: string;
  description: string;
  logo: string;
  authType: "oauth" | "credentials";
}

const connectors: ConnectorDef[] = [
  { id: "microsoft", name: "Microsoft", description: "Outlook, OneDrive, Calendar", logo: logoMicrosoft, authType: "oauth" },
  { id: "wordpress", name: "WordPress", description: "Posts, Pages, Media", logo: logoWordpress, authType: "credentials" },
];

interface ConnectorGridProps {
  onConnect: (name: "Microsoft") => void;
  onModeChange: (mode: "research" | "action") => void;
}

export function ConnectorGrid({ onConnect, onModeChange }: ConnectorGridProps) {
  const navigate = useNavigate();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [showWpForm, setShowWpForm] = useState(false);
  const [wpSiteUrl, setWpSiteUrl] = useState("");
  const [wpUsername, setWpUsername] = useState("");
  const [wpAppPassword, setWpAppPassword] = useState("");

  // Check for OAuth return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    const oauthError = params.get("oauth_error");

    if (oauthSuccess) {
      toast.success(`${oauthSuccess.charAt(0).toUpperCase() + oauthSuccess.slice(1)} connected!`);
      window.history.replaceState({}, "", window.location.pathname);
      // Successfully connected — navigate to app
      navigate("/app", { replace: true });
      return;
    }
    if (oauthError) {
      toast.error(`Connection failed: ${oauthError}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [navigate]);

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
    if (connector.authType === "credentials") {
      setShowWpForm(true);
      return;
    }

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
          body: JSON.stringify({ provider: connector.id, action: "get-auth-url" }),
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

  const handleWordPressConnect = async () => {
    if (!wpSiteUrl || !wpUsername || !wpAppPassword) {
      toast.error("Please fill in all WordPress fields");
      return;
    }

    setConnectingProvider("wordpress");
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
            provider: "wordpress",
            action: "save-credentials",
            siteUrl: wpSiteUrl,
            username: wpUsername,
            appPassword: wpAppPassword,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("WordPress connected!");
        navigate("/app", { replace: true });
      } else {
        toast.error(data.error || "Failed to connect WordPress");
      }
    } catch (err) {
      console.error("WordPress connect error:", err);
      toast.error("Failed to connect WordPress");
    }
    setConnectingProvider(null);
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
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2, 1fr)",
            gap: isMobile ? 12 : 20,
            maxWidth: 440,
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
                onClick={() => !isConnected && !isConnecting && handleConnect(connector)}
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
                  cursor: isConnecting ? "wait" : isConnected ? "default" : "pointer",
                  transition: "all 0.3s ease",
                  animation: `fadeSlideUp 0.4s ease-out ${i * 0.1}s both`,
                }}
                className={!isConnected && !isConnecting ? "hover:scale-[1.05] active:scale-[0.97]" : ""}
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
                    {isConnected ? "Connected" : connector.name}
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

      {/* WordPress credentials modal */}
      {showWpForm && (
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
            if (e.target === e.currentTarget) setShowWpForm(false);
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
              gap: 16,
            }}
          >
            <h3
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 20,
                fontWeight: 800,
                color: "#fff",
                textAlign: "center",
                margin: 0,
              }}
            >
              Connect WordPress
            </h3>
            <p
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13,
                color: "rgba(255,255,255,0.4)",
                textAlign: "center",
                margin: 0,
              }}
            >
              Use an Application Password for secure access
            </p>
            <input
              type="url"
              placeholder="Site URL (https://yoursite.com)"
              value={wpSiteUrl}
              onChange={(e) => setWpSiteUrl(e.target.value)}
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
              type="text"
              placeholder="Username"
              value={wpUsername}
              onChange={(e) => setWpUsername(e.target.value)}
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
              type="password"
              placeholder="Application Password"
              value={wpAppPassword}
              onChange={(e) => setWpAppPassword(e.target.value)}
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
            <button
              onClick={handleWordPressConnect}
              disabled={connectingProvider === "wordpress"}
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                background: "hsl(var(--primary))",
                border: "none",
                borderRadius: 12,
                padding: "12px 24px",
                cursor: connectingProvider === "wordpress" ? "not-allowed" : "pointer",
                opacity: connectingProvider === "wordpress" ? 0.7 : 1,
                transition: "all 0.2s ease",
              }}
            >
              {connectingProvider === "wordpress" ? "Connecting..." : "Connect WordPress"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
