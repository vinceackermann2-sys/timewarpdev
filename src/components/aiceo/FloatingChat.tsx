import React, { useState } from "react";
import { ArrowUp } from "lucide-react";

export function FloatingChat() {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    // TODO: send message
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
          gap: 12,
          background: "rgba(255, 255, 255, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 20,
          padding: "8px 8px 8px 22px",
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
