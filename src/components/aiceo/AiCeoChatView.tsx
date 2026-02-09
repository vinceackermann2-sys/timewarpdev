import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

const words = ["research", "act"];

export function AiCeoChatView() {
  const [message, setMessage] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % words.length);
        setFade(true);
      }, 400);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

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
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          do you want to{" "}
          <span
            style={{
              display: "inline-block",
              minWidth: 180,
              transition: "opacity 0.4s ease, transform 0.4s ease",
              opacity: fade ? 1 : 0,
              transform: fade ? "translateY(0)" : "translateY(8px)",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {words[wordIndex]}
          </span>
        </h1>
        <p
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14,
            color: "rgba(255, 255, 255, 0.3)",
            fontWeight: 400,
            marginTop: 16,
            letterSpacing: "0.01em",
          }}
        >
          for better results research first
        </p>
      </div>

      {/* Floating chat input */}
      <div className="relative z-10 w-full flex justify-center pb-10 px-4">
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
    </div>
  );
}
