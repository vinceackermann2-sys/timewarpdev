import { Lock, RefreshCw } from "lucide-react";

export function BrowserWindow() {
  return (
    <div
      style={{
        width: "min(85vw, 900px)",
        height: "min(55vh, 520px)",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 40px rgba(0, 0, 0, 0.4), 0 0 60px rgba(99, 102, 241, 0.06)",
        animation: "fadeSlideUp 0.5s ease-out 0.2s both",
        display: "flex",
        flexDirection: "column" as const,
      }}
    >
      {/* Browser toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          background: "rgba(255, 255, 255, 0.02)",
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255, 95, 87, 0.7)" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255, 189, 46, 0.7)" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(39, 201, 63, 0.7)" }} />
        </div>

        {/* Refresh */}
        <button
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "default",
          }}
        >
          <RefreshCw size={13} color="rgba(255,255,255,0.25)" />
        </button>

        {/* Address bar */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 8,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <Lock size={11} color="rgba(99, 102, 241, 0.7)" />
          <span
            style={{
              fontSize: 12,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              color: "rgba(255, 255, 255, 0.3)",
              letterSpacing: "0.02em",
            }}
          >
            secure://timewarp.ai/workspace
          </span>
        </div>
      </div>

      {/* Browser content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0, 0, 0, 0.15)",
        }}
      >
        <div style={{ textAlign: "center", opacity: 0.4 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <span style={{ fontSize: 22 }}>🧠</span>
          </div>
          <p
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 14,
              color: "rgba(255, 255, 255, 0.5)",
              fontWeight: 500,
            }}
          >
            Ask anything to get started
          </p>
        </div>
      </div>
    </div>
  );
}
