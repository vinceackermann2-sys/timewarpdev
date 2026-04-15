import { useState, useEffect, useCallback } from "react";
import {
  Brain, Palette, Package, Settings, Loader2, Plus, Trash2, Check, X,
  Pencil, Building2, ArrowLeft, Users, Database,
  TrendingUp, DollarSign, Cog, Users2, Rocket, Target
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsView } from "@/components/database/SettingsView";
import { BrandListView } from "@/components/database/BrandListView";
import { ProductListView } from "@/components/database/ProductListView";
import { AudienceListView } from "@/components/database/AudienceListView";
import { BusinessDataListView } from "@/components/database/BusinessDataListView";
import { useBusinessDNA } from "@/components/database/BusinessDNAContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";

// ── Types ──
interface SegmentEntry {
  id: string;
  text: string;
  source: string;
  title: string;
  isManual: boolean;
  createdAt: string;
}

interface BrainSegment {
  id: string;
  label: string;
  subtitle: string;
  icon: any;
  description: string;
  color: string;
  hslColor: string;
  bgAccent: string;
  borderAccent: string;
  beta?: boolean;
}

const BRAIN_SEGMENTS: BrainSegment[] = [
  {
    id: "brand",
    label: "Brand",
    subtitle: "Identity & Perception",
    icon: Palette,
    description: "Your brand DNA — mission, vision, values, voice, visual identity, positioning, and how the world perceives you.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "product",
    label: "Product",
    subtitle: "What You Build & Deliver",
    icon: Package,
    description: "Your product DNA — features, pricing, competitive advantages, user experience, roadmap, and core value proposition.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "audience",
    label: "Audience",
    subtitle: "Who You Serve",
    icon: Users,
    description: "Your audience DNA — personas, journey map, pain points, language patterns, buying triggers, and engagement strategies.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "market",
    label: "Market",
    subtitle: "Where You Compete",
    icon: TrendingUp,
    description: "Market intelligence — TAM/SAM/SOM, competitors, industry trends, regulations, SWOT analysis, and market positioning.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "financial",
    label: "Financial",
    subtitle: "How You Make Money",
    icon: DollarSign,
    description: "Financial DNA — business model, revenue streams, cost structures, unit economics (CAC/LTV), margins, and projections.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "operations",
    label: "Operations",
    subtitle: "How You Run",
    icon: Cog,
    description: "Operational DNA — processes, workflows, tech stack, vendor relationships, KPIs, compliance, and quality standards.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "people",
    label: "People",
    subtitle: "Who Powers You",
    icon: Users2,
    description: "People DNA — org structure, capabilities, culture, hiring needs, team dynamics, and talent strategy.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "growth",
    label: "Growth",
    subtitle: "How You Scale",
    icon: Rocket,
    description: "Growth DNA — channels, funnels, campaigns, creative intelligence, retention strategies, and acquisition metrics.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "strategy",
    label: "Strategy",
    subtitle: "Where You're Going",
    icon: Target,
    description: "Strategic DNA — vision, objectives, OKRs, strategic bets, scenario planning, milestones, and long-term roadmap.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "database",
    label: "Database",
    subtitle: "Connected Business Data",
    icon: Database,
    description: "All your connected and imported business data — documents, websites, text, images, and more.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "settings",
    label: "Settings",
    subtitle: "Safety & Configuration",
    icon: Settings,
    description: "Configure safety guardrails, moderation rules, and custom constraints for your AI employees.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
];

// ── Segment Content ──
function SegmentContent({
  segment, entries, isLoading, onAddManual, onDeleteEntry, onEditEntry,
}: {
  segment: BrainSegment;
  entries: SegmentEntry[];
  isLoading: boolean;
  onAddManual: (segmentId: string, text: string) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onEditEntry: (entryId: string, newText: string) => Promise<void>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await onAddManual(segment.id, newText.trim());
    setNewText("");
    setIsAdding(false);
  };

  const handleEdit = async (id: string) => {
    if (!editText.trim()) return;
    await onEditEntry(id, editText.trim());
    setEditingId(null);
    setEditText("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">{segment.description}</p>
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5 shrink-0" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {isAdding ? "Cancel" : "Add Insight"}
        </Button>
      </div>

      {isAdding && (
        <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
          <Textarea placeholder={`Add a ${segment.label.toLowerCase()} insight...`} className="text-sm min-h-[80px] resize-none bg-background" value={newText} onChange={(e) => setNewText(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setIsAdding(false); setNewText(""); }}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={!newText.trim()}>
              <Check className="h-3 w-3 mr-1" /> Save
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="group rounded-lg border border-border/40 bg-card/50 px-4 py-3 text-sm">
              {editingId === entry.id ? (
                <div className="space-y-2">
                  <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="text-sm min-h-[60px] resize-none" />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleEdit(entry.id)}>Save</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <span className="flex-1 leading-relaxed text-foreground/80">{entry.text}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!entry.isManual && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary mr-1">AI</span>}
                    <button onClick={() => { setEditingId(entry.id); setEditText(entry.text); }} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => onDeleteEntry(entry.id)} className="p-1 rounded hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              )}
              {editingId !== entry.id && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-muted-foreground/60">{entry.source}</span>
                  <span className="text-[10px] text-muted-foreground/40">•</span>
                  <span className="text-[10px] text-muted-foreground/60 truncate">{entry.title}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mb-3", segment.bgAccent)}>
            <segment.icon className={cn("h-6 w-6", segment.color)} />
          </div>
          <p className="text-sm text-muted-foreground">No {segment.label.toLowerCase()} insights yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add insights manually or auto-categorize your data</p>
        </div>
      )}
    </div>
  );
}


// ── Idle State ──
function IdleState({ totalInsights }: { totalInsights: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Brain className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">Select a segment above to view insights</p>
      {totalInsights > 0 && (
        <p className="text-xs text-muted-foreground/60 mt-2">
          {totalInsights} insight{totalInsights !== 1 ? "s" : ""} across your business brain
        </p>
      )}
    </div>
  );
}

// ── Agent Name Editor ──
function AgentNameEditor({ brand, onRename, isBrainLearning }: { brand: any; onRename: (name: string) => void; isBrainLearning: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(brand?.agentName || "AI CEO");

  useEffect(() => { setEditValue(brand?.agentName || "AI CEO"); }, [brand?.agentName]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <BusinessBrainOrb size={22} />
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => { if (editValue.trim()) { onRename(editValue.trim()); } setIsEditing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } if (e.key === "Escape") { setEditValue(brand?.agentName || "AI CEO"); setIsEditing(false); } }}
          className="text-base text-foreground bg-transparent border-b border-primary outline-none py-0 px-0 font-medium"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <BusinessBrainOrb size={22} />
      <button
        onClick={() => setIsEditing(true)}
        className="text-base text-muted-foreground hover:text-foreground transition-colors group flex items-center gap-1.5"
      >
        {brand?.agentName || "AI CEO"}
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      <motion.span
        className="text-base font-medium text-primary"
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {isBrainLearning ? "Learning" : "Setting up"}
      </motion.span>
    </div>
  );
}

// ── Main View ──
export function BusinessDNAView({ onBack, activeBrandId }: { onBack?: () => void; activeBrandId: string }) {
  const [segmentEntries, setSegmentEntries] = useState<Record<string, SegmentEntry[]>>({
    brand: [], product: [], audience: [], market: [], financial: [], operations: [], people: [], growth: [], strategy: [], database: [], settings: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<string | null>("brand");
  const { toast } = useToast();

  const handleAddManual = async (segmentId: string, text: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data, error } = await (supabase as any)
      .from("user_business_data")
      .insert({
        user_id: session.user.id,
        title: `${BRAIN_SEGMENTS.find(s => s.id === segmentId)?.label} insight`,
        content: text, data_type: "text", source: "canvas", is_analyzed: true, analyzed_content: text,
        metadata: { dna_segment: segmentId, dna_insight: text },
      })
      .select("id, created_at").single();

    if (!error && data) {
      setSegmentEntries(prev => ({
        ...prev,
        [segmentId]: [{ id: data.id, text, source: "canvas", title: "Manual insight", isManual: true, createdAt: data.created_at }, ...prev[segmentId]],
      }));
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    await (supabase as any).from("user_business_data").delete().eq("id", entryId);
    setSegmentEntries(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) next[key] = next[key].filter(e => e.id !== entryId);
      return next;
    });
  };

  const handleEditEntry = async (entryId: string, newText: string) => {
    const { data: existing } = await (supabase as any).from("user_business_data").select("metadata").eq("id", entryId).single();
    const meta = (existing?.metadata as any) || {};
    await (supabase as any).from("user_business_data").update({ content: newText, analyzed_content: newText, metadata: { ...meta, dna_insight: newText } }).eq("id", entryId);
    setSegmentEntries(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) next[key] = next[key].map(e => e.id === entryId ? { ...e, text: newText } : e);
      return next;
    });
  };

  const { brands, setBrands, products, audiences, isLoading: dnaLoading, refreshBrand } = useBusinessDNA();
  const activeBrand = brands.find(b => b.id === activeBrandId);

  // Refresh brand data on mount to pick up latest changes (e.g. agentName from onboarding)
  useEffect(() => {
    if (activeBrandId && !dnaLoading) {
      refreshBrand(activeBrandId);
    }
  }, [activeBrandId]); // eslint-disable-line react-hooks/exhaustive-deps
  const brandProductCount = products.filter(p => p.brandId === activeBrandId).length;
  const brandProductIds = products.filter(p => p.brandId === activeBrandId).map(p => p.id);
  const brandAudienceCount = audiences.filter(a => a.brandId === activeBrandId || a.productIds?.some(pid => brandProductIds.includes(pid))).length;
  const isBrainLearning = !!activeBrand && brandProductCount > 0 && brandAudienceCount > 0;

  const handleRenameAgent = (newName: string) => {
    setBrands(prev => prev.map(b => b.id === activeBrandId ? { ...b, agentName: newName } : b));
  };

  const getSegmentCount = (segId: string) => {
    if (segId === "brand") return activeBrand ? 1 : 0;
    if (segId === "product") return brandProductCount;
    if (segId === "audience") return brandAudienceCount;
    return segmentEntries[segId]?.length || 0;
  };

  const totalInsights = Object.values(segmentEntries).reduce((sum, arr) => sum + arr.length, 0);
  const activeSegmentData = BRAIN_SEGMENTS.find(s => s.id === activeSegment);

  // Don't render until brand data has loaded — show skeleton
  if (dnaLoading || !activeBrand) {
    return (
      <div className="flex flex-col h-full items-center">
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0 space-y-4 sm:space-y-6 border-b border-border/50 w-full max-w-5xl">
          <div className="flex items-start gap-3 sm:gap-4">
            <Skeleton className="h-16 w-16 sm:h-24 sm:w-24 rounded-xl shrink-0" />
            <div className="flex flex-col gap-2 pt-1 flex-1 min-w-0">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-8 pb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-20 rounded" />
            ))}
          </div>
        </div>
        <div className="flex-1 w-full max-w-5xl px-4 sm:px-6 pt-5 space-y-6">
          <div className="rounded-xl border border-border/50 bg-card shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full items-center">
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0 space-y-4 sm:space-y-6 border-b border-border/50 w-full max-w-5xl">
        {/* Business Header */}
        <div className="flex items-start gap-3 sm:gap-4">
          {onBack && (
            <button onClick={onBack} className="mt-1.5 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
           <div className="h-16 w-16 sm:h-24 sm:w-24 rounded-xl bg-muted/60 border border-border/40 flex items-center justify-center shrink-0 overflow-hidden">
             {activeBrand?.logoUrls && activeBrand.logoUrls.length > 0 ? (
               <img
                 src={activeBrand.logoUrls[activeBrand.selectedLogo ?? 0]}
                 alt={activeBrand.name}
                 className="h-full w-full object-contain p-2"
               />
             ) : (
               <Building2 className="h-8 w-8 sm:h-11 sm:w-11 text-muted-foreground/60" />
             )}
           </div>
           <div className="flex flex-col gap-1.5 sm:gap-2 pt-1 min-w-0">
             <h1 className="text-lg sm:text-2xl font-bold text-foreground leading-tight truncate">{activeBrand?.name || "Your Business"}</h1>
              <AgentNameEditor brand={activeBrand} onRename={handleRenameAgent} isBrainLearning={isBrainLearning} />
           </div>
        </div>

        {/* Segment Tabs */}
        <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto scrollbar-hide -mx-4 sm:-mx-6 px-4 sm:px-6">
          {BRAIN_SEGMENTS.map((seg) => {
            const Icon = seg.icon;
            const count = getSegmentCount(seg.id);
            const isActive = activeSegment === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => setActiveSegment(isActive ? null : seg.id)}
                className={cn(
                  "relative flex items-center gap-1.5 sm:gap-2 pb-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isActive ? seg.color : "")} />
                <span>{seg.label}</span>
                {seg.beta && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                    Beta
                  </span>
                )}
                {count > 0 && (
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", seg.bgAccent, seg.color)}>
                    {count}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="segment-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                    style={{ background: `hsl(${seg.hslColor})` }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 w-full overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-6">
        <AnimatePresence mode="wait">
          {!activeSegment ? (
            <motion.div
              key="brain-idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <IdleState totalInsights={totalInsights} />
            </motion.div>
          ) : activeSegment === "brand" ? (
            <motion.div
              key="brand-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="pt-5"
            >
              <BrandListView activeBrandId={activeBrandId} />
            </motion.div>
          ) : activeSegment === "product" ? (
            <motion.div
              key="product-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="pt-5"
            >
              <ProductListView activeBrandId={activeBrandId} />
            </motion.div>
          ) : activeSegment === "audience" ? (
            <motion.div
              key="audience-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="pt-5"
            >
              <AudienceListView activeBrandId={activeBrandId} />
            </motion.div>
          ) : activeSegment === "database" ? (
            <motion.div
              key="database-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="pt-5"
            >
              <BusinessDataListView activeBrandId={activeBrandId} />
            </motion.div>
          ) : activeSegment === "settings" ? (
            <motion.div
              key="settings-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="pt-0"
            >
              <SettingsView activeBrandId={activeBrandId} />
            </motion.div>
          ) : activeSegmentData ? (
            <motion.div
              key={activeSegment}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="pt-5"
            >
              <SegmentContent
                segment={activeSegmentData}
                entries={segmentEntries[activeSegment] || []}
                isLoading={isLoading}
                onAddManual={handleAddManual}
                onDeleteEntry={handleDeleteEntry}
                onEditEntry={handleEditEntry}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
