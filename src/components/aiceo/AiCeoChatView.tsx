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
    setLogEntries([]);
    addLog("info", `Task: "${message}"`);
    addLog("loading", "Requesting browser session from server…");
    try {
      const res = await fetch(`${REPLIT_URL}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: message, instruction: message }),
      });

      addLog("navigate", `Server responded with status ${res.status}`);

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      console.log("Scrape response:", JSON.stringify(data));

      const sessionId = data.sessionId || data.session_id || null;
      if (sessionId) {
        addLog("info", `Session ID: ${sessionId.slice(0, 12)}…`);
      }

      const url = data.liveUrl || data.liveViewUrl || data.connectUrl || data.debuggerUrl || data.debugUrl || data.url || data.live_url;

      await supabase.from("scrape_jobs").insert({
        url: message,
        instruction: message,
        live_url: url || null,
        session_id: sessionId,
        status: url ? "started" : "no_url",
        result: url ? null : JSON.stringify(data),
      });

      addLog("info", "Job persisted to database");

      if (url) {
        addLog("navigate", `Connecting to live session…`);
        setLiveViewUrl(url);
        addLog("success", "Browser session active — streaming live view");
        addLog("observe", "AI agent is navigating the page…");

        // Simulate realistic agent lifecycle hints
        setTimeout(() => addLog("click", "Interacting with page elements…"), 3000);
        setTimeout(() => {
          addLog("takeover", "Manual takeover may be needed for login/2FA");
        }, 8000);
        setTimeout(() => addLog("resume", "AI agent resumed task execution"), 15000);
      } else {
        console.error("Response keys:", Object.keys(data));
        addLog("error", "No live URL returned — check server response");
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
            <div className="flex items-center gap-4 sm:gap-6 px-2" style={{ flexWrap: "nowrap" }}>
              {/* Research Card */}
              <button
                onClick={() => setMode("connectors")}
                style={{
                  width: "min(40vw, 280px)",
                  height: "min(50vw, 340px)",
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
                      fontSize: "clamp(18px, 4vw, 28px)",
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
                fontSize: "clamp(24px, 5vw, 36px)",
                fontWeight: 200,
                userSelect: "none",
                flexShrink: 0,
              }}>
                /
              </span>

              {/* Action Card - Coming Soon */}
              <div
                style={{
                  width: "min(40vw, 280px)",
                  height: "min(50vw, 340px)",
                  borderRadius: 24,
                  border: "none",
                  position: "relative",
                  overflow: "hidden",
                  opacity: 0.5,
                  transform: activeCard === "action" ? "scale(1.02)" : "scale(0.95)",
                  transition: "transform 0.4s ease, opacity 0.4s ease",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                  cursor: "default",
                }}
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
                    filter: "grayscale(0.5) brightness(0.6)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.6)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: "clamp(24px, 5vw, 36px)" }}>🔒</span>
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: "clamp(18px, 4vw, 28px)",
                      fontWeight: 800,
                      color: "#fff",
                      letterSpacing: "-0.02em",
                      textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    }}
                  >
                    Action
                  </span>
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Coming Soon
                  </span>
                </div>
              </div>
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
          <>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}>
              <div style={{
                width: "min(90vw, 700px)",
                aspectRatio: "16/10",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                position: "relative",
              }}>
                <span style={{ fontSize: 48 }}>🔒</span>
                <span style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.7)",
                }}>
                  Coming Soon
                </span>
                <span style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.35)",
                  maxWidth: 320,
                  textAlign: "center",
                  lineHeight: 1.5,
                }}>
                  The Action Agent browser is under development
                </span>
              </div>
            </div>
            <FloatingChat
              mode="action"
              onModeChange={(m) => setMode(m === "research" ? "connectors" : "action")}
              disabled
            />
          </>
        )}
      </div>


      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes revealTopDown {
          from { clip-path: inset(0 0 100% 0); }
          to { clip-path: inset(0 0 0 0); }
        }
        @keyframes bounceArrow {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
