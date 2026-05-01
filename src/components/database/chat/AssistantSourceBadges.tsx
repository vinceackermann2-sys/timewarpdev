import { Database, Globe, MessageSquareQuote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DataSourceAttribution } from "@/lib/agentChat/parseAssistantSources";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const tierIcon = {
  internal: Database,
  external: Globe,
  feedback: MessageSquareQuote,
} as const;

const tierStyle = {
  internal: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  external: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  feedback: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
} as const;

const tierLabel: Record<string, string> = {
  internal: "Internal",
  external: "External",
  feedback: "Your input",
};

/** Small icon row: data-backed answers show which tiers the reply used (DNA, web/Firecrawl, user feedback). */
export function AssistantSourceBadges({ attribution }: { attribution: DataSourceAttribution }) {
  if (!attribution.dataBacked || !attribution.sources.length) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="mt-3 pt-2 border-t border-border/40 flex flex-wrap items-center gap-2"
        role="list"
        aria-label="Sources used for this answer"
      >
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Sources</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {attribution.sources.map((s, i) => {
            const Icon = tierIcon[s.tier];
            const tier = tierLabel[s.tier] || s.tier;
            const tip = `${tier}: ${s.label}`;
            return (
              <Tooltip key={`${s.key}-${i}`}>
                <TooltipTrigger asChild>
                  <span
                    role="listitem"
                    className={cn(
                      "inline-flex h-7 w-7 cursor-default items-center justify-center rounded-full border transition-opacity hover:opacity-90",
                      tierStyle[s.tier],
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="sr-only">{tip}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-xs">
                  <p className="font-medium">{tier}</p>
                  <p className="text-muted-foreground">{s.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
