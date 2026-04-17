import { useState } from "react";
import {
  Clock, Sparkles, MessageSquare, ChevronDown, MoreVertical, ArrowRight, Plug,
} from "lucide-react";
import {
  SOURCE_META, TAB_FRAMING, inferTabKind, type DashboardCard, type TabKind,
} from "./dashboardTypes";
import { Button } from "@/components/ui/button";

interface Props {
  card: DashboardCard | null;
  open: boolean;
  onClose: () => void;
  onExecuteAction?: (actionText: string) => void;
}

/* ── CTA label — must match the card's pill button so the panel feels consistent ── */
function ctaLabelFor(card: DashboardCard, tabKind: TabKind): string {
  if (tabKind === "Briefing") return "Read briefing";
  if (tabKind === "Updates") return "Respond";
  if (tabKind === "Objectives") return "View OKRs";
  // To-Dos
  const t = (card.taskType || "").toLowerCase();
  if (t.includes("approve") || t.includes("sign")) return "Approve & Sign";
  if (t.includes("delegate")) return "Delegate";
  if (t.includes("template")) return "Solve via Template";
  if (t.includes("review")) return "Review";
  const m = card.title.match(/^(Approve|Sign|Review|Draft|Send|Finalize|Delegate|Plan|Schedule)\b/i);
  if (m) {
    const verb = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    if (verb === "Approve" || verb === "Sign") return "Approve & Sign";
    return verb;
  }
  return "Start task";
}

/* ── Top meta label (TODAY / 4 HRS AGO / > 7 DAYS / Q3 - Q4) ── */
function topMetaLabel(card: DashboardCard, tabKind: TabKind): string {
  if (tabKind === "Objectives") return card.timeHorizon || "Q3 - Q4";
  if (card.waitDuration) return `> ${card.waitDuration.toUpperCase()}`;
  if (card.timeAgo) return card.timeAgo.toUpperCase();
  return "JUST NOW";
}

/* ── "Insights" / "Explanation" collapsible — empty body matches reference shots ── */
function InsightsRow({ tabKind }: { tabKind: TabKind }) {
  const [open, setOpen] = useState(false);
  const label =
    tabKind === "To-Dos" ? "Explanation to why its a to do" :
    tabKind === "Objectives" ? "Explanation to why its an objective" :
    "Insights";
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
    </div>
  );
}

