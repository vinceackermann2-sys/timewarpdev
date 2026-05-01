/**
 * ForgingPanel — replaces the boring 5-item checklist that used to show
 * during DNA forging.
 *
 * Visual model: a live "data sources" panel that shows each named source
 * (website crawl, uploaded files, connected integrations, external public
 * data: LinkedIn / allabolag.se / social media) with status, count, and a
 * subtle pulsing animation while it runs.  The active source has a moving
 * shimmer; completed sources collapse to a single line; pending sources are
 * dimmed.
 *
 * The component is purely presentational — the parent (ChatOnboardingFlow)
 * advances `currentStage` based on the real backend phases.  We don't fake
 * any progress: when the backend says a stage is done, it shows done.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, FileText, Plug, Search, Check, Loader2, AlertCircle,
  RotateCcw, Sparkles, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ForgingStage =
  | "crawling"     // scraping the user's website
  | "ingesting"    // reading uploaded files + connector data
  | "enriching"    // pulling external public data (LinkedIn / allabolag / socials / web)
  | "synthesizing" // AI assembling the 9 pillars from grounded evidence
  | "saving"       // persisting to DB
  | "done";

interface SourceMeta {
  /** Stable id used to drive the animation step. */
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Short subtitle that changes from "pending" → "active" → "done". */
  pendingDetail: string;
  activeDetail: string;
  doneDetail: (count?: number) => string;
  /** Live count when available (e.g. # of files, # of integrations). */
  count?: number;
}

interface ForgingPanelProps {
  /** Current stage from the parent — drives which row pulses. */
  stage: ForgingStage;
  /** How many files the user uploaded in the prior step. */
  fileCount?: number;
  /** How many integrations are connected. */
  integrationCount?: number;
  /** The user's company URL (for the crawling line label). */
  url?: string | null;
  /** Error message if forging blew up — shown inline with retry. */
  error?: string | null;
  /** Called when the user clicks Retry after an error. */
  onRetry?: () => void;
}

