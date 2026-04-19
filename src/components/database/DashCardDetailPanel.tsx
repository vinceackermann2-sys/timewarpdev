import { useState, useEffect, useRef } from "react";
import {
  Clock, Sparkles, MessageSquare, ChevronDown, MoreVertical, Check, ExternalLink,
  Mail, Calendar, FileText, Hash, Briefcase, StickyNote, Users, Inbox,
} from "lucide-react";
import {
  SOURCE_META, TAB_FRAMING, inferTabKind, type DashboardCard, type TabKind,
} from "./dashboardTypes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";

interface Props {
  card: DashboardCard | null;
  open: boolean;
  onClose: () => void;
  onExecuteAction?: (actionText: string) => void;
  minimized?: boolean;
  onMinimizedChange?: (m: boolean) => void;
}

/* ── Short, one-word-ish CTA verb ── */
function shortCtaVerb(card: DashboardCard, tabKind: TabKind): string {
  // Prefer the framing default (Discuss / Respond / Start / Plan) — it's already short
  return TAB_FRAMING[tabKind].ctaLabel;
}

/* ── Top meta label (TODAY / 4 HRS AGO / > 7 DAYS / Q3 - Q4) ── */
function topMetaLabel(card: DashboardCard, tabKind: TabKind): string {
  if (tabKind === "Objectives") return card.timeHorizon || "Q3 - Q4";
  if (card.waitDuration) return `> ${card.waitDuration.toUpperCase()}`;
  if (card.timeAgo) return card.timeAgo.toUpperCase();
  return "JUST NOW";
}

/* ── Insights collapsible — label is personal to this card's signal type ── */
function InsightsRow({ card, tabKind }: { card: DashboardCard; tabKind: TabKind }) {
  const [open, setOpen] = useState(true);
  const label = (() => {
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

  const insightText = card.detail || card.description;

  return (
    <div className="pt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[hsl(217_100%_60%)]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && insightText && (
        <p className="mt-2 pl-6 text-[13px] text-foreground/85 leading-relaxed whitespace-pre-wrap">
          {insightText}
        </p>
      )}
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
    <div className="px-4 py-2.5 flex items-center gap-2 bg-[#eef2f7] border-b border-border/40">
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

/* ── Quick Notes section — autosaved to localStorage ── */
function QuickNotes({ cardId }: { cardId: string }) {
  const storageKey = `dash-note:${cardId}`;
  const [value, setValue] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);
  const savedTimer = useRef<number | null>(null);

  // Load on mount / card change
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey) || "";
      setValue(v);
    } catch { /* ignore */ }
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    };
  }, [storageKey]);

  const onChange = (v: string) => {
    setValue(v);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try { localStorage.setItem(storageKey, v); } catch { /* ignore */ }
      setSaved(true);
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setSaved(false), 1500);
    }, 600);
  };

  return (
    <div className="shrink-0 px-6 pt-4 pb-3 shadow-xl bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Note
          </span>
        </div>
        <span
          className={`text-[10.5px] font-medium text-[hsl(142_62%_35%)] transition-opacity duration-300 ${
            saved ? "opacity-100" : "opacity-0"
          }`}
        >
          ✓ Saved
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Jot down thoughts, follow-ups, or context…"
        className="w-full min-h-[60px] resize-none rounded-lg border border-border/60 px-3 py-2 text-[12.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors bg-white"
      />
    </div>
  );
}

export function DashCardDetailPanel({ card, open, onClose, onExecuteAction, minimized: minimizedProp, onMinimizedChange }: Props) {
  const [minimizedState, setMinimizedState] = useState(false);
  const [done, setDone] = useState(false);
  const minimized = minimizedProp ?? minimizedState;
  const setMinimized = (v: boolean) => {
    if (onMinimizedChange) onMinimizedChange(v);
    else setMinimizedState(v);
  };

  // Reset done state when card changes
  useEffect(() => { setDone(false); }, [card?.id]);

  if (!card || !open) return null;

  const tabKind = inferTabKind(card);
  const ctaVerb = shortCtaVerb(card, tabKind);
  const topLabel = topMetaLabel(card, tabKind);
  const sourceKey = card.source || "general";
  const sourceMeta = SOURCE_META[sourceKey] || SOURCE_META.general;
  const hasExternalSource = !!sourceMeta.icon && !["business-dna", "products", "audiences", "employees", "general"].includes(sourceKey);

  if (minimized) {
    return (
      <aside
        onMouseEnter={() => setMinimized(false)}
        className="w-[420px] shrink-0 self-end mb-12 mx-3 flex flex-col rounded-2xl border border-border overflow-hidden bg-[#fcfcfd] shadow-[0_0_10px_2px_hsl(210_20%_85%/0.55)] transition-all duration-300 ease-in-out animate-fade-in cursor-pointer"
      >
        <div className="px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">{topLabel}</span>
            <span className="text-sm font-semibold text-foreground truncate ml-2">{card.title}</span>
          </div>
          <button
            type="button"
            aria-label="Expand"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMinimized(false); }}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
          >
            <ChevronDown className="h-4 w-4 rotate-180 transition-transform duration-300" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <aside className="w-[420px] shrink-0 h-[calc(100%-6rem)] my-12 mx-3 flex flex-col rounded-2xl border border-border overflow-hidden bg-[#fcfcfd] shadow-[0_0_10px_2px_hsl(210_20%_85%/0.55)] transition-all duration-300 ease-in-out animate-fade-in">
        {/* ── Top bar ─────────────── */}
        <div className="shrink-0 px-6 pt-5 pb-3 flex items-center justify-between shadow-xl bg-white">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">{topLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="More options"
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Minimize"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMinimized(true); }}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
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
          <InsightsRow card={card} tabKind={tabKind} />
        </div>

        {/* ── Quick Note ────────────────────────────────────── */}
        <QuickNotes cardId={card.id} />

        {/* ── Sticky bottom — slim button row ─────────────────────────── */}
        <div className="shrink-0 px-6 pb-5 pt-2 bg-[#fcfcfd] shadow-xl flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1 h-10 gap-1.5 text-[13px] font-semibold rounded-lg bg-[hsl(217_100%_55%)] hover:bg-[hsl(217_100%_50%)] text-white"
            onClick={() => {
              if (card.actionSuggestion) onExecuteAction?.(card.actionSuggestion);
              onClose();
            }}
          >
            {ctaVerb}
          </Button>

          {hasExternalSource && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 px-3 gap-1.5 text-[13px] font-medium rounded-lg"
                  onClick={() => { /* future: deep-link to source */ }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open in {sourceMeta.label}</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className={`h-10 w-10 rounded-lg shrink-0 ${done ? "bg-[hsl(142_55%_95%)] text-[hsl(142_62%_30%)] border-[hsl(142_42%_78%)]" : ""}`}
                onClick={() => setDone((d) => !d)}
                aria-label="Mark done"
              >
                <Check className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{done ? "Marked done" : "Mark done"}</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