/* ── Original Source Context card — the unified, consistent block ── */
function OriginalContextCard({ card, tabKind }: { card: DashboardCard; tabKind: TabKind }) {
  const sourceKey = card.source || "general";
  const sourceMeta = SOURCE_META[sourceKey] || SOURCE_META.general;
  const meta = card.metadata;

  // Objectives always show "ORIGINAL SYSTEM CONTEXT" with a plug icon (system-derived, not external source)
  const isSystemContext = tabKind === "Objectives";

  // Header label
  const headerLabel = isSystemContext
    ? "Original System Context"
    : sourceMeta.label
      ? `Original ${sourceMeta.label} Context`
      : "Original System Context";

  // Decide which sub-content to render inside the card
  const isEmail = !isSystemContext && (sourceKey === "outlook" || sourceKey === "gmail" || sourceKey === "google_gmail");
  const isMessage = !isSystemContext && (sourceKey === "slack" || sourceKey === "teams");
  const senderName = !isSystemContext ? (meta?.senderName || meta?.contactName || meta?.author || meta?.sharedBy) : null;
  const senderEmail = !isSystemContext ? meta?.senderEmail : null;
  const senderInitial = (senderName || senderEmail || sourceMeta.label || "?").trim()[0]?.toUpperCase() || "?";

  // Bullet metadata lines (label: value) — keep concise, never duplicate description
  const bullets: { label: string; value: string }[] = [];
  if (!isSystemContext) {
    if (meta?.stage) bullets.push({ label: "Status", value: meta.stage });
    if (meta?.dealValue) bullets.push({ label: "Value", value: meta.dealValue });
    if (meta?.scheduledDate) bullets.push({ label: "Date", value: meta.scheduledDate });
    if (meta?.duration) bullets.push({ label: "Duration", value: meta.duration });
    if (meta?.fileName) bullets.push({ label: "File", value: meta.fileName });
    if (meta?.notebook) bullets.push({ label: "Notebook", value: meta.notebook });
    if (meta?.channel && (isMessage)) bullets.push({ label: "Channel", value: `#${meta.channel}` });
    if (card.requestType) bullets.push({ label: "Request", value: card.requestType });
    if (card.waitDuration) bullets.push({ label: "Time since creation", value: card.waitDuration });
    if (card.actionSuggestion && card.actionSuggestion.length < 80) {
      bullets.push({ label: "Action Recommended", value: card.actionSuggestion });
    }
  }

  // Subtitle: subject for emails, channel for messages, signalType for briefings, otherwise the title echo (only if no body)
  const subTitle = isSystemContext
    ? card.title
    : (meta?.subject ||
       (isMessage && meta?.channel ? `#${meta.channel}` : null) ||
       card.signalType ||
       (bullets.length === 0 ? card.title : null));

  // Body text: verbatim email body or message text (NEVER summary)
  const bodyText = isSystemContext
    ? "No snippet available."
    : (meta?.bodyPreview || meta?.messageText || (bullets.length === 0 && !subTitle ? card.description : null));

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 overflow-hidden">
      {/* Section header */}
      <div className="px-4 py-2.5 flex items-center gap-2 bg-[#eef2f7]">
        {isSystemContext ? (
          <Plug className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : sourceMeta.icon ? (
          <img
            src={sourceMeta.icon}
            alt=""
            className="h-4 w-4 object-contain shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="h-4 w-4 rounded bg-muted-foreground/20 shrink-0" />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {headerLabel}
        </span>
      </div>

      <div className="px-4 pb-4 space-y-3 bg-[#eef2f7]">
        {/* Sender row (emails / messages with a sender) */}
        {(isEmail || isMessage || senderName) && (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[hsl(217_100%_94%)] text-[hsl(217_70%_42%)] flex items-center justify-center text-sm font-bold shrink-0">
              {senderInitial}
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-foreground truncate leading-tight">
                {senderName || (isEmail ? "Outlook Sender" : sourceMeta.label || "System")}
              </p>
              {senderEmail && (
                <p className="text-[11.5px] text-muted-foreground truncate leading-tight">
                  {senderEmail}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Subtitle — subject / event title */}
        {subTitle && (
          <p className="text-[14px] font-bold text-foreground leading-snug">
            {subTitle}
          </p>
        )}

        {/* Bullet metadata */}
        {bullets.length > 0 && (
          <div className="space-y-1">
            {bullets.map((b, i) => (
              <p key={i} className="text-[13px] text-foreground leading-snug">
                <span className="font-semibold">{b.label}:</span> {b.value}
              </p>
            ))}
          </div>
        )}

        {/* Verbatim body / message text */}
        {bodyText && (
          <p className="text-[13px] text-foreground/85 leading-relaxed whitespace-pre-wrap">
            {bodyText}
          </p>
        )}

        {/* Fallback when nothing structured is available */}
        {!subTitle && bullets.length === 0 && !bodyText && !senderName && (
          <p className="text-[12px] text-muted-foreground italic">No snippet available.</p>
        )}
      </div>
    </div>
  );
}

export function DashCardDetailPanel({ card, open, onClose, onExecuteAction }: Props) {
  if (!card || !open) return null;

  const tabKind = inferTabKind(card);
  const ctaLabel = ctaLabelFor(card, tabKind);
  const topLabel = topMetaLabel(card, tabKind);

  return (
    <aside className="w-[420px] shrink-0 h-[calc(100%-1.5rem)] my-3 mr-3 flex flex-col rounded-2xl border border-border shadow-sm overflow-hidden bg-[#fcfcfd]">
      {/* ── Top bar: time meta · more · close ─────────────── */}
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
            aria-label="Close"
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
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
        <OriginalContextCard card={card} tabKind={tabKind} />
        <InsightsRow tabKind={tabKind} />
      </div>

      {/* ── Quick Note ────────────────────────────────────── */}
      <div className="shrink-0 px-6 pt-4 pb-3 shadow-xl bg-white">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Note
          </span>
        </div>
        <textarea
          placeholder="Add a comment, note, or update context..."
          className="w-full min-h-[60px] resize-none rounded-lg border border-border/60 px-3 py-2 text-[12.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors bg-white"
        />
      </div>

      {/* ── Sticky bottom CTA ─────────────────────────────── */}
      <div className="shrink-0 px-6 pb-5 bg-[#fcfcfd] shadow-xl">
        <Button
          className="w-full h-12 gap-2 text-[14px] font-semibold rounded-xl bg-[hsl(217_100%_55%)] hover:bg-[hsl(217_100%_50%)] text-white"
          onClick={() => {
            if (card.actionSuggestion) {
              onExecuteAction?.(card.actionSuggestion);
            }
            onClose();
          }}
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
