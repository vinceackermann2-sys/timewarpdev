import { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock, Sparkles, MessageSquare, ChevronDown, ChevronLeft, PanelRightClose, MoreVertical, Check, ExternalLink,
  Mail, Calendar, FileText, Hash, Briefcase, StickyNote, Users, Inbox,
  Copy, EyeOff, RotateCcw, Plus, Trash2, Loader2,
} from "lucide-react";
import {
  SOURCE_META, TAB_FRAMING, inferTabKind, type DashboardCard, type TabKind,
} from "./dashboardTypes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

interface Props {
  card: DashboardCard | null;
  open: boolean;
  onClose: () => void;
  onExecuteAction?: (actionText: string) => void;
  minimized?: boolean;
  onMinimizedChange?: (m: boolean) => void;
  onTrackEvent?: (eventType: "opened" | "clicked" | "completed" | "dismissed" | "snoozed" | "promoted", card: DashboardCard, extra?: Record<string, unknown>) => void;
}

/* ── Short, personal CTA verb derived from the card's own suggestion ── */
function shortCtaVerb(card: DashboardCard, tabKind: TabKind): string {
  const suggestion = (card.actionSuggestion || "").trim();
  if (suggestion) {
    // Take the first clause / sentence, then the first 3-4 words
    const firstClause = suggestion.split(/[.!?;:\n]/)[0].trim();
    const words = firstClause.split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      // Capitalize first word (keep rest as-is), cap to 4 words for a short button label
      const capped = words.slice(0, 4);
      capped[0] = capped[0].charAt(0).toUpperCase() + capped[0].slice(1);
      const label = capped.join(" ");
      // Strip a trailing comma if any
      return label.replace(/[,]+$/, "");
    }
  }
  // Fallback to the tab's generic verb
  return TAB_FRAMING[tabKind].ctaLabel;
}

/* ── Top meta label (TODAY / 4 HRS AGO / > 7 DAYS / Q3 - Q4) ── */
function topMetaLabel(card: DashboardCard, tabKind: TabKind): string {
  if (tabKind === "Objectives") return card.timeHorizon || "Q3 - Q4";
  if (card.waitDuration) return `> ${card.waitDuration.toUpperCase()}`;
  if (card.timeAgo) return card.timeAgo.toUpperCase();
  return "JUST NOW";
}

