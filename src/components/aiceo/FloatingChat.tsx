import React, { useState, useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import researchIcon from "@/assets/research-icon.png";
import actionIcon from "@/assets/action-icon.png";

interface FloatingChatProps {
  mode: "research" | "action";
  onModeChange: (mode: "research" | "action") => void;
}

const modeConfig = {
  research: {
    label: "Research",
    icon: researchIcon,
    color: "rgba(99, 102, 241, 0.9)",
    bgColor: "rgba(99, 102, 241, 0.12)",
    borderColor: "rgba(99, 102, 241, 0.25)",
    hoverBg: "rgba(99, 102, 241, 0.2)",
  },
  action: {
    label: "Action",
    icon: actionIcon,
    color: "rgba(249, 115, 22, 0.9)",
    bgColor: "rgba(249, 115, 22, 0.12)",
    borderColor: "rgba(249, 115, 22, 0.25)",
    hoverBg: "rgba(249, 115, 22, 0.2)",
  },
};

export function FloatingChat({ mode, onModeChange }: FloatingChatProps) {
  const [message, setMessage] = useState("");
  const [showSwitch, setShowSwitch] = useState(false);
  const switchRef = useRef<HTMLDivElement>(null);

  const current = modeConfig[mode];
  const other = mode === "research" ? modeConfig.action : modeConfig.research;
  const otherMode = mode === "research" ? "action" : "research";

  // Close dropdown when clicking anywhere
  useEffect(() => {
    if (!showSwitch) return;
    const handler = (e: MouseEvent) => {
      if (switchRef.current && !switchRef.current.contains(e.target as Node)) {
        setShowSwitch(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSwitch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setMessage("");
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: "20px 24px 36px",
        background: "transparent",
        animation: "fadeSlideUp 0.5s ease-out forwards",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(255, 255, 255, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 20,
          padding: "8px 8px 8px 8px",
          backdropFilter: "blur(12px)",
          transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(99, 102, 241, 0.1)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {/* Mode indicator — hover to open, click to dismiss */}
        <div
          ref={switchRef}
          style={{ position: "relative", flexShrink: 0 }}
          onMouseEnter={() => setShowSwitch(true)}
        >
          <div
            onClick={() => setShowSwitch(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px 4px 4px",
              borderRadius: 12,
              background: current.bgColor,
              border: `1px solid ${current.borderColor}`,
              cursor: "pointer",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
          >
            <img
              src={current.icon}
              alt=""
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                objectFit: "cover",
              }}
            />
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: current.color,
                letterSpacing: "0.02em",
              }}
            >
              {current.label}
            </span>
          </div>

          {/* Switch dropdown */}
          {showSwitch && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 6px)",
                left: 0,
                background: "rgba(15, 18, 30, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                padding: 4,
                backdropFilter: "blur(16px)",
                animation: "fadeSlideUp 0.2s ease-out forwards",
                minWidth: 140,
                zIndex: 60,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  onModeChange(otherMode);
                  setShowSwitch(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = other.hoverBg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <img
                  src={other.icon}
                  alt=""
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    objectFit: "cover",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    color: other.color,
                    letterSpacing: "0.02em",
                  }}
                >
                  Switch to {other.label}
                </span>
              </button>
            </div>
          )}
        </div>

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask anything about your business..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#fff",
            fontSize: 15,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 400,
            letterSpacing: "0.01em",
          }}
        />
        <button
          type="submit"
          disabled={!message.trim()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            border: "none",
            cursor: message.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: message.trim()
              ? "linear-gradient(135deg, hsl(239, 84%, 67%), hsl(260, 80%, 60%))"
              : "rgba(255, 255, 255, 0.06)",
            transition: "all 0.3s ease",
            flexShrink: 0,
          }}
        >
          <ArrowUp
            size={18}
            style={{
              color: message.trim() ? "#fff" : "rgba(255, 255, 255, 0.25)",
              transition: "color 0.3s ease",
            }}
          />
        </button>
      </form>
    </div>
  );
}
