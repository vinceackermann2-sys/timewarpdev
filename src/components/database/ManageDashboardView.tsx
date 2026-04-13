import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search, ClipboardCheck, RefreshCw, ListTodo, Award, Clock,
  Building2, Plus, Loader2, AlertTriangle, ChevronRight,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBusinessDNA } from "./BusinessDNAContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { DashCardDetailPanel } from "./DashCardDetailPanel";
import { DashboardCard, badgeClasses, SOURCE_META, getCardButtonLabel } from "./dashboardTypes";

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
/*  Card Component                                                     */
/* ------------------------------------------------------------------ */
function DashCard({ card, onOpen }: { card: DashboardCard; onOpen: () => void }) {
  const sourceMeta = SOURCE_META[card.source || "general"] || SOURCE_META.general;

  return (
    <button
      onClick={onOpen}
      className="bg-card border border-border/60 rounded-2xl p-4 w-full flex items-start gap-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md text-left cursor-pointer"
      style={{ flex: "1 1 calc(50% - 0.75rem)", maxWidth: "calc(50% - 0.5rem)", minWidth: "300px" }}
    >
      {/* Source icon */}
      <div className="shrink-0 bg-white border border-border/40 p-2 rounded-xl flex items-center justify-center w-12 h-12 mt-0.5">
        {sourceMeta.icon ? (
          <img
            src={sourceMeta.icon}
            alt={sourceMeta.label}
            className="w-7 h-7 rounded object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).parentElement!.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>';
            }}
          />
        ) : (
          <Building2 className="w-7 h-7 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm text-foreground truncate">{card.title}</span>
          {card.category && (
            <span className="shrink-0 text-[10px] text-muted-foreground font-medium border border-border rounded px-1.5 py-0.5">
              {card.category}
            </span>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground line-clamp-1">{card.description}</p>
        {card.timeAgo && (
          <div className="flex items-center text-muted-foreground/70 text-[11px] mt-1.5">
            <Clock className="w-3 h-3 mr-1" />
            {card.timeAgo}
          </div>
        )}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton Loader                                                    */
/* ------------------------------------------------------------------ */
function CardSkeletons() {
  return (
    <div className="flex flex-wrap gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3" style={{ flex: "1 1 calc(33.333% - 1rem)", maxWidth: "calc(33.333% - 0.67rem)", minWidth: "280px" }}>
          <div className="flex justify-between items-start">
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-7 w-7 rounded" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
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
    <div className="bg-card border border-border rounded-xl p-5 w-full flex flex-col gap-2" style={{ flex: "1 1 calc(33.333% - 1rem)", maxWidth: "calc(33.333% - 0.67rem)", minWidth: "280px" }}>
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
export function ManageDashboardView({ activeBrandId }: { activeBrandId?: string | null }) {
  const { brands } = useBusinessDNA();
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [allTabCards, setAllTabCards] = useState<Record<string, DashboardCard[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customObjectives, setCustomObjectives] = useState<DashboardCard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailCard, setDetailCard] = useState<DashboardCard | null>(null);

  const activeBrand = (activeBrandId ? brands.find(b => b.id === activeBrandId) : null) || brands[0] || null;
  const workspaceId = typeof window !== "undefined" ? localStorage.getItem("preferred_workspace_id") : null;

  // Load cached cards on brand change
  useEffect(() => {
    if (!activeBrand) return;
    const cached = loadCachedCards(activeBrand.id);
    if (cached) {
      setAllTabCards(cached);
    } else {
      // No cache – fetch automatically
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
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          {activeBrand && (
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleRefresh} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Update
            </Button>
          )}
        </div>
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

      <div className="border-t border-b border-border">
        <div className="px-6 lg:px-8">
          <nav className="flex gap-8" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors outline-none ${
                    isActive ? "border-transparent text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}>
                  <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <motion.div layoutId="manageDashTabIndicator" className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-primary" initial={false} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                  )}
                </button>
              );
            })}
          </nav>
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
              {filteredCards.map((card) => (
                <DashCard key={card.id} card={card} onOpen={() => setDetailCard(card)} />
              ))}
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

      <DashCardDetailPanel card={detailCard} open={!!detailCard} onClose={() => setDetailCard(null)} />
    </div>
  );
}
