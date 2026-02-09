import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

const connectors = [
  {
    name: "Google",
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    color: "rgba(66, 133, 244, 0.15)",
    borderColor: "rgba(66, 133, 244, 0.25)",
  },
  {
    name: "FortKnox",
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="#f59e0b" strokeWidth="1.5" fill="rgba(245, 158, 11, 0.15)"/>
        <path d="M12 8v4m0 0v4m0-4h4m-4 0H8" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    color: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  {
    name: "Microsoft",
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24">
        <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
        <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
      </svg>
    ),
    color: "rgba(0, 164, 239, 0.12)",
    borderColor: "rgba(0, 164, 239, 0.25)",
  },
  {
    name: "Slack",
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
        <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
        <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
        <path d="M15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" fill="#ECB22E"/>
      </svg>
    ),
    color: "rgba(46, 182, 125, 0.12)",
    borderColor: "rgba(46, 182, 125, 0.25)",
  },
];

export function AiCeoChatView() {
  const [mode, setMode] = useState<"select" | "connectors">("select");
  const [activeWord, setActiveWord] = useState<"research" | "action">("research");
  const [fade, setFade] = useState(true);

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
          <div
            style={{ animation: "fadeSlideUp 0.5s ease-out forwards" }}
          >
            <h2
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "clamp(28px, 4vw, 40px)",
                fontWeight: 800,
                color: "#fff",
                textAlign: "center",
                marginBottom: 36,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              Know your{" "}
              <span className="text-primary">business</span>
            </h2>
            <div className="grid grid-cols-2 gap-4" style={{ maxWidth: 540 }}>
              {connectors.map((connector, i) => (
                <button
                  key={connector.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    padding: "28px 20px",
                    borderRadius: 14,
                    background: connector.color,
                    border: `1px solid ${connector.borderColor}`,
                    cursor: "pointer",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    animation: `fadeSlideUp 0.4s ease-out ${i * 0.08}s both`,
                  }}
                  className="hover:scale-[1.03] active:scale-[0.98]"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px ${connector.borderColor}`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  }}
                >
                  {connector.icon}
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "rgba(255, 255, 255, 0.7)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {connector.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
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