export function ForgingPanel({
  stage,
  fileCount = 0,
  integrationCount = 0,
  url,
  error,
  onRetry,
}: ForgingPanelProps) {
  const sources: SourceMeta[] = useMemo(() => {
    const cleanUrl = (() => {
      if (!url) return "your website";
      try {
        const u = new URL(url.startsWith("http") ? url : `https://${url}`);
        return u.hostname.replace(/^www\./, "");
      } catch { return url; }
    })();

    const list: SourceMeta[] = [
      {
        id: "crawling",
        icon: Globe,
        label: "Reading your website",
        pendingDetail: cleanUrl,
        activeDetail: `Crawling ${cleanUrl} — pages, copy, pricing, social proof`,
        doneDetail: () => `Pulled signals from ${cleanUrl}`,
      },
    ];

    if (fileCount > 0) {
      list.push({
        id: "files",
        icon: FileText,
        label: `Reading ${fileCount} file${fileCount === 1 ? "" : "s"} you uploaded`,
        pendingDetail: "Internal documents — highest priority",
        activeDetail: "Extracting facts from your docs (these override anything online)",
        doneDetail: () => `${fileCount} document${fileCount === 1 ? "" : "s"} indexed`,
        count: fileCount,
      });
    }

    if (integrationCount > 0) {
      list.push({
        id: "integrations",
        icon: Plug,
        label: `Pulling from ${integrationCount} integration${integrationCount === 1 ? "" : "s"}`,
        pendingDetail: "Internal data — highest priority",
        activeDetail: "Reading contacts, deals, files, calendars from your connected tools",
        doneDetail: () => `${integrationCount} integration${integrationCount === 1 ? "" : "s"} sampled`,
        count: integrationCount,
      });
    }

    list.push({
      id: "external",
      icon: Search,
      label: "Cross-checking public data",
      pendingDetail: "LinkedIn · allabolag.se · social media · web search",
      activeDetail: "Searching LinkedIn, allabolag.se, public socials, news, reviews",
      doneDetail: () => "External evidence collected (verified before use)",
    });

    list.push({
      id: "synthesis",
      icon: Sparkles,
      label: "Synthesizing 9 pillars",
      pendingDetail: "Brand · Product · Audience · Market · Financial · …",
      activeDetail: "Composing each field from grounded evidence — no guessing",
      doneDetail: () => "9 pillars composed from real evidence",
    });

    list.push({
      id: "saving",
      icon: Database,
      label: "Saving DNA",
      pendingDetail: "Persisting to your workspace",
      activeDetail: "Writing to your workspace",
      doneDetail: () => "Saved",
    });

    return list;
  }, [url, fileCount, integrationCount]);

  // Map stage → which source row is "active" right now.
  const activeId: string | null = (() => {
    switch (stage) {
      case "crawling": return "crawling";
      case "ingesting": return fileCount > 0 ? "files" : integrationCount > 0 ? "integrations" : "external";
      case "enriching": return "external";
      case "synthesizing": return "synthesis";
      case "saving": return "saving";
      case "done": return null;
    }
  })();

  // Cumulative completion: every source up to (but excluding) the active one
  // is done; everything after is pending.  When stage === "done" everything
  // is done.
  const sourceState = (id: string): "pending" | "active" | "done" => {
    if (stage === "done") return "done";
    if (!activeId) return "pending";
    const idx = sources.findIndex((s) => s.id === id);
    const activeIdx = sources.findIndex((s) => s.id === activeId);
    if (idx < activeIdx) return "done";
    if (idx === activeIdx) return "active";
    return "pending";
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/60 flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
          {stage !== "done" && !error && (
            <motion.span
              className="absolute inset-0 rounded-xl border-2 border-primary/30"
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-foreground">
            {stage === "done"
              ? "Business DNA forged"
              : error
              ? "Forge interrupted"
              : "Forging your Business DNA"}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {stage === "done"
              ? "Every field traces back to real evidence."
              : error
              ? "Something broke — retry below."
              : "Internal data wins when it conflicts with anything public."}
          </p>
        </div>
      </div>

      {/* Body */}
      {error ? (
        <div className="px-5 py-5 flex flex-col gap-3">
          <div className="flex items-start gap-2 text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-[13px] leading-relaxed">{error}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="self-start flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {sources.map((source) => {
            const state = sourceState(source.id);
            return (
              <SourceRow key={source.id} source={source} state={state} />
            );
          })}
        </ul>
      )}

      {/* Footer note */}
      {!error && stage !== "done" && (
        <div className="px-5 py-3 border-t border-border/60 bg-muted/30">
          <p className="text-[11.5px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground/80">No fabrication rule:</strong>{" "}
            empty fields with a "Gap" tag beat made-up ones. If a number isn't proven, it stays blank.
          </p>
        </div>
      )}
    </div>
  );
}

function SourceRow({
  source,
  state,
}: {
  source: SourceMeta;
  state: "pending" | "active" | "done";
}) {
  const Icon = source.icon;
  const detail =
    state === "done" ? source.doneDetail(source.count)
    : state === "active" ? source.activeDetail
    : source.pendingDetail;

  return (
    <li
      className={cn(
        "px-5 py-3.5 flex items-start gap-3 transition-colors relative overflow-hidden",
        state === "active" && "bg-primary/[0.04]",
        state === "pending" && "opacity-55",
      )}
    >
      {/* Active shimmer */}
      {state === "active" && (
        <motion.div
          className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-primary/10 to-transparent pointer-events-none"
          initial={{ x: "-100%" }}
          animate={{ x: "calc(100vw + 100%)" }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Icon + state badge */}
      <div className="relative shrink-0">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            state === "done" && "bg-emerald-500/10 text-emerald-600",
            state === "active" && "bg-primary/15 text-primary",
            state === "pending" && "bg-muted text-muted-foreground",
          )}
        >
          {state === "done" ? (
            <Check className="w-4 h-4" />
          ) : state === "active" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <p
          className={cn(
            "text-[13.5px] font-medium leading-tight",
            state === "done" && "text-foreground",
            state === "active" && "text-foreground",
            state === "pending" && "text-muted-foreground",
          )}
        >
          {source.label}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={state + detail}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed"
          >
            {detail}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Right-side count chip */}
      {typeof source.count === "number" && source.count > 0 && state !== "active" && (
        <span className="shrink-0 self-center text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {source.count}
        </span>
      )}
    </li>
  );
}
