import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Clock, Mail, Calendar, Users, FileText, Hash, BookOpen, Lightbulb, DollarSign, Sparkles, Video, MessageSquare, FolderOpen, StickyNote, Zap, AlertTriangle, Target, TrendingUp } from "lucide-react";
import { SOURCE_META, badgeClasses, getWaitEscalationColor, getDurationEmoji, type DashboardCard } from "./dashboardTypes";
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
          {meta?.scheduledDate && <MetaRow icon={Calendar} label="Date" value={meta.scheduledDate} />}
          {meta?.duration && <MetaRow icon={Clock} label="Duration" value={meta.duration} />}
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
          {meta?.contactName && <MetaRow icon={Users} label="Contact" value={meta.contactName} />}
          {meta?.dealValue && <MetaRow icon={DollarSign} label="Value" value={meta.dealValue} />}
          {meta?.stage && <MetaRow icon={FileText} label="Stage" value={meta.stage} />}
          <p className="text-sm text-foreground/80 leading-relaxed pt-1">{card.description}</p>
        </div>
      </div>
    );
  }

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
          {meta?.sharedBy && <MetaRow icon={Users} label="Shared by" value={meta.sharedBy} />}
          <p className="text-sm text-foreground/80 leading-relaxed">{card.description}</p>
        </div>
      </div>
    );
  }

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

  if (source === "teams") {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0 flex items-center gap-2">
              {meta?.channel && <span className="text-sm font-semibold text-foreground">{meta.channel}</span>}
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

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Summary</h4>
      <p className="text-sm text-foreground leading-relaxed">{card.description}</p>
    </div>
  );
}

/* ── Tab-specific detail sections ── */
function TabSpecificDetails({ card }: { card: DashboardCard }) {
  // Updates: waiting party, wait duration, consequence
  if (card.waitingParty || card.waitDuration || card.consequence) {
    const waitColor = getWaitEscalationColor(card.waitDuration);
    return (
      <div className="space-y-3">
        {card.waitingParty && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-xs">Waiting on you:</span>
            <span className="text-foreground font-medium">{card.waitingParty}</span>
          </div>
        )}
        {card.waitDuration && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${waitColor}`}>
              ⏳ Waiting {card.waitDuration}
            </span>
          </div>
        )}
        {card.requestType && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-xs">Type:</span>
            <span className="text-foreground">{card.requestType}</span>
          </div>
        )}
        {card.consequence && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs font-semibold text-destructive">Consequence of Inaction</span>
            </div>
            <p className="text-sm text-foreground/80">{card.consequence}</p>
          </div>
        )}
      </div>
    );
  }

  // To-Dos: howTo, estimated duration, leverage
  if (card.howTo || card.estimatedDuration || card.taskType) {
    const durationEmoji = getDurationEmoji(card.estimatedDuration);
    return (
      <div className="space-y-3">
        {card.estimatedDuration && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-xs">Duration:</span>
            <span className="text-foreground font-medium">{durationEmoji} {card.estimatedDuration}</span>
          </div>
        )}
        {card.taskType && (
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-xs">Type:</span>
            <span className="text-foreground">{card.taskType}</span>
          </div>
        )}
        {card.howTo && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">How To Complete</h4>
            <div className="text-sm text-foreground leading-relaxed space-y-1 pl-1">
              {card.howTo.split(/\n|(?=\d+\.)/).filter(Boolean).map((step, i) => (
                <p key={i} className="flex items-start gap-1.5">
                  <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                  <span>{step.replace(/^\d+\.\s*/, "").trim()}</span>
                </p>
              ))}
            </div>
          </div>
        )}
        {typeof card.leverageScore === "number" && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-xs">Leverage:</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className={`w-4 h-1.5 rounded-full ${n <= card.leverageScore! ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Objectives: success metric, progress, time horizon
  if (card.successMetric || typeof card.progress === "number" || card.timeHorizon) {
    const progress = typeof card.progress === "number" ? card.progress : 0;
    return (
      <div className="space-y-3">
        {typeof card.progress === "number" && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-semibold text-foreground">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        {card.successMetric && (
          <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-1.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Success Metric</h4>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{card.successMetric.current}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold text-foreground">{card.successMetric.target}</span>
            </div>
            {card.successMetric.gap && (
              <p className="text-xs text-destructive/70">Gap: {card.successMetric.gap}</p>
            )}
            {card.successMetric.source && (
              <p className="text-[10px] text-muted-foreground">Source: {card.successMetric.source}</p>
            )}
          </div>
        )}
        {card.timeHorizon && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-xs">Horizon:</span>
            <span className="text-foreground font-medium">{card.timeHorizon}</span>
          </div>
        )}
        {card.relatedTodoIds && card.relatedTodoIds.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-xs">{card.relatedTodoIds.length} linked to-do{card.relatedTodoIds.length > 1 ? "s" : ""}</span>
          </div>
        )}
        {card.objectiveType && (
          <div className="flex items-center gap-2 text-sm">
            <Lightbulb className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-xs">Type:</span>
            <span className="text-foreground">{card.objectiveType}</span>
          </div>
        )}
      </div>
    );
  }

  // Briefing: signalType
  if (card.signalType) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Lightbulb className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground text-xs">Signal:</span>
        <span className="text-foreground font-medium">{card.signalType}</span>
      </div>
    );
  }

  return null;
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

            {/* Tab-specific details */}
            <TabSpecificDetails card={card} />
          </div>

          {/* Bottom section — pinned to bottom */}
          <div className="mt-auto pt-5 space-y-4 border-t border-border/60">
            {card.detail && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Summary & Recommendation</h4>
                <p className="text-sm text-foreground leading-relaxed">{card.detail}</p>
              </div>
            )}

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
