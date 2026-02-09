import React, { useState, useCallback, useEffect } from "react";
import { useConnectorOAuth } from "@/hooks/useConnectorOAuth";
import { supabase } from "@/integrations/supabase/client";
import { ConnectorGrid } from "./ConnectorGrid";
import { BrowserWindow } from "./BrowserWindow";
import { FloatingChat } from "./FloatingChat";
import { ActivityLog, LogEntry } from "./ActivityLog";
import { Typewriter } from "@/components/ui/typewriter";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import researchBg from "@/assets/research-card-bg.png";
import actionBg from "@/assets/action-card-bg.png";

const REPLIT_URL = "https://timenodejs--vinceackermann2.replit.app";

const TYPEWRITER_TEXTS = ["research", "act"];
const TEXT_TO_CARD: Record<string, "research" | "action"> = {
  research: "research",
  act: "action",
};

export function AiCeoChatView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOAuthReturn = searchParams.has("google_connected") || searchParams.has("microsoft_connected") || searchParams.has("slack_installed");
  
  const [mode, setMode] = useState<"select" | "connectors" | "action">(isOAuthReturn ? "connectors" : "select");
  const [activeCard, setActiveCard] = useState<"research" | "action">("research");
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const { initiateOAuth } = useConnectorOAuth();

  // Clear OAuth query params on mount so they don't persist
  useEffect(() => {
    if (isOAuthReturn) {
      setSearchParams({}, { replace: true });
    }
  }, []);

  const handleTextChange = useCallback((_index: number, text: string) => {
    setActiveCard(TEXT_TO_CARD[text] ?? "research");
  }, []);

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setLogEntries((prev) => [
      ...prev,
      { id: crypto.randomUUID(), timestamp: new Date(), type, message },
    ]);
  }, []);

  const handleActionSend = useCallback(async (message: string) => {
    setBrowserLoading(true);
    setLiveViewUrl(null);
    addLog("info", `Task received: "${message}"`);
    addLog("loading", "Starting browser session…");
    try {
      const res = await fetch(`${REPLIT_URL}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: message, instruction: message }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      console.log("Scrape response:", JSON.stringify(data));
      const url = data.liveUrl || data.liveViewUrl || data.connectUrl || data.debuggerUrl || data.debugUrl || data.url || data.live_url;

      addLog("navigate", "Connecting to session…");

      await supabase.from("scrape_jobs").insert({
        url: message,
        instruction: message,
        live_url: url || null,
        session_id: data.sessionId || data.session_id || null,
        status: url ? "started" : "no_url",
        result: url ? null : JSON.stringify(data),
      });

      if (url) {
        setLiveViewUrl(url);
        addLog("success", "Browser session active");
      } else {
        console.error("Response keys:", Object.keys(data));
        addLog("error", "No live URL found in response");
        toast.error("No live URL found in response");
      }
    } catch (err: any) {
      console.error("Action request failed:", err);
      addLog("error", err.message || "Failed to start browser session");
      toast.error(err.message || "Failed to start browser session");
    } finally {
      setBrowserLoading(false);
    }
  }, [addLog]);

  return (
    <div className="relative min-h-screen w-full flex flex-col">
      {/* Simple dark background */}
      <div className="absolute inset-0 z-0" style={{
        background: "linear-gradient(180deg, #05070f 0%, #0a0f1e 40%, #0d1528 100%)",
      }} />

      {/* Subtle ambient glow */}
      <div className="absolute inset-0 z-0" style={{
        background: "radial-gradient(ellipse 80% 50% at 50% 80%, rgba(99, 102, 241, 0.06) 0%, transparent 60%)",
      }} />

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center select-none px-6">
        {mode === "select" && (
          <>
            <h1
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "clamp(44px, 6.5vw, 72px)",
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                textAlign: "center",
                marginBottom: 40,
              }}
            >
              {"We're born to "}
              <Typewriter
                text={TYPEWRITER_TEXTS}
                speed={80}
                deleteSpeed={50}
                waitTime={2000}
                loop={true}
                showCursor={true}
                cursorChar="|"
                className="text-primary"
                onTextChange={handleTextChange}
              />
            </h1>

            {/* Research / Action cards */}
            <div className="flex items-center gap-6">
              {/* Research Card */}
              <button
                onClick={() => setMode("connectors")}
                style={{
                  width: 280,
                  height: 340,
                  borderRadius: 24,
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                  transition: "transform 0.4s ease, opacity 0.4s ease, box-shadow 0.4s ease",
                  opacity: activeCard === "research" ? 1 : 0.4,
                  transform: activeCard === "research" ? "scale(1.05)" : "scale(0.95)",
                  boxShadow: activeCard === "research"
                    ? "0 0 40px rgba(99, 102, 241, 0.3), 0 8px 32px rgba(0,0,0,0.4)"
                    : "0 4px 16px rgba(0,0,0,0.3)",
                }}
                className="group"
              >
                <img
                  src={researchBg}
                  alt=""
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    animation: "revealTopDown 0.8s ease-out 0.2s both",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)",
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                    paddingBottom: 28,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#fff",
                      letterSpacing: "-0.02em",
                      textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    }}
                  >
                    Research
                  </span>
                </div>
              </button>

              {/* Divider */}
              <span style={{
                color: "rgba(255, 255, 255, 0.12)",
                fontSize: 36,
                fontWeight: 200,
                userSelect: "none",
              }}>
                /
              </span>

              {/* Action Card */}
              <button
                onClick={() => setMode("action")}
                style={{
                  width: 280,
                  height: 340,
                  borderRadius: 24,
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                  transition: "transform 0.4s ease, opacity 0.4s ease, box-shadow 0.4s ease",
                  opacity: activeCard === "action" ? 1 : 0.4,
                  transform: activeCard === "action" ? "scale(1.05)" : "scale(0.95)",
                  boxShadow: activeCard === "action"
                    ? "0 0 40px rgba(249, 115, 22, 0.25), 0 8px 32px rgba(0,0,0,0.4)"
                    : "0 4px 16px rgba(0,0,0,0.3)",
                }}
                className="group"
              >
                <img
                  src={actionBg}
                  alt=""
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    animation: "revealTopDown 0.8s ease-out 0.3s both",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)",
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                    paddingBottom: 28,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#fff",
                      letterSpacing: "-0.02em",
                      textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    }}
                  >
                    Action
                  </span>
                </div>
              </button>
            </div>

            <p
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 15,
                color: "rgba(255, 255, 255, 0.3)",
                fontWeight: 400,
                marginTop: 32,
                letterSpacing: "0.01em",
              }}
            >
              For better results research first
            </p>
          </>
        )}

        {mode === "connectors" && (
          <ConnectorGrid
            onConnect={(name) => initiateOAuth(name)}
            onModeChange={(m) => setMode(m === "research" ? "connectors" : "action")}
          />
        )}

        {mode === "action" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", gap: 16, padding: "0 16px" }}>
            <ActivityLog entries={logEntries} liveViewUrl={liveViewUrl} />
            <BrowserWindow liveViewUrl={liveViewUrl} loading={browserLoading} />
          </div>
        )}
      </div>

      {mode === "action" && (
        <FloatingChat
          mode="action"
          onModeChange={(m) => setMode(m === "research" ? "connectors" : "action")}
          onSend={handleActionSend}
          disabled={browserLoading}
        />
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes revealTopDown {
          from { clip-path: inset(0 0 100% 0); }
          to { clip-path: inset(0 0 0 0); }
        }
      `}</style>
    </div>
  );
}
