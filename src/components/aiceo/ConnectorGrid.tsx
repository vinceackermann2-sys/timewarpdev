import React, { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoMsOutlook from "@/assets/logo-ms-outlook.svg";
import logoMsOnedrive from "@/assets/logo-ms-onedrive.svg";
import logoMsOnenote from "@/assets/logo-ms-onenote.svg";
import logoMsTeams from "@/assets/logo-ms-teams.svg";
import logoSlack from "@/assets/logo-slack.png";
import logoHubspot from "@/assets/logo-hubspot.svg";
import logoZoom from "@/assets/logo-zoom.svg";
import logoGoogleCalendar from "@/assets/logo-google-calendar.svg";
import logoGoogleDrive from "@/assets/logo-google-drive.svg";
import logoGoogleDocs from "@/assets/logo-google-docs.svg";
import logoGoogleSheets from "@/assets/logo-google-sheets.svg";
import logoGoogleSlides from "@/assets/logo-google-slides.svg";
import logoGmail from "@/assets/logo-gmail.svg";

interface ConnectorDef {
  id: string;
  name: string;
  description: string;
  logo: string;
}


  { id: "microsoft_outlook", name: "Outlook", description: "Emails, contacts & calendar", logo: logoMsOutlook },
  { id: "microsoft_onedrive", name: "OneDrive", description: "Files & documents", logo: logoMsOnedrive },
  { id: "microsoft_onenote", name: "OneNote", description: "Notes & notebooks", logo: logoMsOnenote },
  { id: "microsoft_teams", name: "Teams", description: "Messages & channels", logo: logoMsTeams },
  { id: "google_calendar", name: "Calendar", description: "Events & scheduling", logo: logoGoogleCalendar },
  { id: "google_drive", name: "Drive", description: "Files & folders", logo: logoGoogleDrive },
  { id: "google_docs", name: "Docs", description: "Documents", logo: logoGoogleDocs },
  { id: "google_sheets", name: "Sheets", description: "Spreadsheets", logo: logoGoogleSheets },
  { id: "google_slides", name: "Slides", description: "Presentations", logo: logoGoogleSlides },
  { id: "google_gmail", name: "Gmail", description: "Emails & contacts", logo: logoGmail },
  { id: "slack", name: "Slack", description: "Messages & channels", logo: logoSlack },
  { id: "hubspot", name: "HubSpot", description: "CRM, contacts & deals", logo: logoHubspot },
  { id: "zoom", name: "Zoom", description: "Meetings & recordings", logo: logoZoom },
];

interface ConnectorGridProps {
  onConnect: (name: "Microsoft") => void;
  onModeChange: (mode: "research" | "action") => void;
  brandId?: string;
}

export function ConnectorGrid({ onConnect, onModeChange, brandId }: ConnectorGridProps) {
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    const oauthError = params.get("oauth_error");

    if (oauthSuccess) {
      const label = connectors.find(c => c.id === oauthSuccess)?.name || oauthSuccess;
      toast.success(`${label} connected!`);
      window.history.replaceState({}, "", window.location.pathname);
      setConnectedProviders(prev => prev.includes(oauthSuccess) ? prev : [...prev, oauthSuccess]);
      return;
    }
    if (oauthError) {
      toast.error(`Connection failed: ${oauthError}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => { checkConnections(); }, []);

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
          Connect only the services you need — each with minimal permissions
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr",
            gap: 16,
            maxWidth: 400,
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
                  if (!isConnected && !isConnecting) {
                    handleConnect(connector);
                  }
                }}
                disabled={isConnecting}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: isMobile ? "18px 12px" : "24px 16px",
                  borderRadius: 16,
                  background: isConnected
                    ? "rgba(74, 222, 128, 0.08)"
                    : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${isConnected ? "rgba(74, 222, 128, 0.3)" : "rgba(255,255,255,0.1)"}`,
                  cursor: isConnecting ? "wait" : "pointer",
                  transition: "all 0.3s ease",
                  animation: `fadeSlideUp 0.4s ease-out ${i * 0.08}s both`,
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
                  <Loader2 size={28} className="animate-spin" style={{ color: "rgba(99, 102, 241, 0.8)" }} />
                ) : isConnected ? (
                  <CheckCircle size={28} style={{ color: "rgba(74, 222, 128, 0.9)" }} />
                ) : (
                  <img
                    src={connector.logo}
                    alt={connector.name}
                    style={{ width: 32, height: 32, objectFit: "contain" }}
                    loading="lazy"
                  />
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 700,
                      color: isConnected ? "rgba(74, 222, 128, 0.9)" : "#fff",
                    }}
                  >
                    {isConnected ? "Connected" : connector.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 10,
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

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
