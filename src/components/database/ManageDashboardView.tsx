import { useState, useEffect, useCallback, ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Search, ClipboardCheck, RefreshCw, ListTodo, Award, Calendar,
  Building2, Plus, Loader2, AlertTriangle, ArrowRight, Check,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBusinessDNA } from "./BusinessDNAContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { DashCardDetailPanel } from "./DashCardDetailPanel";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import {
  DashboardCard, SOURCE_META, TAB_SUBTITLES,
  TAB_FRAMING, type TabKind,
} from "./dashboardTypes";

/* ── People avatars (initials) ─────────────────────────────── */
const AVATAR_PALETTE = [
  { bg: "bg-[hsl(217_100%_94%)]", text: "text-[hsl(217_70%_42%)]" },
  { bg: "bg-[hsl(280_70%_94%)]", text: "text-[hsl(280_55%_45%)]" },
  { bg: "bg-[hsl(25_95%_92%)]", text: "text-[hsl(25_80%_45%)]" },
  { bg: "bg-[hsl(142_55%_92%)]", text: "text-[hsl(142_55%_32%)]" },
  { bg: "bg-[hsl(48_100%_92%)]", text: "text-[hsl(37_85%_38%)]" },
  { bg: "bg-[hsl(0_85%_94%)]", text: "text-[hsl(0_68%_45%)]" },
];

