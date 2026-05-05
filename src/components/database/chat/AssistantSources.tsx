import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Database, Globe, MessageSquareQuote, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DataSourceAttribution } from "@/lib/agentChat/parseAssistantSources";
import type { SourceEntry } from "@/lib/agentChat/types";

const tierStyle = {
  internal: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  external: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  feedback: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
  connector: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
} as const;

const tierLabel: Record<string, string> = {
  internal: "Internal",
  external: "External",
  feedback: "What you told me",
  connector: "Connected app",
};

function TierIcon({ tier }: { tier: keyof typeof tierStyle }) {
  if (tier === "external") return <Globe className="h-3.5 w-3.5" />;
  if (tier === "connector") return <Database className="h-3.5 w-3.5" />;
  if (tier === "feedback") return <MessageSquareQuote className="h-3.5 w-3.5" />;
  return <Layers className="h-3.5 w-3.5" />;
}

/**
 * Unified Sources panel — single dropdown that surfaces both:
 *  - High-level tier attribution (assistant_sources fence) — what evidence backed the reply
 *  - Concrete row-level sources (connector rows, web snapshots, internal records)
 */
export function AssistantSources({
  attribution,
  detailedSources,
}: {
  attribution: DataSourceAttribution | null;
  detailedSources?: SourceEntry[];
}) {
  const [open, setOpen] = useState(false);
  const tiers = attribution?.dataBacked ? attribution.sources : [];
  const rows = detailedSources ?? [];
  if (tiers.length === 0 && rows.length === 0) return null;

  const totalCount = tiers.length + rows.length;

  return (
    <div className="mt-3 border border-border/60 rounded-xl bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
        aria-expanded={open}
      >
        <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="flex-1">
          {attribution?.dataBacked ? "Data-backed" : "Sources"} · {totalCount}
        </span>
        <div className="flex items-center gap-1 mr-1">
          {tiers.slice(0, 4).map((s, i) => (
            <span
              key={`${s.key}-${i}`}
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                tierStyle[s.tier],
              )}
              title={`${tierLabel[s.tier]}: ${s.label}`}
            >
              <TierIcon tier={s.tier} />
            </span>
          ))}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <ul className="px-3 pb-2 pt-1 space-y-2 max-h-64 overflow-y-auto border-t border-border/40">
          {tiers.map((s, i) => (
            <li key={`tier-${s.key}-${i}`} className="flex gap-2 text-[11px] leading-snug text-foreground/85">
              <span
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  tierStyle[s.tier],
                )}
              >
                <TierIcon tier={s.tier} />
              </span>
              <div className="min-w-0">
                <div className="font-medium text-foreground/90">{tierLabel[s.tier]}</div>
                <div className="text-muted-foreground">{s.label}</div>
              </div>
            </li>
          ))}
          {rows.map((s, i) => (
            <li key={`row-${i}`} className="flex gap-2 text-[11px] leading-snug text-foreground/85">
              <span
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  tierStyle[s.type as keyof typeof tierStyle] ?? tierStyle.internal,
                )}
              >
                <TierIcon tier={(s.type as keyof typeof tierStyle) ?? "internal"} />
              </span>
              <div className="min-w-0">
                <div className="font-medium text-foreground/90">{s.label}</div>
                {s.provider && <div className="text-muted-foreground">{s.provider}</div>}
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline break-all"
                  >
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
