import { useState, useEffect, useCallback, ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Search, ClipboardCheck, RefreshCw, ListTodo, Award, Clock,
  Building2, Plus, Loader2, AlertTriangle, Lightbulb, Check, Users, Zap,
  TrendingUp, AlertCircle,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBusinessDNA } from "./BusinessDNAContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { DashCardDetailPanel } from "./DashCardDetailPanel";
import {
  DashboardCard, badgeClasses, SOURCE_META, TAB_SUBTITLES,
  ICON_MAP, getWaitEscalationColor, getDurationEmoji, TAB_FRAMING, type TabKind,
} from "./dashboardTypes";

const TABS = [
  { id: "Briefing", label: "Briefing", icon: ClipboardCheck },
  { id: "Updates", label: "Updates", icon: RefreshCw },
  { id: "To-Dos", label: "To-Dos", icon: ListTodo },
  { id: "Objectives", label: "Objectives", icon: Award },
];

const CACHE_KEY_PREFIX = "dash_cards_";

function loadCachedCards(brandId: string): Record<string, DashboardCard[]> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + brandId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveCachedCards(brandId: string, tabs: Record<string, DashboardCard[]>) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + brandId, JSON.stringify(tabs));
  } catch { /* quota exceeded – ignore */ }
}

/* ------------------------------------------------------------------ */
/*  Shared card skeleton — same anatomy across all 4 tabs              */
/* ------------------------------------------------------------------ */
interface CardShellProps {
  tab: TabKind;
  card: DashboardCard;
  onOpen: () => void;
  meta?: ReactNode;            // top-right meta (time/source)
  signalBlock?: ReactNode;     // tab-specific middle block
  footerLeft?: ReactNode;      // primary action / CTA
  footerRight?: ReactNode;     // secondary meta
  leadingControl?: ReactNode;  // optional left control (e.g. checkbox for to-dos)
  dimmed?: boolean;
  hideDescription?: boolean;
  className?: string;
}

