import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Database, Globe, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SourceEntry } from "@/lib/agentChat/types";

function SourceIcon({ type }: { type: SourceEntry["type"] }) {
  if (type === "external") return <Globe className="w-3.5 h-3.5 text-sky-600 shrink-0" />;
  if (type === "connector") return <Database className="w-3.5 h-3.5 text-violet-600 shrink-0" />;
  return <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
}

export function SourcesPanel({ sources }: { sources: SourceEntry[] }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;

  return (
    <div className="mt-2 border border-border/60 rounded-xl bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="flex-1">Sources ({sources.length})</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <ul className="px-3 pb-2 space-y-2 max-h-56 overflow-y-auto border-t border-border/40">
          {sources.map((s, i) => (
            <li key={`${s.label}-${i}`} className="flex gap-2 text-[11px] leading-snug text-foreground/85">
              <SourceIcon type={s.type} />
              <div className="min-w-0">
                <div className="font-medium text-foreground/90">{s.label}</div>
                {s.provider && <div className="text-muted-foreground">{s.provider}</div>}
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className={cn("text-primary underline break-all")}>
                    {s.url}
                  </a>
                )}
                {s.snippet && <div className="text-muted-foreground mt-0.5">{s.snippet}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
