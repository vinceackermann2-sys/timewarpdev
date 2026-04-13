import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Clock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SOURCE_META, type DashboardCard } from "./dashboardTypes";

interface Props {
  card: DashboardCard | null;
  open: boolean;
  onClose: () => void;
}

const badgeClasses: Record<string, string> = {
  High: "bg-destructive/80 text-destructive-foreground",
  Medium: "bg-[hsl(45,93%,47%)]/80 text-white",
  Low: "bg-emerald-500/80 text-white",
};

export function DashCardDetailPanel({ card, open, onClose }: Props) {
  if (!card) return null;

  const sourceMeta = SOURCE_META[card.source || "general"] || SOURCE_META.general;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[420px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${badgeClasses[card.priority] || badgeClasses.Low}`}>
              {card.priority}
            </span>
            {card.category && (
              <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                {card.category}
              </span>
            )}
          </div>
          <SheetTitle className="text-base">{card.title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Source */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <img src={sourceMeta.icon} alt="" className="h-4 w-4 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <span className="font-medium">{sourceMeta.label}</span>
            {card.timeAgo && (
              <>
                <span className="mx-1">·</span>
                <Clock className="h-3 w-3" />
                <span>{card.timeAgo}</span>
              </>
            )}
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Summary</h4>
            <p className="text-sm text-foreground leading-relaxed">{card.description}</p>
          </div>

          {/* Detail */}
          {card.detail && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Details & Recommendations</h4>
              <p className="text-sm text-foreground leading-relaxed">{card.detail}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
