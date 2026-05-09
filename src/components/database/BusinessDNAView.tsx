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
import BrandOrbLogo from "@/components/ui/brand-orb-logo";
import { PillarView } from "@/components/database/pillars/PillarView";
import { PILLAR_BY_ID } from "@/components/database/pillars/pillarConstants";
import { buildPillarValues } from "@/components/database/pillars/pillarDataMapper";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import superchargeIllustration from "@/assets/supercharge-dna-illustration.svg";

const PILLAR_IDS = new Set(["brand", "product", "audience", "market", "financial", "operations", "people", "growth", "strategy"]);

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
    subtitle: "Landscape & Competitors",
    icon: TrendingUp,
    description: "Your market DNA — competitive landscape, TAM/SAM/SOM, industry trends, regulations, and strategic positioning.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "financial",
    label: "Financial",
    subtitle: "Revenue, Costs & Margins",
    icon: DollarSign,
    description: "Your financial DNA — revenue, costs, margins, P&L, CAC, LTV, churn, forecasts, and unit economics.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "operations",
    label: "Operations",
    subtitle: "Process & Tools",
    icon: Cog,
    description: "Your operations DNA — workflows, SOPs, vendors, tech stack, compliance, KPIs, and automation systems.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "people",
    label: "People",
    subtitle: "Team & Culture",
    icon: Users2,
    description: "Your people DNA — team, headcount, org chart, hiring, salaries, culture, and HR practices.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "growth",
    label: "Growth",
    subtitle: "Marketing & Acquisition",
    icon: Rocket,
    description: "Your growth DNA — campaigns, ads, funnels, channels, creative, ROAS, retention, and referrals.",
    color: "text-primary",
    hslColor: "var(--primary)",
    bgAccent: "bg-primary/10",
    borderAccent: "border-primary/20",
  },
  {
    id: "strategy",
    label: "Strategy",
    subtitle: "Vision & Roadmap",
    icon: Target,
    description: "Your strategy DNA — vision, OKRs, milestones, roadmap, scenarios, bets, and long-term objectives.",
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
          <Textarea placeholder={`Add a ${segment.label.toLowerCase()} insight...`} className="text-sm min-h-[80px] resize-none bg-card" value={newText} onChange={(e) => setNewText(e.target.value)} />
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
  const [editValue, setEditValue] = useState(brand?.agentName || "AI");

  useEffect(() => { setEditValue(brand?.agentName || "AI"); }, [brand?.agentName]);

  if (isEditing) {
    const logoUrl = brand?.logoUrls?.[brand?.selectedLogo ?? 0];
    return (
      <div className="flex items-center gap-2">
        <BrandOrbLogo logoUrl={logoUrl} brandName={brand?.name} size={22} />
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => { if (editValue.trim()) { onRename(editValue.trim()); } setIsEditing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } if (e.key === "Escape") { setEditValue(brand?.agentName || "AI"); setIsEditing(false); } }}
          className="text-base text-foreground bg-transparent border-b border-primary outline-none py-0 px-0 font-medium"
        />
      </div>
    );
  }

  const logoUrl = brand?.logoUrls?.[brand?.selectedLogo ?? 0];
  return (
    <div className="flex items-center gap-2.5">
      <BrandOrbLogo logoUrl={logoUrl} brandName={brand?.name} size={22} />
      <button
        onClick={() => setIsEditing(true)}
        className="text-base text-muted-foreground hover:text-foreground transition-colors group flex items-center gap-1.5"
      >
        {brand?.agentName || "AI"}
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
export function BusinessDNAView({ onBack, activeBrandId, activePillar }: { onBack?: () => void; activeBrandId: string; activePillar?: string }) {
  const [segmentEntries, setSegmentEntries] = useState<Record<string, SegmentEntry[]>>({
    brand: [], product: [], audience: [], market: [], financial: [], operations: [], people: [], growth: [], strategy: [], database: [], settings: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<string | null>(activePillar || "brand");
  const [extendedPillarData, setExtendedPillarData] = useState<Record<string, any>>({});
  const [showSuperchargePopup, setShowSuperchargePopup] = useState(false);
  const navigate = useNavigate();

  // Persist active brandId so standalone routes (e.g. /supercharge-dna) can resolve it
  useEffect(() => {
    if (activeBrandId) localStorage.setItem("tw_active_brand_id", activeBrandId);
  }, [activeBrandId]);

  // Supercharge auto-popup disabled per product decision — users can still
  // launch the supercharge flow manually from the DNA view actions.

  // Sync activeSegment when activePillar prop changes (from sidebar dropdown)
  useEffect(() => {
    if (activePillar) {
      setActiveSegment(activePillar);
    }
  }, [activePillar]);
  const { toast } = useToast();

  // Load the 6 extended pillar rows (market/financial/operations/people/growth/strategy)
  // for the active brand. They were generated by the `enrich-pillars` edge function.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeBrandId) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const extendedTypes = [
        "market", "financial", "operations", "people", "growth", "strategy",
        "brand_dna", "product_dna", "audience_dna",
      ];
      const wsId = localStorage.getItem("preferred_workspace_id");
      let pillarQuery = (supabase as any)
        .from("user_business_data")
        .select("data_type, content, metadata")
        .in("data_type", extendedTypes);
      if (wsId) {
        pillarQuery = pillarQuery.eq("workspace_id", wsId);
      } else {
        pillarQuery = pillarQuery.eq("user_id", session.user.id);
      }
      const { data } = await pillarQuery;
      if (cancelled || !data) return;
      const next: Record<string, any> = {};
      // Map *_dna types back to their pillar id (brand/product/audience)
      const typeToPillar: Record<string, string> = {
        brand_dna: "brand", product_dna: "product", audience_dna: "audience",
      };
      for (const row of data) {
        const md = (row as any).metadata || {};
        if (md.brandId && md.brandId !== activeBrandId) continue;
        const pillarKey = typeToPillar[(row as any).data_type] || (row as any).data_type;
        try {
          next[pillarKey] = JSON.parse((row as any).content);
        } catch {
          next[pillarKey] = (row as any).content;
        }
      }
      setExtendedPillarData(next);
    })();
    return () => { cancelled = true; };
  }, [activeBrandId]);

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

  // Don't render until brand data has loaded — show skeleton matching the active layout
  if (dnaLoading || !activeBrand) {
    const showPillarSkeleton = activeSegment && PILLAR_IDS.has(activeSegment);
    if (showPillarSkeleton) {
      // Skeleton mirrors the new PillarView layout (header + sections + right-rail navigator)
      return (
        <div className="flex h-full w-full">
          <div className="flex-1 overflow-hidden">
            <div className="max-w-3xl mx-auto px-6 pt-8 pb-12 space-y-8">
              {/* Pillar header */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-7 w-40" />
                </div>
                <Skeleton className="h-4 w-3/4" />
              </div>
              {/* Sections */}
              {Array.from({ length: 3 }).map((_, s) => (
                <div key={s} className="space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, f) => (
                      <div key={f} className="rounded-lg border border-border/40 bg-card/50 p-4 space-y-2">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Right-rail navigator skeleton */}
          <div className="hidden lg:block w-48 shrink-0 px-4 py-8 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full rounded" />
            ))}
          </div>
        </div>
      );
    }
    // Default skeleton (non-pillar landing — segment tabs)
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

  const isPillarActive = activeSegment && PILLAR_IDS.has(activeSegment);

  return (
    <div className="flex h-full w-full">
      {/* Left vertical pillar menu */}
      <aside className="w-52 shrink-0 border-r border-border/60 flex flex-col py-4 px-3 gap-0.5 overflow-y-auto bg-background">
        <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Business DNA
        </div>
        {BRAIN_SEGMENTS.filter(s => PILLAR_IDS.has(s.id)).map((seg) => {
          const isActive = activeSegment === seg.id;
          const Icon = seg.icon;
          // Compute simple completion: count non-empty fields / total fields
          const pillarDef = PILLAR_BY_ID[seg.id];
          let fillPct = 0;
          if (pillarDef && activeBrand) {
            const vals = buildPillarValues(seg.id, {
              brand: activeBrand,
              products: products.filter(p => p.brandId === activeBrandId),
              audiences: audiences.filter(a => a.brandId === activeBrandId),
              extended: extendedPillarData?.[seg.id],
              overrides: activeBrand?.pillarOverrides?.[seg.id],
            });
            let total = 0;
            let filled = 0;
            for (const section of pillarDef.sections) {
              for (const field of section.fields) {
                total++;
                const v = vals[field.id];
                if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)) filled++;
              }
            }
            fillPct = total > 0 ? Math.round((filled / total) * 100) : 0;
          }
          const dotColor = fillPct >= 80 ? "bg-emerald-500" : fillPct >= 20 ? "bg-amber-400" : "bg-border";
          return (
            <button
              key={seg.id}
              onClick={() => setActiveSegment(seg.id)}
              className={`flex items-center gap-2 px-2.5 py-2 text-sm font-medium rounded-md transition-colors text-left ${
                isActive
                  ? "bg-[#f3f5f7] text-[#101828]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1">{seg.label}</span>
              <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} title={`${fillPct}% filled`} />
            </button>
          );
        })}
      </aside>
      <div className="flex-1 min-w-0 flex flex-col items-center overflow-hidden">

      <div className="flex-1 w-full overflow-hidden">
        {activeSegment && PILLAR_IDS.has(activeSegment) ? (
          <PillarView
            pillarId={activeSegment}
            agentName={activeBrand?.agentName}
            brand={activeBrand}
            products={products.filter(p => p.brandId === activeBrandId)}
            audiences={audiences.filter(a => a.brandId === activeBrandId || a.productIds?.some(pid => brandProductIds.includes(pid)))}
            pillarData={extendedPillarData}
          />
        ) : (
          <div className="h-full overflow-y-auto">
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
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
      </div>

      <Dialog open={showSuperchargePopup} onOpenChange={setShowSuperchargePopup}>
        <DialogContent className="max-w-3xl bg-background border-border/60 rounded-2xl p-0 overflow-hidden">
          <div className="px-8 pt-8 pb-2">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-bold text-foreground">
                Supercharge your Business DNA
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Connect your tools and feed {activeBrand?.agentName || "your AI CEO"} the context it needs to make sharper decisions for {activeBrand?.name || "your business"}.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-8 pb-2">
            <div className="flex items-stretch justify-center">
              <div className="w-full aspect-[16/7] rounded-lg overflow-hidden bg-background flex items-center justify-center">
                <img
                  src={superchargeIllustration}
                  alt="Supercharge your Business DNA"
                  className="w-full h-full object-contain bg-background"
                />
              </div>
            </div>
          </div>
          <div className="px-8 pb-8 pt-4 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowSuperchargePopup(false)}
              className="rounded-full bg-card hover:bg-card"
            >
              Not now
            </Button>
            <Button
              className="rounded-full"
              onClick={() => {
                if (activeBrandId) {
                  localStorage.setItem("tw_active_brand_id", activeBrandId);
                }
                setShowSuperchargePopup(false);
                navigate("/supercharge-dna");
              }}
            >
              Supercharge DNA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
