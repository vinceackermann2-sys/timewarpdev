import React, { useState, useEffect } from "react";
import { useConnectorOAuth } from "@/hooks/useConnectorOAuth";
import { ConnectorGrid } from "./ConnectorGrid";
import { Typewriter } from "@/components/ui/typewriter";
import researchBg from "@/assets/research-card-bg.png";
import actionBg from "@/assets/action-card-bg.png";

export function AiCeoChatView() {
  const [mode, setMode] = useState<"select" | "connectors">("select");
  const [activeCard, setActiveCard] = useState<"research" | "action">("research");
  const { initiateOAuth } = useConnectorOAuth();

  // Cycle between research and action cards
  useEffect(() => {
    if (mode !== "select") return;
    const interval = setInterval(() => {
      setActiveCard((prev) => (prev === "research" ? "action" : "research"));
    }, 2500);
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
                text={["explore", "research", "act"]}
                speed={80}
                deleteSpeed={50}
                waitTime={2000}
                loop={true}
                showCursor={true}
                cursorChar="|"
                className="text-indigo-400"
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
