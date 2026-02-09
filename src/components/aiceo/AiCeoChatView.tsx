import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export function AiCeoChatView() {
  const [message, setMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [activeWord, setActiveWord] = useState<"research" | "action">("research");
  const [fade, setFade] = useState(true);

  // Cycle animation between research and action
  useEffect(() => {
    if (showChat) return; // Stop cycling once chat is shown
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setActiveWord((prev) => (prev === "research" ? "action" : "research"));
        setFade(true);
      }, 350);
    }, 2200);
    return () => clearInterval(interval);
  }, [showChat]);

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

      {/* Center text */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center select-none">
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
            onClick={() => setShowChat(true)}
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
              opacity: fade && activeWord === "research" ? 1 : activeWord === "research" ? 0.3 : 0.3,
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
              opacity: fade && activeWord === "action" ? 1 : activeWord === "action" ? 0.3 : 0.3,
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
      </div>

      {/* Floating chat input - only after clicking research */}
      {showChat && (
        <div
          className="relative z-10 w-full flex justify-center pb-10 px-4"
          style={{
            animation: "fadeSlideUp 0.4s ease-out forwards",
          }}
        >
          <style>{`
            @keyframes fadeSlideUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div
            className="w-full max-w-2xl flex items-center gap-3"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 28,
              padding: "8px 8px 8px 24px",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.03) inset",
            }}
          >
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask AI CEO anything..."
              autoFocus
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: 15,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 400,
                letterSpacing: "0.01em",
              }}
              className="placeholder:text-white/25"
            />
            <button
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: message.trim()
                  ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                  : "rgba(255, 255, 255, 0.06)",
                border: "none",
                cursor: message.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
            >
              <ArrowUp
                size={18}
                strokeWidth={2.5}
                style={{
                  color: message.trim() ? "#fff" : "rgba(255, 255, 255, 0.25)",
                  transition: "color 0.2s ease",
                }}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