function hashPick<T>(seed: string, arr: T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function PeopleAvatars({ names }: { names: string[] }) {
  if (!names.length) return null;
  return (
    <div className="flex -space-x-1.5">
      {names.slice(0, 3).map((n, i) => {
        const c = hashPick(n, AVATAR_PALETTE);
        return (
          <span
            key={`${n}-${i}`}
            title={n}
            className={`w-6 h-6 rounded-full ring-2 ring-card flex items-center justify-center text-[9px] font-bold ${c.bg} ${c.text}`}
          >
            {initials(n)}
          </span>
        );
      })}
    </div>
  );
}

/* Pull mentioned people out of card content (heuristic: capitalised "First Last") */
function extractPeople(card: DashboardCard): string[] {
  const out = new Set<string>();
  const add = (n?: string | null) => { if (n && n.trim().length > 1) out.add(n.trim()); };
  add(card.waitingParty);
  add(card.metadata?.senderName);
  add(card.metadata?.contactName);
  add(card.metadata?.author);
  add(card.metadata?.sharedBy);
  if (card.metadata?.attendees) card.metadata.attendees.forEach(add);
  if (out.size < 2) {
    const text = `${card.title} ${card.description}`;
    const matches = text.match(/\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g) || [];
    matches.slice(0, 3).forEach(add);
  }
  return Array.from(out).slice(0, 3);
}

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

/* Show timeAgo on cards only when "recent" (< ~24h) — keeps cards quiet */
function isRecentTimeAgo(t?: string): boolean {
  if (!t) return false;
  const lower = t.toLowerCase();
  return /\b(just now|now|min|minute|hour|hr|h ago|m ago|today)\b/.test(lower);
}

/* ------------------------------------------------------------------ */
/*  Shared card skeleton — clean, generous whitespace                  */
/* ------------------------------------------------------------------ */
interface CardShellProps {
  card: DashboardCard;
  onOpen: () => void;
  topRight?: ReactNode;          // tiny accent (e.g. blue dot for objectives)
  middle?: ReactNode;            // optional middle block (e.g. progress for objectives)
  footerLeft?: ReactNode;        // avatars / date / leverage
  footerRight: ReactNode;        // outline pill CTA with arrow
  leadingControl?: ReactNode;    // optional left control (checkbox for to-dos)
  dimmed?: boolean;
  hideDescription?: boolean;
  topLeft?: ReactNode;           // source logo (briefing/updates/todos)
}

function CardShell({
  card, onOpen, topRight, middle, footerLeft, footerRight,
  leadingControl, dimmed, hideDescription, topLeft,
}: CardShellProps) {
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className={`group relative border border-border/60 rounded-2xl px-6 py-5 w-full flex flex-col gap-4 transition-all duration-300 hover:border-primary/40 cursor-pointer text-left bg-white shadow-[0_0_0_1px_hsl(217_100%_65%/0.15),0_0_12px_0_hsl(217_100%_65%/0.18)] hover:shadow-[0_0_0_1px_hsl(217_100%_65%/0.35),0_0_16px_0_hsl(217_100%_65%/0.28)] ${dimmed ? "opacity-60" : ""}`}
      style={{ flex: "1 1 calc(50% - 0.75rem)", maxWidth: "calc(50% - 0.5rem)", minWidth: "300px" }}
    >
      {/* Header: source logo (or leading control) ↔ accent */}
      {(topLeft || leadingControl || topRight) && (
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {leadingControl}
            {topLeft}
          </div>
          {topRight}
        </div>
      )}

      {/* Title + description block */}
      <div className="flex flex-col gap-2">
        <h3 className={`text-[15px] font-bold leading-snug line-clamp-2 ${dimmed ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {card.title}
        </h3>
        {!hideDescription && card.description && (
          <p className="text-[12.5px] text-muted-foreground leading-relaxed line-clamp-2">
            {card.description}
          </p>
        )}
      </div>

      {/* Optional middle block (objectives progress) */}
      {middle}

      {/* Footer: avatars/date ↔ outline CTA */}
      <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 flex items-center">{footerLeft}</div>
        <div className="shrink-0">{footerRight}</div>
      </div>
    </div>
  );
}

/* Outline pill CTA with arrow — matches screenshot exactly */
function PillCTA({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8 px-3.5 rounded-full text-[12px] font-medium gap-1.5 border-border/70 text-foreground/80 hover:text-foreground bg-white"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </Button>
  );
}

/* Source logo — top-right of card. Falls back to Business Brain Orb for system/DNA-derived signals. */
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

/* ------------------------------------------------------------------ */
/*  Briefing Card                                                      */
/* ------------------------------------------------------------------ */
function BriefingCard({ card, onOpen }: { card: DashboardCard; onOpen: () => void }) {
  const people = extractPeople(card);
  return (
    <CardShell
      card={card}
      onOpen={onOpen}
      topRight={<SourceLogo card={card} />}
      footerLeft={<PeopleAvatars names={people} />}
      footerRight={<PillCTA label="Read briefing" onClick={onOpen} />}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Updates Card                                                       */
/* ------------------------------------------------------------------ */
function DashCard({ card, onOpen }: { card: DashboardCard; onOpen: () => void }) {
  const people = extractPeople(card);
  return (
    <CardShell
      card={card}
      onOpen={onOpen}
      topRight={<SourceLogo card={card} />}
      footerLeft={<PeopleAvatars names={people} />}
      footerRight={<PillCTA label="Respond" onClick={onOpen} />}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  To-Do Card — checkbox + date + branded CTA                         */
/* ------------------------------------------------------------------ */
function todoCtaLabel(card: DashboardCard): string {
  const t = (card.taskType || "").toLowerCase();
  if (t.includes("approve") || t.includes("sign")) return "Approve & Sign";
  if (t.includes("delegate")) return "Delegate";
  if (t.includes("template")) return "Solve via Template";
  if (t.includes("review")) return "Review";
  // fall back to a verb pulled from the title
  const m = card.title.match(/^(Approve|Sign|Review|Draft|Send|Finalize|Delegate|Plan|Schedule)\b/i);
  if (m) {
    const verb = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    if (verb === "Approve" || verb === "Sign") return "Approve & Sign";
    return verb;
  }
  return "Start task";
}

function TodoCard({ card, done, onToggle, onOpen }: { card: DashboardCard; done: boolean; onToggle: () => void; onOpen: () => void }) {
  const dueLabel = card.estimatedDuration || card.timeAgo;
  return (
    <CardShell
      card={card}
      onOpen={onOpen}
      dimmed={done}
      topRight={<SourceLogo card={card} />}
      leadingControl={
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-label={done ? "Mark as not done" : "Mark as done"}
          className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${done ? "bg-primary border-primary" : "border-border hover:border-primary/60"}`}
        >
          {done && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
        </button>
      }
      footerLeft={
        dueLabel ? (
          <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {dueLabel}
          </div>
        ) : null
      }
      footerRight={
        done
          ? <span className="text-[11px] text-muted-foreground italic px-2">Completed</span>
          : <PillCTA label={todoCtaLabel(card)} onClick={onOpen} />
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Objective Card — blue dot + progress block                         */
/* ------------------------------------------------------------------ */
function parseNumeric(s?: string): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function objectiveStatus(card: DashboardCard): { label: string; cls: string; barCls: string; pct: number } {
  const explicit = typeof card.progress === "number" ? card.progress : null;
  const cur = parseNumeric(card.successMetric?.current);
  const tgt = parseNumeric(card.successMetric?.target);
  let pct = explicit ?? (cur !== null && tgt && tgt !== 0 ? (cur / tgt) * 100 : 0);
  pct = Math.max(0, Math.min(100, pct));

  // Heuristic: lower-is-better metrics (churn, gross churn) → invert
  const lowerIsBetter = /churn|cost|cac|loss|attrition/i.test(card.title);
  const ratio = lowerIsBetter && cur !== null && tgt ? tgt / cur : pct / 100;

  let label = "On Track";
  let cls = "bg-[hsl(142_55%_94%)] text-[hsl(142_62%_30%)] border-[hsl(142_42%_75%)]";
  let barCls = "bg-[hsl(142_62%_45%)]";

  if (ratio < 0.6) {
    label = "Behind";
    cls = "bg-[hsl(0_100%_96%)] text-[hsl(0_68%_42%)] border-[hsl(0_75%_78%)]";
    barCls = "bg-[hsl(0_72%_55%)]";
  } else if (ratio < 0.85) {
    label = "At Risk";
    cls = "bg-[hsl(42_100%_94%)] text-[hsl(37_84%_36%)] border-[hsl(42_88%_72%)]";
    barCls = "bg-[hsl(37_92%_55%)]";
  }

  return { label, cls, barCls, pct };
}

function ObjectiveCard({ card, onOpen }: { card: DashboardCard; onOpen: () => void }) {
  const { label, cls, barCls, pct } = objectiveStatus(card);
  const people = extractPeople(card);
  const current = card.successMetric?.current;
  const target = card.successMetric?.target;

  return (
    <CardShell
      card={card}
      onOpen={onOpen}
      hideDescription
      topRight={
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[hsl(217_100%_60%)] shadow-[0_0_0_3px_hsl(217_100%_94%)]" />
          <SourceLogo card={card} />
        </div>
      }
      middle={
        <div className="rounded-xl border border-border/50 px-4 py-3 flex flex-col gap-2.5 bg-[#eef2f7]">
          <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">Current Progress</p>
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-xl font-bold text-foreground truncate">{current || `${Math.round(pct)}%`}</span>
              {target && <span className="text-xs text-muted-foreground truncate">/ {target}</span>}
            </div>
            <span className={`shrink-0 text-[10.5px] font-semibold px-2 py-0.5 rounded-md border ${cls}`}>
              {label}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden bg-white">
            <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      }
      footerLeft={<PeopleAvatars names={people} />}
      footerRight={<PillCTA label="View OKRs" onClick={onOpen} />}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton Loader — tab-aware, animated shimmer                      */
/* ------------------------------------------------------------------ */
function SkeletonCard({ tab, delay }: { tab: string; delay: number }) {
  const isObjective = tab === "Objectives";
  const isTodo = tab === "To-Dos";
  return (
    <div
      className="bg-card border border-border/60 rounded-2xl px-6 py-5 flex flex-col gap-4 animate-fade-in"
      style={{
        flex: "1 1 calc(50% - 0.75rem)",
        maxWidth: "calc(50% - 0.5rem)",
        minWidth: "300px",
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {isTodo && <Skeleton className="h-4 w-4 rounded-full" />}
        </div>
        <div className="flex items-center gap-2">
          {isObjective && <Skeleton className="h-3 w-3 rounded-full" />}
          <Skeleton className="h-[22px] w-[22px] rounded" />
        </div>
      </div>

      {/* Title + description */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-4/5" />
        {!isObjective && (
          <>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </>
        )}
      </div>

      {/* Objective progress block */}
      {isObjective && (
        <div className="rounded-xl border border-border/50 px-4 py-3 flex flex-col gap-2.5 bg-[#eef2f7]">
          <Skeleton className="h-2.5 w-24" />
          <div className="flex items-end justify-between gap-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
        <div className="flex -space-x-1.5">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
    </div>
  );
}

function CardSkeletons({ tab }: { tab: string }) {
  return (
    <div className="flex flex-wrap gap-4">
      {[0, 1, 2, 3].map((i) => (
        <SkeletonCard key={i} tab={tab} delay={i * 80} />
      ))}
    </div>
  );
}

function DetailPanelSkeleton() {
  return (
    <aside className="w-[420px] shrink-0 h-[calc(100%-1.5rem)] my-3 mr-3 flex flex-col rounded-2xl border border-border bg-background shadow-sm overflow-hidden animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <Skeleton className="h-5 w-24 rounded" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      {/* Title */}
      <div className="px-5 py-4 flex flex-col gap-2 border-b border-border/40">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      {/* Body */}
      <div className="flex-1 px-5 py-4 flex flex-col gap-4">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-9/12" />
        <div className="pt-2 flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        <div className="pt-2 flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
      {/* CTA */}
      <div className="px-5 py-4 border-t border-border/60">
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </aside>
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

  // Auto-select first card so the right-side detail panel is always populated.
  useEffect(() => {
    if (filteredCards.length === 0) {
      if (detailCard) setDetailCard(null);
      return;
    }
    const stillExists = detailCard && filteredCards.some((c) => c.id === detailCard.id);
    if (!stillExists) setDetailCard(filteredCards[0]);
  }, [activeTab, filteredCards, detailCard]);

  return (
    <div className="h-full flex relative overflow-hidden bg-white">
      <div className="flex-1 min-w-0 flex flex-col">
      <div className="px-6 lg:px-8 pt-6 pb-3 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{activeTab}</h1>
            {TAB_SUBTITLES[activeTab] && (
              <p className="text-sm text-muted-foreground mt-0.5">{TAB_SUBTITLES[activeTab]}</p>
            )}
          </div>
          {activeBrand && (
            <Button variant="outline" size="sm" className="gap-2 text-xs bg-[#fcfcfd]" onClick={handleRefresh} disabled={loading}>
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
            className="block w-full pl-7 pr-2 py-1.5 border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-[11px] transition-colors bg-white border-border"
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
              <CardSkeletons tab={activeTab} />
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
              {filteredCards.length === 0 && !searchQuery && (() => {
                const tabKey = activeTab as TabKind;
                const framing = TAB_FRAMING[tabKey] || TAB_FRAMING.Briefing;
                const EmptyIcon = framing.emptyIcon;
                return (
                  <div className={`w-full py-12 px-6 text-center border-2 border-dashed rounded-2xl ${framing.accentSoftBg}`}>
                    <div className={`mx-auto w-12 h-12 rounded-full ${framing.accentChip} flex items-center justify-center mb-3`}>
                      <EmptyIcon className="h-6 w-6" />
                    </div>
                    <p className={`text-sm font-semibold ${framing.accentText} mb-1`}>{framing.emptyTitle}</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">{framing.emptyBody}</p>
                  </div>
                );
              })()}
              {filteredCards.length === 0 && searchQuery && (
                <div className="text-muted-foreground w-full py-8 text-center text-sm">No cards match "{searchQuery}"</div>
              )}
            </motion.div>
          )}
        </main>
      </ScrollArea>
      </div>

      {loading && !hasCards && activeBrand ? (
        <DetailPanelSkeleton />
      ) : (
        <DashCardDetailPanel card={detailCard} open={!!detailCard} onClose={() => setDetailCard(null)} onExecuteAction={onExecuteAction} />
      )}
    </div>
  );
}
