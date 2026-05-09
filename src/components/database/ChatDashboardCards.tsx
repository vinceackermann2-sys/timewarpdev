import { ArrowRight } from "lucide-react";
import {
  type DashboardCard,
  badgeClasses,
  SOURCE_META,
  inferTabKind,
  TAB_FRAMING,
  deltaBadge,
} from "@/components/database/dashboardTypes";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isDashboardCard(x: unknown): x is DashboardCard {
  if (!x || typeof x !== "object") return false;
  const c = x as DashboardCard;
  return typeof c.id === "string" && typeof c.title === "string";
}

/* Source logo — same logic as ManageDashboardView */
function SourceLogo({ card, size = 22 }: { card: DashboardCard; size?: number }) {
  const sourceKey = card.source || "general";
  const sourceMeta = SOURCE_META[sourceKey] || SOURCE_META.general;
  const isSystem =
    !sourceMeta.icon ||
    sourceKey === "general" ||
    sourceKey === "system" ||
    sourceKey === "business_dna" ||
    sourceKey === "dna";

  if (isSystem) {
    return <BusinessBrainOrb size={size} />;
  }

  return (
    <img
      src={sourceMeta.icon}
      alt={sourceMeta.label}
      title={sourceMeta.label}
      className="object-contain shrink-0"
      style={{ width: size, height: size }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

/** A single dashboard-style card rendered inside chat, with a hover menu that
 * surfaces the same action information shown in the full dashboard panel. */
function ChatDashCard({ card }: { card: DashboardCard }) {
  const tabKind = (card.tab as ReturnType<typeof inferTabKind>) || inferTabKind(card);
  const framing = TAB_FRAMING[tabKind];
  const delta = deltaBadge(card.deltaState);
  const badge = card.priority ? badgeClasses[card.priority] : badgeClasses.Medium;
  const sourceMeta = SOURCE_META[card.source || "general"] || SOURCE_META.general;
  const ctaLabel = framing.ctaLabel;

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className="group relative border border-border/60 rounded-2xl px-4 py-4 w-full flex flex-col gap-3 transition-all duration-200 hover:border-border hover:shadow-md cursor-pointer text-left bg-accent"
        >
          {/* Header: source logo + delta + priority */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <SourceLogo card={card} />
              {delta && (
                <span
                  title={delta.label}
                  className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md", delta.cls)}
                >
                  <span className="leading-none">{delta.glyph}</span>
                  <span>{delta.label}</span>
                </span>
              )}
            </div>
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0", badge)}>
              {card.priority || "—"}
            </span>
          </div>

          {/* Title + description */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[13.5px] font-bold leading-snug line-clamp-2 text-foreground">
              {card.title}
            </h3>
            {card.description && (
              <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                {card.description}
              </p>
            )}
          </div>

          {/* Footer: tab + outline pill CTA with arrow */}
          <div className="mt-auto pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
            <span className={cn("text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded", framing.accentChip)}>
              {framing.eyebrow}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 rounded-full text-[11px] font-medium gap-1 border-border/70 text-foreground/80 hover:text-foreground bg-card"
              onClick={(e) => e.stopPropagation()}
            >
              {ctaLabel}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </HoverCardTrigger>

      {/* Hover menu — mirrors the dashboard detail panel essentials */}
      <HoverCardContent align="start" className="w-96 text-left space-y-3 p-4">
        <div className="flex items-center gap-2">
          <SourceLogo card={card} size={20} />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {sourceMeta.label} · {framing.eyebrowFull}
          </span>
        </div>

        <div>
          <div className="text-[14px] font-semibold text-foreground leading-snug">{card.title}</div>
          {card.description && (
            <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">
              {card.description}
            </p>
          )}
        </div>

        {card.detail && (
          <p className="text-[12px] text-foreground/80 leading-relaxed border-l-2 border-primary/30 pl-2.5">
            {card.detail}
          </p>
        )}

        {card.actionSuggestion && (
          <div className="rounded-md bg-muted/50 border border-border/40 p-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              {framing.summaryLabel}
            </div>
            <p className="text-[12px] text-foreground/90 leading-relaxed">{card.actionSuggestion}</p>
          </div>
        )}

        {(card.metadata?.bodyPreview || card.metadata?.messageText) && (
          <p className="text-[11.5px] text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed font-mono bg-muted/30 rounded p-2">
            {card.metadata?.bodyPreview || card.metadata?.messageText}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          {card.timeAgo && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{card.timeAgo}</span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 rounded-full text-[11px] font-medium gap-1 ml-auto"
          >
            {ctaLabel}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function ChatDashboardCards({
  cards,
  openingSummary,
}: {
  cards: unknown[];
  openingSummary?: string | null;
}) {
  const list = (cards || []).filter(isDashboardCard);
  if (!list.length && !openingSummary) return null;

  return (
    <div className="my-4 space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dashboard</div>
      {openingSummary ? (
        <p className="text-sm text-foreground/85 leading-relaxed border-l-2 border-primary/40 pl-3">
          {openingSummary}
        </p>
      ) : null}
      {list.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((card) => (
            <ChatDashCard key={card.id} card={card} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No cards in the last dashboard snapshot for this question.</p>
      )}
    </div>
  );
}
