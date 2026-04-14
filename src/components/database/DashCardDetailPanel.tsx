import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Clock, Mail, Calendar, Users, FileText, Hash, BookOpen, Lightbulb, DollarSign, Sparkles, Video, MessageSquare, FolderOpen, StickyNote } from "lucide-react";
import { SOURCE_META, badgeClasses, type DashboardCard } from "./dashboardTypes";
import { Button } from "@/components/ui/button";

interface Props {
  card: DashboardCard | null;
  open: boolean;
  onClose: () => void;
  onExecuteAction?: (actionText: string) => void;
}

function MetaRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <span className="text-muted-foreground text-xs">{label}</span>
        <p className="text-foreground">{value}</p>
      </div>
    </div>
  );
}

/* ── Source content cards — each integration gets a styled content block ── */
function SourceContentBlock({ card }: { card: DashboardCard }) {
  const meta = card.metadata;
  const source = card.source || "";

  /* Outlook — email-style */
  if (source === "outlook") {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b border-border space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {(meta?.senderName || meta?.senderEmail || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{meta?.senderName || "Unknown Sender"}</p>
              {meta?.senderEmail && <p className="text-xs text-muted-foreground truncate">{meta.senderEmail}</p>}
            </div>
          </div>
          {meta?.subject && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs font-medium">Subject:</span>
              <span className="text-foreground font-medium truncate">{meta.subject}</span>
            </div>
          )}
        </div>
        <div className="px-4 py-3">
          <p className="text-sm text-foreground leading-relaxed">{card.description}</p>
        </div>
      </div>
    );
  }

  /* Zoom — meeting-style */
  if (source === "zoom") {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Video className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-semibold text-foreground">{card.title}</p>
          </div>
        </div>
        <div className="px-4 py-3 space-y-2.5">
          {meta?.scheduledDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground">{meta.scheduledDate}</span>
            </div>
          )}
          {meta?.duration && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground">{meta.duration}</span>
            </div>
          )}
          {meta?.attendees && meta.attendees.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <Users className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div className="text-foreground space-y-0.5">
                {meta.attendees.map((a, i) => <p key={i}>{a}</p>)}
              </div>
            </div>
          )}
          <p className="text-sm text-foreground/80 leading-relaxed pt-1">{card.description}</p>
        </div>
      </div>
    );
  }

  /* HubSpot — deal/contact-style */
  if (source === "hubspot") {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <DollarSign className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-semibold text-foreground">{card.title}</p>
          </div>
        </div>
        <div className="px-4 py-3 space-y-2.5">
          {meta?.contactName && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground">{meta.contactName}</span>
            </div>
          )}
          {meta?.dealValue && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground">{meta.dealValue}</span>
            </div>
          )}
          {meta?.stage && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground">Stage: {meta.stage}</span>
            </div>
          )}
          <p className="text-sm text-foreground/80 leading-relaxed pt-1">{card.description}</p>
        </div>
      </div>
    );
  }

  /* Slack — channel message-style */
  if (source === "slack") {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0 flex items-center gap-2">
              {meta?.channel && <span className="text-sm font-semibold text-foreground">#{meta.channel}</span>}
              {meta?.author && <span className="text-xs text-muted-foreground">by {meta.author}</span>}
            </div>
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm text-foreground leading-relaxed">{card.description}</p>
        </div>
      </div>
    );
  }

  /* OneDrive — file-style */
  if (source === "onedrive") {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-semibold text-foreground truncate">{meta?.fileName || card.title}</p>
          </div>
        </div>
        <div className="px-4 py-3 space-y-2">
          {meta?.sharedBy && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground">Shared by {meta.sharedBy}</span>
            </div>
          )}
          <p className="text-sm text-foreground/80 leading-relaxed">{card.description}</p>
        </div>
      </div>
    );
  }

  /* OneNote — note-style */
  if (source === "onenote") {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <StickyNote className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-semibold text-foreground truncate">{meta?.notebook || card.title}</p>
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm text-foreground leading-relaxed">{card.description}</p>
        </div>
      </div>
    );
  }

  /* General / Business DNA / fallback — simple summary */
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Summary</h4>
      <p className="text-sm text-foreground leading-relaxed">{card.description}</p>
    </div>
  );
}

export function DashCardDetailPanel({ card, open, onClose, onExecuteAction }: Props) {
  if (!card) return null;

  const sourceMeta = SOURCE_META[card.source || "general"] || SOURCE_META.general;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[420px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${badgeClasses[card.priority] || badgeClasses.Low}`}>
              {card.priority} Priority
            </span>
            {card.category && (
              <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                {card.category}
              </span>
            )}
          </div>
          <SheetTitle className="text-base">{card.title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col">
          <div className="space-y-5 flex-1">
            {/* Source badge + time */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {sourceMeta.icon && (
                <img src={sourceMeta.icon} alt="" className="h-4 w-4 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <span className="font-medium">{sourceMeta.label}</span>
              {card.timeAgo && (
                <>
                  <span className="mx-1">·</span>
                  <Clock className="h-3 w-3" />
                  <span>{card.timeAgo}</span>
                </>
              )}
            </div>

            {/* Source-specific content block */}
            <SourceContentBlock card={card} />
          </div>

          {/* Bottom section — pinned to bottom */}
          <div className="mt-auto pt-5 space-y-4 border-t border-border/60">
            {/* Details & Recommendations */}
            {card.detail && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Summary & Recommendation</h4>
                <p className="text-sm text-foreground leading-relaxed">{card.detail}</p>
              </div>
            )}

            {/* Action Button — short label */}
            {card.actionSuggestion && (
              <Button
                className="w-full gap-2 text-sm font-semibold"
                onClick={() => {
                  onExecuteAction?.(card.actionSuggestion!);
                  onClose();
                }}
              >
                <Sparkles className="h-4 w-4" />
                Execute in Assistant
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
