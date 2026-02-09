import React, { useState, useEffect, useRef } from "react";
import { Activity, Globe, MousePointer, Eye, CheckCircle, AlertCircle, Loader2, Hand, Play } from "lucide-react";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: "navigate" | "click" | "observe" | "success" | "error" | "info" | "loading" | "takeover" | "resume";
  message: string;
}

interface ActivityLogProps {
  entries: LogEntry[];
}

const ICON_MAP: Record<LogEntry["type"], React.ReactNode> = {
  navigate: <Globe size={13} style={{ color: "rgba(99, 182, 255, 0.8)" }} />,
  click: <MousePointer size={13} style={{ color: "rgba(168, 139, 250, 0.8)" }} />,
  observe: <Eye size={13} style={{ color: "rgba(251, 191, 36, 0.8)" }} />,
  success: <CheckCircle size={13} style={{ color: "rgba(74, 222, 128, 0.8)" }} />,
  error: <AlertCircle size={13} style={{ color: "rgba(248, 113, 113, 0.8)" }} />,
  info: <Activity size={13} style={{ color: "rgba(148, 163, 184, 0.7)" }} />,
  loading: <Loader2 size={13} className="animate-spin" style={{ color: "rgba(99, 102, 241, 0.7)" }} />,
  takeover: <Hand size={13} style={{ color: "rgba(251, 146, 60, 0.9)" }} />,
  resume: <Play size={13} style={{ color: "rgba(74, 222, 128, 0.9)" }} />,
};

export function ActivityLog({ entries }: ActivityLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div
      style={{
        width: 260,
        minWidth: 260,
        height: "min(80vh, 800px)",
        borderRadius: 12,
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background: "rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px 10px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Activity size={14} style={{ color: "rgba(99, 102, 241, 0.7)" }} />
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Activity Log
        </span>
      </div>

      {/* Entries */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }} className="scrollbar-thin">
        {entries.length === 0 && (
          <p
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 12,
              color: "rgba(255, 255, 255, 0.25)",
              textAlign: "center",
              padding: "32px 16px",
            }}
          >
            Waiting for activity…
          </p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "6px 16px",
              animation: "fadeSlideUp 0.3s ease-out both",
            }}
          >
            <div style={{ marginTop: 2, flexShrink: 0 }}>{ICON_MAP[entry.type]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12,
                  color: "rgba(255, 255, 255, 0.6)",
                  lineHeight: 1.4,
                  wordBreak: "break-word",
                }}
              >
                {entry.message}
              </p>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', monospace",
                  fontSize: 10,
                  color: "rgba(255, 255, 255, 0.2)",
                }}
              >
                {entry.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
