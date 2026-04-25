import type { DashboardCard } from "@/components/database/dashboardTypes";
import { badgeClasses } from "@/components/database/dashboardTypes";
import { cn } from "@/lib/utils";

function isDashboardCard(x: unknown): x is DashboardCard {
  if (!x || typeof x !== "object") return false;
  const c = x as DashboardCard;
  return typeof c.id === "string" && typeof c.title === "string";
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
          {list.map((card) => {
            const badge = card.priority ? badgeClasses[card.priority] : badgeClasses.Medium;
            const tab = (card as DashboardCard & { tab?: string }).tab;
            return (
              <div
                key={card.id}
                className="rounded-lg border border-border/50 bg-card p-3 shadow-sm text-left"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {tab ? (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {tab}
                    </span>
                  ) : null}
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", badge)}>
                    {card.priority || "—"}
                  </span>
                </div>
                <div className="font-semibold text-sm text-foreground leading-snug line-clamp-2">{card.title}</div>
                {card.description ? (
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-3">{card.description}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No cards in the last dashboard snapshot for this question.</p>
      )}
    </div>
  );
}