/* ── Insights collapsible — 5 personalized rows with colored accent rails ── */
function InsightsRow({ card, tabKind }: { card: DashboardCard; tabKind: TabKind }) {
  const [open, setOpen] = useState(true);

  const headerLabel = (() => {
    if (tabKind === "Briefing") {
      return card.signalType ? `Why this ${card.signalType.toLowerCase()} matters` : "Why this matters";
    }
    if (tabKind === "Updates") {
      const who = card.waitingParty?.split(/[·,(]/)[0]?.trim();
      return who ? `Why ${who} is blocked` : "Why this is blocked";
    }
    if (tabKind === "To-Dos") {
      return card.taskType ? `Why this ${card.taskType.toLowerCase()} is on your list` : "Why this is on your list";
    }
    return card.objectiveType ? `Why this ${card.objectiveType.toLowerCase()} matters` : "Why this objective matters";
  })();

  // Personalized per-card values, grounded in the card's own data
  const dataPoint = (() => {
    if (tabKind === "Updates" && card.waitingParty) {
      return `${card.waitingParty}${card.waitDuration ? ` waiting ${card.waitDuration}` : ""}`;
    }
    if (tabKind === "Objectives" && card.successMetric) {
      const m = card.successMetric;
      return `${m.current || "—"} → ${m.target || "—"}${m.gap ? ` (gap ${m.gap})` : ""}`;
    }
    if (tabKind === "To-Dos" && card.estimatedDuration) {
      return `${card.title} · ${card.estimatedDuration}`;
    }
    return card.title;
  })();

  const pattern = card.detail || card.description;

  const crossPillar = (() => {
    if (tabKind === "Objectives" && card.relatedTodoIds?.length) {
      return `Linked to ${card.relatedTodoIds.length} active to-do${card.relatedTodoIds.length > 1 ? "s" : ""}.`;
    }
    if (card.category) return `Affects the ${card.category} pillar of your business.`;
    if (tabKind === "Briefing" && card.signalType) return `Connects to your ${card.signalType.toLowerCase()} workstream.`;
    if (tabKind === "Updates") return "Blocks downstream work until you respond.";
    if (tabKind === "To-Dos") return "Moves a current objective forward.";
    return "Touches multiple areas of your operation.";
  })();

  const implication = (() => {
    if (card.consequence) return card.consequence;
    if (tabKind === "Updates") return "If left unanswered, the request escalates and slows the team.";
    if (tabKind === "To-Dos") return card.howTo
      ? `If skipped, you lose the leverage from: ${card.howTo}`
      : "If skipped, this work compounds into a larger backlog.";
    if (tabKind === "Objectives" && card.successMetric?.gap) {
      return `If untouched, you stay ${card.successMetric.gap} away from target.`;
    }
    if (tabKind === "Briefing") return "If ignored, you lose context that informs upcoming decisions.";
    return "Acting now preserves momentum and prevents downstream cost.";
  })();

  const watchSignal = (() => {
    if (tabKind === "Updates" && card.requestType) return `Watch for similar ${card.requestType.toLowerCase()} requests piling up.`;
    if (tabKind === "To-Dos" && card.leverageLabel) return `Track whether ${card.leverageLabel.replace(/^[^A-Za-z]+/, "")} tasks keep clustering here.`;
    if (tabKind === "Objectives") return "Re-check progress weekly against the success metric.";
    if (card.source) return `Monitor new activity from ${card.source} for related signals.`;
    return "Re-evaluate if the same theme appears again this week.";
  })();

  // Tab-specific labels — Updates and To-Dos use action-oriented labels
  const labels = (() => {
    if (tabKind === "Updates") {
      return {
        dataPoint: "History",
        pattern: "Context",
        crossPillar: "Recommendation",
        implication: "Time Cost",
        watchSignal: "Escalation Path",
      };
    }
    if (tabKind === "To-Dos") {
      return {
        dataPoint: "Value",
        pattern: "Dependencies",
        crossPillar: "Completion Criteria",
        implication: "Time Cost",
        watchSignal: "Escalation Path",
      };
    }
    return {
      dataPoint: "Data Point",
      pattern: "Pattern",
      crossPillar: "Cross-Pillar",
      implication: "Implication",
      watchSignal: "Watch Signal",
    };
  })();

  // Updates-specific personalized values for the new label scheme
  const updatesHistory = (() => {
    if (tabKind !== "Updates") return null;
    const who = card.metadata?.senderName || card.waitingParty?.split(/[·,(]/)[0]?.trim() || "Contact";
    const when = card.timeAgo || card.waitDuration || "recently";
    const action = card.metadata?.subject ? `sent "${card.metadata.subject}"` : (card.requestType ? `${card.requestType.toLowerCase()} request` : "reached out");
    return `${who} ${action} ${when}.`;
  })();

  const updatesContext = (() => {
    if (tabKind !== "Updates") return null;
    const parts: string[] = [];
    if (card.metadata?.dealValue) parts.push(`${card.metadata.dealValue} deal value`);
    if (card.metadata?.stage) parts.push(card.metadata.stage);
    if (card.waitingParty) parts.push(`${card.waitingParty} is waiting`);
    if (card.metadata?.contactName) parts.push(`${card.metadata.contactName} is the contact`);
    return parts.length ? parts.join(". ") + "." : (card.detail || card.description || "");
  })();

  const updatesRecommendation = (() => {
    if (tabKind !== "Updates") return null;
    return card.actionSuggestion || `Respond to unblock ${card.waitingParty?.split(/[·,(]/)[0]?.trim() || "the requester"}.`;
  })();

  const updatesTimeCost = (() => {
    if (tabKind !== "Updates") return null;
    if (card.estimatedDuration) return `~${card.estimatedDuration} to draft reply`;
    return "~5 minutes to draft reply";
  })();

  const updatesEscalation = (() => {
    if (tabKind !== "Updates") return null;
    if (card.consequence) return card.consequence;
    return "If unresolved soon, momentum stalls and the request escalates.";
  })();

  // To-Dos-specific personalized values
  const todosValue = (() => {
    if (tabKind !== "To-Dos") return null;
    if (card.metadata?.dealValue) return `${card.metadata.dealValue} opportunity. Acting now preserves the upside.`;
    if (card.leverageLabel?.includes("High Leverage")) return `${card.title} is a high-leverage move — the payoff compounds across other work.`;
    if (card.leverageLabel?.includes("Deep Work")) return `${card.title} is deep work that protects long-term progress.`;
    return `${card.title} moves a current objective forward and unlocks downstream work.`;
  })();

  const todosDependencies = (() => {
    if (tabKind !== "To-Dos") return null;
    if (card.relatedTodoIds?.length) return `Unblocks ${card.relatedTodoIds.length} related task${card.relatedTodoIds.length > 1 ? "s" : ""} downstream.`;
    if (card.metadata?.scheduledDate) return `Tied to the meeting scheduled ${card.metadata.scheduledDate}.`;
    if (card.category) return `Unblocks the next step in your ${card.category} workstream.`;
    return "Unblocks the next step in your current workflow.";
  })();

  const todosCriteria = (() => {
    if (tabKind !== "To-Dos") return null;
    if (card.howTo) return card.howTo;
    if (card.actionSuggestion) return card.actionSuggestion;
    return `${card.title} completed and logged.`;
  })();

  const todosTimeCost = (() => {
    if (tabKind !== "To-Dos") return null;
    if (card.estimatedDuration) return `~${card.estimatedDuration} of focused effort.`;
    return "~15 minutes of focused effort.";
  })();

  const todosEscalation = (() => {
    if (tabKind !== "To-Dos") return null;
    if (card.consequence) return card.consequence;
    return "If skipped, the work compounds into a larger backlog and slows momentum.";
  })();

  const toStr = (v: unknown): string => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    try { return JSON.stringify(v); } catch { return ""; }
  };

  const rows: { label: string; value: string; rail: string }[] = [
    { label: labels.dataPoint,   value: toStr(updatesHistory ?? todosValue ?? dataPoint),                  rail: "bg-[hsl(264_46%_60%)]" }, // purple
    { label: labels.pattern,     value: toStr(updatesContext ?? todosDependencies ?? pattern),             rail: "bg-[hsl(217_45%_65%)]" }, // blue
    { label: labels.crossPillar, value: toStr(updatesRecommendation ?? todosCriteria ?? crossPillar),      rail: "bg-[hsl(160_42%_62%)]" }, // mint
    { label: labels.implication, value: toStr(updatesTimeCost ?? todosTimeCost ?? implication),            rail: "bg-[hsl(42_88%_65%)]" }, // amber
    { label: labels.watchSignal, value: toStr(updatesEscalation ?? todosEscalation ?? watchSignal),        rail: "bg-[hsl(335_55%_75%)]" }, // pink
  ].filter((r) => r.value.trim().length > 0);

  return (
    <div className="pt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[hsl(217_100%_60%)] text-black" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {headerLabel}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && rows.length > 0 && (
        <div className="mt-3 space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="flex gap-3">
              <div className={`w-[3px] rounded-full shrink-0 ${r.rail}`} />
              <p className="text-[13px] leading-relaxed text-foreground/85">
                <span className="font-semibold text-foreground">{r.label}:</span>{" "}
                {r.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── How-To Execution Plan — numbered steps for To-Dos, derived from card data ── */
function ExecutionPlan({ card }: { card: DashboardCard }) {
  const steps = (() => {
    // 1. Try to split howTo into numbered/bulleted steps
    const howToVal: unknown = card.howTo;
    let raw = "";
    if (Array.isArray(howToVal)) {
      raw = howToVal.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("\n").trim();
    } else if (typeof howToVal === "string") {
      raw = howToVal.trim();
    } else if (howToVal != null) {
      try { raw = JSON.stringify(howToVal); } catch { raw = ""; }
    }
    if (raw) {
      // Match patterns like "1. ...", "1) ...", "- ...", or sentences split by ". "
      const numbered = raw.match(/(?:^|\n)\s*(?:\d+[.)]|[-•])\s+([^\n]+)/g);
      if (numbered && numbered.length >= 2) {
        return numbered.map((s) => s.replace(/^[\s\n]*(?:\d+[.)]|[-•])\s+/, "").trim()).filter(Boolean).slice(0, 5);
      }
      const sentences = raw.split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim()).filter((s) => s.length > 8);
      if (sentences.length >= 2) return sentences.slice(0, 5);
    }
    // 2. Fall back to source-aware default plan
    const source = (card.source || "").toLowerCase();
    const m = card.metadata || {};
    if (source === "hubspot") {
      return [
        `Open HubSpot and review the latest activity${m.contactName ? ` with ${m.contactName}` : ""}.`,
        `Draft your next move based on the current ${m.stage || "deal"} stage.`,
        `Log the action and set the next follow-up reminder.`,
      ];
    }
    if (["outlook", "gmail", "google_gmail"].includes(source)) {
      return [
        `Open the email${m.senderName ? ` from ${m.senderName}` : ""} and re-read the request.`,
        `Draft a focused reply addressing the specific ask.`,
        `Send and flag for follow-up if a response is expected.`,
      ];
    }
    if (["zoom", "calendar", "google_calendar", "teams"].includes(source)) {
      return [
        `Review the meeting agenda${m.subject ? ` for "${m.subject}"` : ""}.`,
        `Prepare the 2–3 key questions or talking points you need to cover.`,
        `Join 2 minutes early to ensure your environment is ready.`,
      ];
    }
    if (source === "slack") {
      return [
        `Open the ${m.channel || "Slack"} thread and read the full context.`,
        `Reply with a clear, concise next step or decision.`,
        `Pin or bookmark if it requires follow-up later.`,
      ];
    }
    // 3. Generic fallback
    return [
      `Open the relevant context for "${card.title}".`,
      `Take the focused action that moves it forward.`,
      `Log the outcome so the next step is obvious.`,
    ];
  })();

  if (!steps.length) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-white px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground mb-4">
        How to Execution Plan
      </p>
      <ol className="space-y-3.5">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <div className="shrink-0 w-6 h-6 rounded-full border border-[hsl(264_46%_60%)] text-[hsl(264_46%_50%)] flex items-center justify-center text-[11px] font-semibold">
              {i + 1}
            </div>
            <p className="text-[13px] leading-relaxed text-foreground/85 pt-[2px]">
              {step}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ── Objectives Breakdown — Sub-Milestones list + 3 colored callouts ── */
function ObjectivesBreakdown({ card }: { card: DashboardCard }) {
  const m = card.successMetric;

  // Sub-milestones: derived from successMetric + timeHorizon + related work
  const subMilestones: string[] = (() => {
    const out: string[] = [];
    if (m?.target) {
      const when = card.timeHorizon ? ` by ${card.timeHorizon.split(/[-–]/)[0].trim()}` : "";
      out.push(`Hit ${m.target}${when}`);
    }
    if (m?.gap) out.push(`Close the ${m.gap} gap to target`);
    if (card.relatedTodoIds?.length) {
      out.push(`Complete ${card.relatedTodoIds.length} linked to-do${card.relatedTodoIds.length > 1 ? "s" : ""} this cycle`);
    }
    if (m?.current && !out.length) out.push(`Move from ${m.current} toward ${m.target || "target"}`);
    if (!out.length) out.push(`Define a measurable next step for "${card.title}"`);
    return out.slice(0, 4);
  })();

  const dependencies = (() => {
    if (card.howTo) return card.howTo;
    if (m?.source) return `Requires ${m.source} to deliver inputs on schedule.`;
    if (card.category) return `Requires the ${card.category} workstream to stay on cadence.`;
    return "Requires aligned execution from supporting teams.";
  })();

  const riskFactors = (() => {
    if (card.consequence) return card.consequence;
    if (m?.gap) return `A ${m.gap} gap remains; slippage in the cycle could push it into the next quarter.`;
    if (card.timeHorizon) return `Slippage inside ${card.timeHorizon} would shift the outcome to the next cycle.`;
    return "Competing priorities or delayed inputs could push this off-track.";
  })();

  const crossImpact = (() => {
    if (card.relatedTodoIds?.length) {
      return `Directly drives ${card.relatedTodoIds.length} active to-do${card.relatedTodoIds.length > 1 ? "s" : ""} and downstream pillar work.`;
    }
    if (card.category) return `Directly funds the next ${card.category} initiative.`;
    if (card.objectiveType) return `Strengthens your ${card.objectiveType.toLowerCase()} position across the business.`;
    return "Strengthens the strategic position across multiple pillars.";
  })();

  const callouts = [
    { label: "Key Dependencies", body: dependencies, rail: "bg-[hsl(42_88%_65%)]" }, // amber
    { label: "Risk Factors",     body: riskFactors,  rail: "bg-[hsl(335_55%_75%)]" }, // pink
    { label: "Cross-Pillar Impact", body: crossImpact, rail: "bg-[hsl(264_46%_60%)]" }, // purple
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-white px-5 py-4 space-y-5">
      <div>
        <p className="text-[13px] font-semibold text-foreground mb-2">Sub-Milestones:</p>
        <ul className="space-y-1.5 pl-1">
          {subMilestones.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-foreground/85">
              <span className="text-foreground/60 leading-relaxed">•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        {callouts.map((c) => (
          <div key={c.label} className="flex gap-3">
            <div className={`w-[3px] rounded-full shrink-0 ${c.rail}`} />
            <p className="text-[13px] leading-relaxed text-foreground/85">
              <span className="font-semibold text-foreground">{c.label}:</span>{" "}
              {c.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Source classification helpers ── */
type SourceKind = "email" | "meeting" | "message" | "file" | "note" | "deal" | "system";

function classifySource(card: DashboardCard): SourceKind {
  const k = (card.source || "").toLowerCase();
  if (["outlook", "gmail", "google_gmail"].includes(k)) return "email";
  if (["zoom", "calendar", "google_calendar"].includes(k)) return "meeting";
  if (k === "teams") {
    // Teams can be meeting or chat — if attendees/scheduledDate present → meeting, else message
    if (card.metadata?.attendees?.length || card.metadata?.scheduledDate) return "meeting";
    return "message";
  }
  if (k === "slack") return "message";
  if (["onedrive", "google_drive", "drive"].includes(k)) return "file";
  if (k === "onenote") return "note";
  if (k === "hubspot") return "deal";
  return "system";
}

function initialsFrom(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

function fileExt(name?: string): string {
  if (!name) return "FILE";
  const m = name.match(/\.([a-z0-9]{1,5})$/i);
  return (m?.[1] || "FILE").toUpperCase();
}

/* ── Native source-format header chip ── */
function SourceChip({ card }: { card: DashboardCard }) {
  const sourceKey = card.source || "general";
  const sourceMeta = SOURCE_META[sourceKey] || SOURCE_META.general;
  const kind = classifySource(card);
  const KindIcon = kind === "email" ? Mail
    : kind === "meeting" ? Calendar
    : kind === "message" ? MessageSquare
    : kind === "file" ? FileText
    : kind === "note" ? StickyNote
    : kind === "deal" ? Briefcase
    : null;

  return (
    <div className="px-4 py-2.5 flex items-center gap-2 bg-[#E8F0FE] border-b border-border/40">
      {sourceMeta.icon ? (
        <img
          src={sourceMeta.icon}
          alt=""
          className="h-4 w-4 object-contain shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <BusinessBrainOrb size={16} className="shrink-0" />
      )}
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {sourceMeta.label || "TimeWarp Suggestion"}
      </span>
      {KindIcon && (
        <>
          <span className="text-muted-foreground/50">·</span>
          <KindIcon className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            {kind}
          </span>
        </>
      )}
    </div>
  );
}

/* ── Expandable verbatim body — shows ~6 lines, expands on click if longer ── */
function ExpandableBody({
  text,
  serif = false,
  emptyHint,
  threshold = 320,
}: { text?: string; serif?: boolean; emptyHint: string; threshold?: number }) {
  const [open, setOpen] = useState(false);
  const trimmed = (text || "").trim();

  if (!trimmed) {
    return (
      <div className="border-t border-border/40 pt-3">
        <div className="flex items-center gap-2 text-muted-foreground/80 text-[12px]">
          <Inbox className="h-3.5 w-3.5" />
          <span>{emptyHint}</span>
        </div>
      </div>
    );
  }

  const isLong = trimmed.length > threshold;
  const displayed = open || !isLong ? trimmed : trimmed.slice(0, threshold).trimEnd() + "…";
  const fontClass = serif ? "font-[ui-serif,Georgia,serif]" : "";

  return (
    <div className="border-t border-border/40 pt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        Original content
      </p>
      <p className={`text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap ${fontClass}`}>
        {displayed}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[hsl(217_100%_50%)] hover:text-[hsl(217_100%_42%)] transition-colors"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          {open ? "Show less" : `Show full content (${trimmed.length.toLocaleString()} chars)`}
        </button>
      )}
    </div>
  );
}

/* ── Email native render ── */
function EmailRender({ card }: { card: DashboardCard }) {
  const m = card.metadata || {};
  const sender = m.senderName || "Unknown sender";
  const init = initialsFrom(sender);
  return (
    <div className="px-4 py-4 space-y-3 bg-white">
      {/* From row */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-[hsl(217_100%_94%)] text-[hsl(217_70%_42%)] flex items-center justify-center text-[12px] font-bold shrink-0">
          {init}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-foreground truncate leading-tight">{sender}</p>
          {m.senderEmail && (
            <p className="text-[11.5px] text-muted-foreground truncate leading-tight">{m.senderEmail}</p>
          )}
        </div>
        {m.receivedAt && (
          <span className="text-[11px] text-muted-foreground shrink-0">{m.receivedAt}</span>
        )}
      </div>

      {/* Subject */}
      {m.subject && (
        <div className="border-t border-border/40 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Subject</p>
          <p className="text-[14px] font-bold text-foreground leading-snug">{m.subject}</p>
        </div>
      )}

      {/* Body — verbatim, expandable */}
      <ExpandableBody text={m.bodyPreview} serif emptyHint="No email body was returned by the source." />
    </div>
  );
}

/* ── Meeting native render ── */
function MeetingRender({ card }: { card: DashboardCard }) {
  const m = card.metadata || {};
  const attendees = m.attendees || [];
  return (
    <div className="px-4 py-4 space-y-3 bg-white">
      <p className="text-[14px] font-bold text-foreground leading-snug">
        {m.subject || card.title}
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]">
        {m.scheduledDate && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-foreground font-medium">{m.scheduledDate}</span>
          </div>
        )}
        {m.duration && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-foreground font-medium">{m.duration}</span>
          </div>
        )}
      </div>

      {attendees.length > 0 && (
        <div className="border-t border-border/40 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {attendees.length} attendee{attendees.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {attendees.slice(0, 8).map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/60 text-[11.5px] text-foreground"
              >
                <div className="w-4 h-4 rounded-full bg-[hsl(217_100%_88%)] text-[hsl(217_70%_42%)] flex items-center justify-center text-[9px] font-bold">
                  {initialsFrom(a)}
                </div>
                <span className="truncate max-w-[140px]">{a}</span>
              </div>
            ))}
            {attendees.length > 8 && (
              <span className="px-2 py-1 text-[11px] text-muted-foreground">+{attendees.length - 8}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Slack/Teams chat message render ── */
function MessageRender({ card }: { card: DashboardCard }) {
  const m = card.metadata || {};
  const author = m.author || m.senderName || "Unknown";
  const init = initialsFrom(author);
  const text = (m.messageText || "").trim();
  const isLong = text.length > 320;
  const [open, setOpen] = useState(false);
  const displayed = open || !isLong ? text : text.slice(0, 320).trimEnd() + "…";

  return (
    <div className="px-4 py-4 space-y-3 bg-white">
      {m.channel && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Hash className="h-3.5 w-3.5" />
          <span className="text-[12px] font-semibold">{m.channel.replace(/^#/, "")}</span>
        </div>
      )}
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-md bg-[hsl(217_100%_94%)] text-[hsl(217_70%_42%)] flex items-center justify-center text-[12px] font-bold shrink-0">
          {init}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-[13px] font-bold text-foreground truncate leading-tight">{author}</p>
            {m.receivedAt && (
              <span className="text-[11px] text-muted-foreground shrink-0">{m.receivedAt}</span>
            )}
          </div>
          {text ? (
            <>
              <div className="mt-1.5 px-3 py-2 rounded-lg rounded-tl-sm bg-muted/50 text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {displayed}
              </div>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[hsl(217_100%_50%)] hover:text-[hsl(217_100%_42%)] transition-colors"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                  {open ? "Show less" : `Show full message (${text.length.toLocaleString()} chars)`}
                </button>
              )}
            </>
          ) : (
            <div className="mt-1.5 flex items-center gap-2 text-muted-foreground/80 text-[12px]">
              <Inbox className="h-3.5 w-3.5" />
              <span>No message text was returned by the source.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── File (OneDrive / Drive) render ── */
function FileRender({ card }: { card: DashboardCard }) {
  const m = card.metadata || {};
  const ext = fileExt(m.fileName);
  return (
    <div className="px-4 py-4 space-y-3 bg-white">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-[hsl(217_100%_94%)] text-[hsl(217_70%_42%)] flex items-center justify-center text-[10px] font-bold shrink-0">
          {ext}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-foreground truncate leading-tight">
            {m.fileName || card.title}
          </p>
          {m.sharedBy && (
            <p className="text-[12px] text-muted-foreground truncate leading-tight mt-0.5">
              Shared by {m.sharedBy}
            </p>
          )}
          {m.receivedAt && (
            <p className="text-[11px] text-muted-foreground truncate leading-tight">
              {m.receivedAt}
            </p>
          )}
        </div>
      </div>
      <ExpandableBody text={m.bodyPreview} emptyHint="No file preview was returned by the source." />

    </div>
  );
}

/* ── OneNote render ── */
function NoteRender({ card }: { card: DashboardCard }) {
  const m = card.metadata || {};
  return (
    <div className="px-4 py-4 space-y-3 bg-white">
      {m.notebook && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <StickyNote className="h-3.5 w-3.5" />
          <span className="text-[11.5px] font-medium">{m.notebook}</span>
        </div>
      )}
      <p className="text-[14px] font-bold text-foreground leading-snug">
        {m.subject || card.title}
      </p>
      {m.author && (
        <p className="text-[11.5px] text-muted-foreground">By {m.author}</p>
      )}
      <ExpandableBody text={m.bodyPreview} emptyHint="No note content was returned by the source." />

    </div>
  );
}

/* ── HubSpot deal render ── */
function DealRender({ card }: { card: DashboardCard }) {
  const m = card.metadata || {};
  return (
    <div className="px-4 py-4 space-y-3 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-foreground leading-snug">
            {m.contactName || card.title}
          </p>
          {m.subject && (
            <p className="text-[12.5px] text-muted-foreground mt-0.5">{m.subject}</p>
          )}
        </div>
        {m.dealValue && (
          <span className="px-2.5 py-1 rounded-full bg-[hsl(142_55%_95%)] text-[hsl(142_62%_30%)] border border-[hsl(142_42%_78%)] text-[12px] font-bold shrink-0">
            {m.dealValue}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {m.stage && (
          <span className="px-2 py-0.5 rounded-md bg-muted text-[11.5px] font-medium text-foreground">
            {m.stage}
          </span>
        )}
        {m.receivedAt && (
          <span className="px-2 py-0.5 rounded-md bg-muted/60 text-[11.5px] text-muted-foreground">
            Last touch: {m.receivedAt}
          </span>
        )}
      </div>
      <ExpandableBody text={m.bodyPreview} emptyHint="No deal notes were returned by the source." />

    </div>
  );
}

/* ── System / TimeWarp suggestion fallback (DNA / objectives / general) ── */
function SystemRender({ card }: { card: DashboardCard }) {
  return (
    <div className="px-4 py-4 space-y-2 bg-white">
      <div className="flex items-center gap-2">
        <BusinessBrainOrb size={18} className="shrink-0" />
        <p className="text-[13px] font-bold text-foreground">TimeWarp Suggestion</p>
      </div>
      <p className="text-[14px] font-semibold text-foreground leading-snug">{card.title}</p>
      {card.description && (
        <p className="text-[13px] text-foreground/85 leading-relaxed whitespace-pre-wrap">
          {card.description}
        </p>
      )}
    </div>
  );
}

/* ── Source-native block — switches by source kind ── */
function SourceNativeBlock({ card, tabKind }: { card: DashboardCard; tabKind: TabKind }) {
  const kind = tabKind === "Objectives" ? "system" : classifySource(card);
  const Body =
    kind === "email" ? EmailRender
    : kind === "meeting" ? MeetingRender
    : kind === "message" ? MessageRender
    : kind === "file" ? FileRender
    : kind === "note" ? NoteRender
    : kind === "deal" ? DealRender
    : SystemRender;

  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden">
      <SourceChip card={card} />
      <Body card={card} />
    </div>
  );
}

/* ── Sticky Notes — collaborative, persisted, workspace-shared ── */
type StickyNoteRow = {
  id: string;
  card_id: string;
  user_id: string;
  workspace_id: string | null;
  author_email: string;
  content: string;
  color: string;
  created_at: string;
  updated_at: string;
};

const NOTE_PALETTE: Record<string, { bg: string; border: string; tab: string }> = {
  yellow: { bg: "bg-[#FFF8C5]", border: "border-[#F1E58A]", tab: "bg-[#F4DC6B]" },
  pink:   { bg: "bg-[#FFE4EC]", border: "border-[#F5BCCE]", tab: "bg-[#F19BB5]" },
  blue:   { bg: "bg-[#E3F0FF]", border: "border-[#B7D4F4]", tab: "bg-[#8FB8E5]" },
  green:  { bg: "bg-[#E6F7E1]", border: "border-[#BFE3B0]", tab: "bg-[#A3D58E]" },
  purple: { bg: "bg-[#F0E7FA]", border: "border-[#D4BFEE]", tab: "bg-[#B596DA]" },
};

function noteColor(c: string) {
  return NOTE_PALETTE[c] || NOTE_PALETTE.yellow;
}

function initialsFromEmail(email: string): string {
  const local = (email || "").split("@")[0] || "?";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 30) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function StickyNoteCard({
  note,
  isOwner,
  onChange,
  onDelete,
}: {
  note: StickyNoteRow;
  isOwner: boolean;
  onChange: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}) {
  const palette = noteColor(note.color);
  const [draft, setDraft] = useState(note.content);
  const [savedFlash, setSavedFlash] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const flashRef = useRef<number | null>(null);

  // Sync external updates (e.g. realtime) into draft when not focused
  useEffect(() => {
    setDraft(note.content);
  }, [note.id, note.content]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (flashRef.current) window.clearTimeout(flashRef.current);
    };
  }, []);

  const handleChange = (v: string) => {
    setDraft(v);
    if (!isOwner) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onChange(note.id, v);
      setSavedFlash(true);
      if (flashRef.current) window.clearTimeout(flashRef.current);
      flashRef.current = window.setTimeout(() => setSavedFlash(false), 1200);
    }, 500);
  };

  return (
    <div
      className={`relative rounded-md border ${palette.border} ${palette.bg} shadow-sm transition-shadow hover:shadow-md`}
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 4px 8px -4px rgba(0,0,0,0.08)" }}
    >
      {/* tape strip */}
      <div className={`absolute -top-1.5 left-3 right-3 h-1.5 rounded-sm opacity-70 ${palette.tab}`} />
      <div className="p-2.5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="h-5 w-5 rounded-full bg-white/70 border border-white text-[9.5px] font-bold flex items-center justify-center text-foreground/80 shrink-0">
              {initialsFromEmail(note.author_email)}
            </div>
            <span className="text-[10.5px] font-medium text-foreground/70 truncate" title={note.author_email}>
              {note.author_email || "Unknown"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9.5px] text-foreground/50">{relativeTime(note.updated_at)}</span>
            {isOwner && (
              <button
                type="button"
                aria-label="Delete note"
                onClick={() => onDelete(note.id)}
                className="h-5 w-5 rounded flex items-center justify-center text-foreground/50 hover:text-destructive hover:bg-white/50 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          readOnly={!isOwner}
          placeholder={isOwner ? "Write your note…" : ""}
          className={`w-full min-h-[56px] resize-none rounded-sm bg-transparent px-1 py-0.5 text-[12px] leading-snug text-foreground placeholder:text-foreground/40 focus:outline-none ${isOwner ? "" : "cursor-default"}`}
          style={{ fontFamily: "'Caveat', 'Patrick Hand', cursive, system-ui", fontSize: "14px" }}
        />
        {isOwner && (
          <div className="h-3 mt-0.5 flex justify-end">
            <span className={`text-[9.5px] text-[hsl(142_62%_35%)] transition-opacity ${savedFlash ? "opacity-100" : "opacity-0"}`}>
              ✓ saved
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function StickyNotes({ cardId }: { cardId: string }) {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const [notes, setNotes] = useState<StickyNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Load notes for this card (own + workspace)
  const loadNotes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("dashboard_card_notes")
      .select("*")
      .eq("card_id", cardId);
    if (activeWorkspaceId) {
      q = q.or(`workspace_id.eq.${activeWorkspaceId},user_id.eq.${user.id}`);
    } else {
      q = q.eq("user_id", user.id);
    }
    const { data, error } = await q.order("created_at", { ascending: true });
    if (!error && data) setNotes(data as StickyNoteRow[]);
    setLoading(false);
  }, [cardId, user, activeWorkspaceId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  // Realtime sync so workspace members see new/edited/deleted notes live
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`card-notes-${cardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dashboard_card_notes", filter: `card_id=eq.${cardId}` },
        () => { void loadNotes(); }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [cardId, user, loadNotes]);

  const addNote = useCallback(async () => {
    if (!user) {
      toast({ title: "Sign in to add notes" });
      return;
    }
    setCreating(true);
    const colors = Object.keys(NOTE_PALETTE);
    const color = colors[notes.length % colors.length];
    const { data, error } = await supabase
      .from("dashboard_card_notes")
      .insert({
        card_id: cardId,
        user_id: user.id,
        workspace_id: activeWorkspaceId,
        author_email: user.email || "",
        content: "",
        color,
      })
      .select("*")
      .single();
    setCreating(false);
    if (error) {
      toast({ title: "Couldn't add note", description: error.message, variant: "destructive" });
      return;
    }
    if (data) setNotes((n) => [...n, data as StickyNoteRow]);
  }, [user, activeWorkspaceId, cardId, notes.length]);

  const updateNote = useCallback(async (id: string, content: string) => {
    setNotes((curr) => curr.map((n) => (n.id === id ? { ...n, content, updated_at: new Date().toISOString() } : n)));
    const { error } = await supabase
      .from("dashboard_card_notes")
      .update({ content })
      .eq("id", id);
    if (error) {
      toast({ title: "Couldn't save note", description: error.message, variant: "destructive" });
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes((curr) => curr.filter((n) => n.id !== id));
    const { error } = await supabase.from("dashboard_card_notes").delete().eq("id", id);
    if (error) {
      toast({ title: "Couldn't delete note", description: error.message, variant: "destructive" });
      void loadNotes();
    }
  }, [loadNotes]);

  return (
    <div className="shrink-0 px-6 pt-4 pb-3 shadow-xl bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sticky Notes
          </span>
          {notes.length > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground/70 px-1.5 py-0.5 rounded-full bg-muted/60">
              {notes.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={addNote}
          disabled={creating || !user}
          className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-foreground/70 hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/60 transition-colors disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Add note
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading notes…
        </div>
      ) : notes.length === 0 ? (
        <button
          type="button"
          onClick={addNote}
          disabled={creating || !user}
          className="w-full text-left rounded-md border border-dashed border-border/70 px-3 py-3 text-[11.5px] text-muted-foreground hover:bg-muted/40 hover:border-border transition-colors disabled:opacity-50"
        >
          No notes yet — click <span className="font-semibold">Add note</span> to leave one for {activeWorkspaceId ? "your workspace" : "yourself"}.
        </button>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {notes.map((n) => (
            <StickyNoteCard
              key={n.id}
              note={n}
              isOwner={!!user && n.user_id === user.id}
              onChange={updateNote}
              onDelete={deleteNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Build a deep-link URL into the source app, using whatever metadata we have ── */
function buildSourceUrl(card: DashboardCard): string | null {
  const m = card.metadata || {};
  const src = (card.source || "").toLowerCase();
  const enc = encodeURIComponent;

  switch (src) {
    case "outlook": {
      // Compose a reply if we know the sender; otherwise open the inbox
      if (m.senderEmail) {
        return `https://outlook.office.com/mail/deeplink/compose?to=${enc(m.senderEmail)}&subject=${enc("Re: " + (m.subject || card.title))}`;
      }
      return "https://outlook.office.com/mail/";
    }
    case "gmail":
    case "google_gmail": {
      if (m.senderEmail) {
        return `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(m.senderEmail)}&su=${enc("Re: " + (m.subject || card.title))}`;
      }
      return "https://mail.google.com/mail/u/0/#inbox";
    }
    case "calendar":
    case "google_calendar":
      return "https://calendar.google.com/calendar/u/0/r";
    case "zoom":
      return "https://zoom.us/meeting";
    case "teams":
      return "https://teams.microsoft.com/";
    case "slack": {
      const ch = (m.channel || "").replace(/^#/, "");
      if (ch) return `https://slack.com/app_redirect?channel=${enc(ch)}`;
      return "https://app.slack.com/client";
    }
    case "onedrive":
      return "https://onedrive.live.com/";
    case "google_drive":
    case "drive":
      return "https://drive.google.com/drive/my-drive";
    case "onenote":
      return "https://www.onenote.com/notebooks";
    case "hubspot": {
      const q = m.contactName || m.subject;
      if (q) return `https://app.hubspot.com/contacts/?query=${enc(q)}`;
      return "https://app.hubspot.com/";
    }
    default:
      return null;
  }
}

export function DashCardDetailPanel({ card, open, onClose, onExecuteAction, minimized: minimizedProp, onMinimizedChange, onTrackEvent }: Props) {
  const [minimizedState, setMinimizedState] = useState(false);
  const [done, setDone] = useState(false);
  const minimized = minimizedProp ?? minimizedState;
  const setMinimized = (v: boolean) => {
    if (onMinimizedChange) onMinimizedChange(v);
    else setMinimizedState(v);
  };

  // Load persisted "done" state when card changes
  useEffect(() => {
    if (!card?.id) return;
    try {
      setDone(localStorage.getItem(`dash-done:${card.id}`) === "1");
    } catch { setDone(false); }
  }, [card?.id]);

  const toggleDone = () => {
    if (!card?.id) return;
    setDone((prev) => {
      const next = !prev;
      try {
        if (next) localStorage.setItem(`dash-done:${card.id}`, "1");
        else localStorage.removeItem(`dash-done:${card.id}`);
      } catch { /* ignore */ }
      toast({ description: next ? "Marked as done" : "Marked as not done" });
      if (next) onTrackEvent?.("completed", card, { priority: card.priority, theme: (card.category || "").toLowerCase() });
      return next;
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ description: `${label} copied` });
    } catch {
      toast({ description: "Copy failed", variant: "destructive" });
    }
  };

  const dismissCard = () => {
    if (!card?.id) return;
    try { localStorage.setItem(`dash-dismissed:${card.id}`, "1"); } catch { /* ignore */ }
    onTrackEvent?.("dismissed", card, { priority: card.priority, theme: (card.category || "").toLowerCase() });
    toast({ description: "Card hidden — refresh to remove from list" });
    onClose();
  };

  if (!card || !open) return null;

  const tabKind = inferTabKind(card);
  const ctaVerb = shortCtaVerb(card, tabKind);
  const topLabel = topMetaLabel(card, tabKind);
  const sourceKey = card.source || "general";
  const sourceMeta = SOURCE_META[sourceKey] || SOURCE_META.general;
  const hasExternalSource = !!sourceMeta.icon && !["business-dna", "products", "audiences", "employees", "general"].includes(sourceKey);
  const sourceUrl = hasExternalSource ? buildSourceUrl(card) : null;

  // Build copyable original-content text (subject + body / message)
  const originalContent = (() => {
    const m = card.metadata || {};
    const parts: string[] = [];
    if (m.subject) parts.push(`Subject: ${m.subject}`);
    if (m.senderName || m.senderEmail) parts.push(`From: ${m.senderName || ""} ${m.senderEmail ? `<${m.senderEmail}>` : ""}`.trim());
    if (m.channel) parts.push(`Channel: ${m.channel}`);
    if (m.author) parts.push(`Author: ${m.author}`);
    if (m.fileName) parts.push(`File: ${m.fileName}`);
    if (m.bodyPreview) parts.push("", m.bodyPreview);
    if (m.messageText) parts.push("", m.messageText);
    return parts.join("\n").trim() || card.description || card.title;
  })();

  if (minimized) {
    return (
      <aside
        className="hidden md:flex w-12 shrink-0 h-[calc(100%-6rem)] my-12 mx-3 flex-col items-center justify-start py-4 rounded-2xl border border-border overflow-hidden bg-[#FAFBFF] shadow-[0_0_10px_2px_hsl(210_20%_85%/0.55)] transition-all duration-300 ease-in-out animate-fade-in"
      >
        <button
          type="button"
          aria-label="Expand"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMinimized(false); }}
          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div
          className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground select-none"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {card.title}
        </div>
      </aside>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <aside className="hidden md:flex w-[420px] shrink-0 h-[calc(100%-6rem)] my-12 mx-3 flex-col rounded-2xl border border-border overflow-hidden bg-[#FAFBFF] shadow-[0_0_10px_2px_hsl(210_20%_85%/0.55)] transition-all duration-300 ease-in-out animate-fade-in">
        {/* ── Top bar ─────────────── */}
        <div className="shrink-0 px-6 pt-5 pb-3 flex items-center justify-between shadow-xl bg-white">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Close panel"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMinimized(true); }}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 text-muted-foreground ml-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">{topLabel}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors outline-none"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => copyToClipboard(card.title, "Title")}>
                <Copy className="h-3.5 w-3.5 mr-2" /> Copy title
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyToClipboard(originalContent, "Original content")}>
                <FileText className="h-3.5 w-3.5 mr-2" /> Copy original content
              </DropdownMenuItem>
              {sourceUrl && (
                <DropdownMenuItem onClick={() => {
                  onTrackEvent?.("clicked", card, { priority: card.priority, theme: (card.category || "").toLowerCase(), destination: "source-link" });
                  window.open(sourceUrl, "_blank", "noopener,noreferrer");
                }}>
                  <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open in {sourceMeta.label}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleDone}>
                {done ? (
                  <><RotateCcw className="h-3.5 w-3.5 mr-2" /> Mark as not done</>
                ) : (
                  <><Check className="h-3.5 w-3.5 mr-2" /> Mark as done</>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={dismissCard} className="text-destructive focus:text-destructive">
                <EyeOff className="h-3.5 w-3.5 mr-2" /> Dismiss card
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Title ─────────────────────────────────────────── */}
        <div className="shrink-0 px-6 pb-5 shadow-xl bg-white">
          <h2 className="text-[22px] font-bold leading-tight text-foreground">
            {card.title}
          </h2>
        </div>

        {/* ── Scrollable body ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 shadow-xl rounded-none bg-white">
          <SourceNativeBlock card={card} tabKind={tabKind} />
          {tabKind !== "Objectives" && <InsightsRow card={card} tabKind={tabKind} />}
          {tabKind === "To-Dos" && <ExecutionPlan card={card} />}
          {tabKind === "Objectives" && <ObjectivesBreakdown card={card} />}
        </div>

        {/* ── Sticky Notes (collaborative, workspace-shared) ─── */}
        <StickyNotes cardId={card.id} />

        {/* ── Sticky bottom — single personalized action button ─────── */}
        <div className="shrink-0 px-6 pb-5 pt-2 bg-[#FAFBFF] shadow-xl">
          <Button
            size="sm"
            className="w-full h-10 gap-1.5 text-[13px] font-semibold rounded-lg bg-[hsl(217_100%_55%)] hover:bg-[hsl(217_100%_50%)] text-white"
            onClick={() => {
              onTrackEvent?.("clicked", card, { priority: card.priority, theme: (card.category || "").toLowerCase(), destination: "cta-action" });
              if (card.actionSuggestion) onExecuteAction?.(card.actionSuggestion);
              onClose();
            }}
            title={card.actionSuggestion || ctaVerb}
          >
            <span className="truncate">{ctaVerb}</span>
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
