import { Loader2 } from "lucide-react";

interface BrowserWindowProps {
  liveViewUrl?: string | null;
  loading?: boolean;
}

export function BrowserWindow({ liveViewUrl, loading }: BrowserWindowProps) {
  return (
    <div
      style={{
        width: "min(95vw, 1400px)",
        height: "min(80vh, 800px)",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        background: "rgba(0, 0, 0, 0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {liveViewUrl ? (
        <iframe
          src={liveViewUrl}
          className="w-full h-full border-none"
          title="Live Browser Session"
          allow="clipboard-read; clipboard-write"
        />
      ) : loading ? (
        <div style={{ textAlign: "center", opacity: 0.6 }}>
          <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: "rgba(99, 102, 241, 0.7)" }} />
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: "rgba(255, 255, 255, 0.5)", fontWeight: 500 }}>
            Starting browser session…
          </p>
        </div>
      ) : (
        <div style={{ textAlign: "center", opacity: 0.4 }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: 12,
              background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <span style={{ fontSize: 22 }}>🧠</span>
          </div>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: "rgba(255, 255, 255, 0.5)", fontWeight: 500 }}>
            Ask anything to get started
          </p>
        </div>
      )}
    </div>
  );
}
