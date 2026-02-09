import React, { useState, useEffect } from "react";
import { useConnectorOAuth } from "@/hooks/useConnectorOAuth";
import { ConnectorGrid } from "./ConnectorGrid";

export function AiCeoChatView() {
  const [mode, setMode] = useState<"select" | "connectors">("select");
  const [activeWord, setActiveWord] = useState<"research" | "action">("research");
  const [fade, setFade] = useState(true);
  const { initiateOAuth } = useConnectorOAuth();

  // Cycle animation between research and action
  useEffect(() => {
    if (mode !== "select") return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setActiveWord((prev) => (prev === "research" ? "action" : "research"));
        setFade(true);
      }, 350);
    }, 2200);
    return () => clearInterval(interval);
  }, [mode]);

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
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center select-none">
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
              }}
            >
              Do you want
            </h1>

            {/* Research / Action buttons */}
            <div className="flex items-center gap-6" style={{ marginTop: 32 }}>
              <button
                onClick={() => setMode("connectors")}
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "clamp(36px, 5vw, 56px)",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 16px",
                  borderRadius: 16,
                  transition: "transform 0.3s ease, opacity 0.3s ease",
                  opacity: fade && activeWord === "research" ? 1 : 0.3,
                  transform: fade && activeWord === "research" ? "scale(1.08)" : "scale(1)",
                }}
                className="hover:opacity-80 active:scale-95"
              >
                research
              </button>
              <span style={{
                color: "rgba(255, 255, 255, 0.15)",
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 300,
              }}>
                /
              </span>
              <button
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "clamp(36px, 5vw, 56px)",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 16px",
                  borderRadius: 16,
                  transition: "transform 0.3s ease, opacity 0.3s ease",
                  opacity: fade && activeWord === "action" ? 1 : 0.3,
                  transform: fade && activeWord === "action" ? "scale(1.08)" : "scale(1)",
                }}
                className="hover:opacity-80 active:scale-95"
              >
                action
              </button>
            </div>

            <p
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 15,
                color: "rgba(255, 255, 255, 0.3)",
                fontWeight: 400,
                marginTop: 24,
                letterSpacing: "0.01em",
              }}
            >
              For better results research first
            </p>
          </>
        )}

        {mode === "connectors" && (
          <ConnectorGrid onConnect={(name) => initiateOAuth(name)} />
        )}
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