function CardShell({
  tab, card, onOpen, meta, signalBlock, footerLeft, footerRight, leadingControl, dimmed, hideDescription, className,
}: CardShellProps) {
  const framing = TAB_FRAMING[tab];
  const priorityClass = badgeClasses[card.priority] || badgeClasses.Low;

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className={`group relative overflow-hidden bg-card border border-border/60 rounded-2xl pl-5 pr-5 py-4 w-full flex flex-col gap-3 transition-all duration-200 hover:border-border hover:shadow-md cursor-pointer text-left ${dimmed ? "opacity-60" : ""} ${className || ""}`}
      style={{ flex: "1 1 calc(50% - 0.75rem)", maxWidth: "calc(50% - 0.5rem)", minWidth: "300px" }}
    >
      {/* Accent rail — left edge, tab identity */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${framing.accentBar}`} />

      {/* Header: eyebrow + priority + meta */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {leadingControl}
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${framing.accentChip}`}>
            <framing.icon className="h-2.5 w-2.5" />
            {framing.eyebrow}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${priorityClass}`}>
            {card.priority}
          </span>
        </div>
        {meta && <div className="shrink-0 flex items-center gap-1.5 text-[11px] text-muted-foreground">{meta}</div>}
      </div>

      {/* Title */}
      <h3 className={`text-sm font-semibold leading-snug line-clamp-2 ${dimmed ? "line-through text-muted-foreground" : "text-foreground"}`}>
        {card.title}
      </h3>

      {/* Tab-specific signal block */}
      {signalBlock}

      {/* Description */}
      {!hideDescription && card.description && (
        <p className="text-[12.5px] text-muted-foreground leading-relaxed line-clamp-2">{card.description}</p>
      )}

      {/* Footer: CTA + secondary meta */}
      {(footerLeft || footerRight) && (
        <div className="mt-auto pt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">{footerLeft}</div>
          {footerRight && <div className="shrink-0 flex items-center gap-1.5 text-[11px] text-muted-foreground">{footerRight}</div>}
        </div>
      )}
    </div>
  );
}

/* small inline source chip (used in card meta) */
function SourceChip({ card }: { card: DashboardCard }) {
  const sourceMeta = SOURCE_META[card.source || "general"] || SOURCE_META.general;
  if (!sourceMeta.icon && !sourceMeta.label) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
      {sourceMeta.icon ? (
        <img src={sourceMeta.icon} alt="" className="w-3 h-3 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <Building2 className="w-3 h-3" />
      )}
      <span className="truncate max-w-[80px]">{sourceMeta.label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Briefing Card — calm, informational                                */
/* ------------------------------------------------------------------ */
function BriefingCard({ card, onOpen }: { card: DashboardCard; onOpen: () => void }) {
  const SignalIcon = card.signalType ? (ICON_MAP[card.icon || ""] || Lightbulb) : null;
  const framing = TAB_FRAMING.Briefing;

  return (
    <CardShell
      tab="Briefing"
      card={card}
      onOpen={onOpen}
      meta={
        <>
          <SourceChip card={card} />
          {card.timeAgo && (
            <span className="inline-flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {card.timeAgo}
            </span>
          )}
        </>
      }
      signalBlock={
        card.signalType && SignalIcon ? (
          <div className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md border w-fit ${framing.accentSoftBg} ${framing.accentText}`}>
            <SignalIcon className="w-3 h-3" />
            {card.signalType}
          </div>
        ) : null
      }
      footerLeft={
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${framing.accentText} group-hover:underline`}>
          <framing.ctaIcon className="w-3 h-3" />
          Read briefing
        </span>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Updates Card — urgent, human (waiting party hero)                  */
/* ------------------------------------------------------------------ */
function DashCard({ card, onOpen }: { card: DashboardCard; onOpen: () => void }) {
  const waitColor = getWaitEscalationColor(card.waitDuration);
  const framing = TAB_FRAMING.Updates;
  const initial = (card.waitingParty || card.metadata?.senderName || "?").trim()[0]?.toUpperCase() || "?";

  return (
    <CardShell
      tab="Updates"
      card={card}
      onOpen={onOpen}
      meta={
        <>
          <SourceChip card={card} />
          {card.timeAgo && !card.waitDuration && (
            <span className="inline-flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {card.timeAgo}
            </span>
          )}
        </>
      }
      signalBlock={
        <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border ${framing.accentSoftBg}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${framing.accentChip}`}>
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-foreground truncate">
              {card.waitingParty || card.metadata?.senderName || "External party"}
            </p>
            <p className={`text-[10.5px] ${framing.accentText} font-medium`}>
              is waiting on you{card.requestType ? ` · ${card.requestType}` : ""}
            </p>
          </div>
          {card.waitDuration && (
            <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded border ${waitColor || "text-muted-foreground bg-muted border-border"}`}>
              ⏳ {card.waitDuration}
            </span>
          )}
        </div>
      }
      footerLeft={
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${framing.accentText} group-hover:underline`}>
          <framing.ctaIcon className="w-3 h-3" />
          {framing.ctaLabel}
        </span>
      }
      footerRight={
        card.priority === "High" && card.consequence ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-destructive/80 max-w-[180px] truncate" title={card.consequence}>
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">{card.consequence}</span>
          </span>
        ) : null
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  To-Do Card — focused, kinetic (checkbox + leverage + duration)     */
/* ------------------------------------------------------------------ */
function TodoCard({ card, done, onToggle, onOpen }: { card: DashboardCard; done: boolean; onToggle: () => void; onOpen: () => void }) {
  const durationEmoji = getDurationEmoji(card.estimatedDuration);
  const framing = TAB_FRAMING["To-Dos"];
  const leverage = typeof card.leverageScore === "number" ? card.leverageScore : 0;

  return (
    <CardShell
      tab="To-Dos"
      card={card}
      onOpen={onOpen}
      dimmed={done}
      hideDescription
      leadingControl={
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-label={done ? "Mark as not done" : "Mark as done"}
          className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors mr-1 ${done ? "bg-primary border-primary" : "border-border hover:border-primary/60"}`}
        >
          {done && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
        </button>
      }
      meta={
        card.estimatedDuration ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
            <span>{durationEmoji}</span>
            {card.estimatedDuration}
          </span>
        ) : undefined
      }
      signalBlock={
        leverage > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Leverage</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className={`w-3 h-1.5 rounded-full ${n <= leverage ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
            <span className={`text-[10px] font-semibold ${framing.accentText}`}>{leverage}/5</span>
          </div>
        ) : null
      }
      footerLeft={
        !done ? (
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${framing.accentText} group-hover:underline`}>
            <framing.ctaIcon className="w-3 h-3" />
            {framing.ctaLabel}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground italic">Completed</span>
        )
      }
      footerRight={card.taskType ? <span>{card.taskType}</span> : undefined}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Objective Card — composed, aspirational (progress ring)            */
/* ------------------------------------------------------------------ */
function ProgressRing({ value, accentClass = "stroke-[hsl(142_62%_45%)]" }: { value: number; accentClass?: string }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0">
      <circle cx="18" cy="18" r={r} className="stroke-muted" strokeWidth="3" fill="none" />
      <circle
        cx="18" cy="18" r={r}
        className={accentClass}
        strokeWidth="3" fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform="rotate(-90 18 18)"
      />
      <text x="18" y="21" textAnchor="middle" className="fill-foreground" style={{ fontSize: 10, fontWeight: 600 }}>
        {Math.round(value)}%
      </text>
    </svg>
  );
}

function ObjectiveCard({ card, onOpen }: { card: DashboardCard; onOpen: () => void }) {
  const progress = typeof card.progress === "number" ? card.progress : 0;
  const framing = TAB_FRAMING.Objectives;

  return (
    <CardShell
      tab="Objectives"
      card={card}
      onOpen={onOpen}
      meta={
        card.timeHorizon ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60">
            <Clock className="w-3 h-3" />
            {card.timeHorizon}
          </span>
        ) : undefined
      }
      signalBlock={
        <div className={`flex items-center gap-3 px-2.5 py-2 rounded-lg border ${framing.accentSoftBg}`}>
          <ProgressRing value={progress} />
          {card.successMetric ? (
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Success metric</p>
              <p className="text-[12px] font-medium text-foreground truncate">
                <span className="text-muted-foreground">{card.successMetric.current}</span>
                <span className="mx-1.5 text-muted-foreground">→</span>
                <span className={framing.accentText}>{card.successMetric.target}</span>
              </p>
              {card.successMetric.gap && (
                <p className="text-[10px] text-destructive/70 truncate">Gap: {card.successMetric.gap}</p>
              )}
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Progress</p>
              <p className="text-[12px] font-medium text-foreground">{progress}% toward target</p>
            </div>
          )}
        </div>
      }
      footerLeft={
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${framing.accentText} group-hover:underline`}>
          <framing.ctaIcon className="w-3 h-3" />
          {framing.ctaLabel}
        </span>
      }
      footerRight={
        card.relatedTodoIds && card.relatedTodoIds.length > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {card.relatedTodoIds.length} linked
          </span>
        ) : undefined
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton Loader                                                    */
/* ------------------------------------------------------------------ */
function CardSkeletons() {
  return (
    <div className="flex flex-wrap gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-card border border-border/60 rounded-2xl p-4 flex items-start gap-4" style={{ flex: "1 1 calc(50% - 0.75rem)", maxWidth: "calc(50% - 0.5rem)", minWidth: "300px" }}>
          <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Objective Inline                                               */
/* ------------------------------------------------------------------ */
function AddObjectiveInline({ onAdd }: { onAdd: (title: string, desc: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), desc.trim());
    setTitle(""); setDesc(""); setOpen(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/40 transition-colors">
        <Plus className="h-3.5 w-3.5" /> Add Objective
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 w-full flex flex-col gap-2" style={{ flex: "1 1 calc(50% - 0.75rem)", maxWidth: "calc(50% - 0.5rem)", minWidth: "300px" }}>
      <Input placeholder="Objective title" value={title} onChange={(e) => setTitle(e.target.value)} className="text-sm h-8" autoFocus />
      <Input placeholder="Brief description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} className="text-sm h-8" />
      <div className="flex gap-2 mt-1">
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={!title.trim()}>Add</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main View                                                          */
/* ------------------------------------------------------------------ */
export function ManageDashboardView({ activeBrandId, initialTab, onExecuteAction }: { activeBrandId?: string | null; initialTab?: string; onExecuteAction?: (actionText: string) => void }) {
  const { brands } = useBusinessDNA();
  const [activeTab, setActiveTab] = useState(initialTab || TABS[0].id);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [allTabCards, setAllTabCards] = useState<Record<string, DashboardCard[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customObjectives, setCustomObjectives] = useState<DashboardCard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailCard, setDetailCard] = useState<DashboardCard | null>(null);
  const [completedTodos, setCompletedTodos] = useState<Set<string>>(new Set());
  const [stale, setStale] = useState(false);

  const activeBrand = (activeBrandId ? brands.find(b => b.id === activeBrandId) : null) || brands[0] || null;
  const workspaceId = typeof window !== "undefined" ? localStorage.getItem("preferred_workspace_id") : null;

  // Listen for DNA mutations to mark dashboard stale
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.brandId && activeBrand && detail.brandId === activeBrand.id) {
        setStale(true);
      }
    };
    window.addEventListener("dna_mutated", handler);
    return () => window.removeEventListener("dna_mutated", handler);
  }, [activeBrand?.id]);

  useEffect(() => {
    if (!activeBrand) return;
    setStale(false);
    const cached = loadCachedCards(activeBrand.id);
    if (cached) {
      setAllTabCards(cached);
    } else {
      fetchInsights(activeBrand.id);
    }
  }, [activeBrand?.id]);

  const fetchInsights = useCallback(async (brandId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("dashboard-insights", {
        body: { brandId, workspaceId },
      });
      if (fnError) throw fnError;
      const tabs = data?.tabs || {};
      const result: Record<string, DashboardCard[]> = {
        Briefing: tabs.Briefing || [],
        Updates: tabs.Updates || [],
        "To-Dos": tabs["To-Dos"] || [],
        Objectives: tabs.Objectives || [],
      };
      setAllTabCards(result);
      saveCachedCards(brandId, result);
    } catch (e: any) {
      console.error("Dashboard insights error:", e);
      setError("Failed to load insights. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const handleRefresh = () => {
    if (!activeBrand || loading) return;
    setStale(false);
    fetchInsights(activeBrand.id);
  };

  const handleAddObjective = (title: string, description: string) => {
    const newObj: DashboardCard = {
      id: `custom-${Date.now()}`, priority: "High", title, description,
      category: "Custom", icon: "target", source: "general",
    };
    setCustomObjectives((prev) => [...prev, newObj]);
  };

  const tabCards = allTabCards[activeTab] || [];
  const displayCards = activeTab === "Objectives" ? [...customObjectives, ...tabCards] : tabCards;
  const filteredCards = searchQuery
    ? displayCards.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()))
    : displayCards;

  const hasCards = Object.values(allTabCards).some(arr => arr.length > 0);

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      <div className="px-6 lg:px-8 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{activeTab}</h1>
            {TAB_SUBTITLES[activeTab] && (
              <p className="text-sm text-muted-foreground mt-0.5">{TAB_SUBTITLES[activeTab]}</p>
            )}
          </div>
          {activeBrand && (
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleRefresh} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Update
            </Button>
          )}
        </div>
        {stale && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-800">Business data changed — insights may be outdated.</span>
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 ml-auto" onClick={handleRefresh} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Regenerate"}
            </Button>
          </div>
        )}
        <div className="relative max-w-[220px]">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <input
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-7 pr-2 py-1.5 border border-transparent rounded-md bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background focus:border-border text-[11px] transition-colors"
            placeholder="Search cards..."
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <main className="px-6 lg:px-8 py-6">
          {!activeBrand ? (
            <div className="text-muted-foreground w-full py-12 text-center border-2 border-dashed border-border rounded-lg">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>Select a business to see your dashboard.</p>
            </div>
          ) : loading && !hasCards ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing {activeBrand.name} data & integrations…
              </div>
              <CardSkeletons />
            </>
          ) : error && !hasCards ? (
            <div className="text-destructive w-full py-8 text-center text-sm">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
              <p>{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleRefresh}>Retry</Button>
            </div>
          ) : (
            <motion.div key={`${activeTab}-${activeBrand.id}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="flex flex-wrap gap-4">
              {filteredCards.map((card) =>
                activeTab === "Briefing" ? (
                  <BriefingCard key={card.id} card={card} onOpen={() => setDetailCard(card)} />
                ) : activeTab === "To-Dos" ? (
                  <TodoCard
                    key={card.id}
                    card={card}
                    done={completedTodos.has(card.id)}
                    onToggle={() => setCompletedTodos(prev => {
                      const next = new Set(prev);
                      next.has(card.id) ? next.delete(card.id) : next.add(card.id);
                      return next;
                    })}
                    onOpen={() => setDetailCard(card)}
                  />
                ) : activeTab === "Objectives" ? (
                  <ObjectiveCard key={card.id} card={card} onOpen={() => setDetailCard(card)} />
                ) : (
                  <DashCard key={card.id} card={card} onOpen={() => setDetailCard(card)} />
                )
              )}
              {activeTab === "Objectives" && <AddObjectiveInline onAdd={handleAddObjective} />}
              {filteredCards.length === 0 && !searchQuery && (
                <div className="text-muted-foreground w-full py-8 text-center text-sm">No insights generated yet.</div>
              )}
              {filteredCards.length === 0 && searchQuery && (
                <div className="text-muted-foreground w-full py-8 text-center text-sm">No cards match "{searchQuery}"</div>
              )}
            </motion.div>
          )}
        </main>
      </ScrollArea>

      <DashCardDetailPanel card={detailCard} open={!!detailCard} onClose={() => setDetailCard(null)} onExecuteAction={onExecuteAction} />
    </div>
  );
}
