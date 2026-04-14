import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Clock, Mail, Calendar, Users, FileText, Hash, BookOpen, Lightbulb, DollarSign, Sparkles } from "lucide-react";
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

function SourceMetadataSection({ card }: { card: DashboardCard }) {
  const meta = card.metadata;
  if (!meta) return null;

  const source = card.source || "";

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source Info</h4>

      {/* Email (Outlook) — email-style layout */}
      {source === "outlook" && (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Email header */}
          <div className="bg-muted/50 px-4 py-3 border-b border-border space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {(meta.senderName || meta.senderEmail || "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{meta.senderName || "Unknown Sender"}</p>
                {meta.senderEmail && <p className="text-xs text-muted-foreground truncate">{meta.senderEmail}</p>}
              </div>
            </div>
            {meta.subject && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground text-xs font-medium">Subject:</span>
                <span className="text-foreground font-medium truncate">{meta.subject}</span>
              </div>
            )}
          </div>
          {/* Email body */}
          <div className="px-4 py-3">
            <p className="text-sm text-foreground leading-relaxed">{card.description}</p>
          </div>
        </div>
      )}

      {/* Meeting (Zoom) */}
      {source === "zoom" && (
        <>
          <MetaRow icon={Calendar} label="Scheduled" value={meta.scheduledDate} />
          <MetaRow icon={Clock} label="Duration" value={meta.duration} />
          {meta.attendees && meta.attendees.length > 0 && (
            <div className="flex items-start gap-2.5 text-sm">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-muted-foreground text-xs">Attendees</span>
                <ul className="text-foreground space-y-0.5">
                  {meta.attendees.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {/* Deal/Contact (HubSpot) */}
      {source === "hubspot" && (
        <>
          <MetaRow icon={Users} label="Contact" value={meta.contactName} />
          <MetaRow icon={DollarSign} label="Deal Value" value={meta.dealValue} />
          <MetaRow icon={FileText} label="Stage" value={meta.stage} />
        </>
      )}

      {/* Slack */}
      {source === "slack" && (
        <>
          <MetaRow icon={Hash} label="Channel" value={meta.channel} />
          <MetaRow icon={Users} label="Author" value={meta.author} />
        </>
      )}

      {/* OneDrive */}
      {source === "onedrive" && (
        <>
          <MetaRow icon={FileText} label="File" value={meta.fileName} />
          <MetaRow icon={Users} label="Shared by" value={meta.sharedBy} />
        </>
      )}

      {/* OneNote */}
      {source === "onenote" && (
        <>
          <MetaRow icon={BookOpen} label="Notebook" value={meta.notebook} />
        </>
      )}
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

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Source badge */}
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

          {/* Source-specific metadata (includes email content for outlook) */}
          <SourceMetadataSection card={card} />

          {/* Summary — skip for outlook since it's shown in the email body */}
          {card.source !== "outlook" && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Summary</h4>
              <p className="text-sm text-foreground leading-relaxed">{card.description}</p>
            </div>
          )}

          {/* Detail — moved to bottom */}
          {card.detail && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Details & Recommendations</h4>
              <p className="text-sm text-foreground leading-relaxed">{card.detail}</p>
            </div>
          )}

          {/* Action Button — replaces the old text-only suggested action */}
          {card.actionSuggestion && (
            <div className="pt-2">
              <Button
                className="w-full gap-2 text-sm font-semibold"
                onClick={() => {
                  onExecuteAction?.(card.actionSuggestion!);
                  onClose();
                }}
              >
                <Sparkles className="h-4 w-4" />
                {card.actionSuggestion.length > 60
                  ? card.actionSuggestion.slice(0, 57) + "…"
                  : card.actionSuggestion}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
