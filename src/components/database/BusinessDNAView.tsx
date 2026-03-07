import { useState, useEffect, useCallback } from "react";
import {
  Brain, Palette, Package, BookOpen, Loader2, Plus, Trash2, Check, X,
  Pencil, Building2, ArrowLeft, Users, Database
} from "lucide-react";
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
    beta: true,
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
    description: "Your audience DNA — demographics, buying triggers, messaging, engagement patterns, objections, and language guidelines.",
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
    id: "sop",
    label: "SOP",
    subtitle: "Standard Operating Procedures",
    icon: BookOpen,
    description: "Your operational DNA — processes, workflows, playbooks, team structures, and repeatable systems.",
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
// ── Main View ──
export function BusinessDNAView({ onBack, activeBrandId }: { onBack?: () => void; activeBrandId: string }) {
  const [segmentEntries, setSegmentEntries] = useState<Record<string, SegmentEntry[]>>({
    brand: [], product: [], audience: [], database: [], sop: []
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

  const { brands, products, audiences } = useBusinessDNA();
  const activeBrand = brands.find(b => b.id === activeBrandId);
  const brandProductCount = products.filter(p => p.brandId === activeBrandId).length;
  const brandProductIds = products.filter(p => p.brandId === activeBrandId).map(p => p.id);
  const brandAudienceCount = audiences.filter(a => a.productIds?.some(pid => brandProductIds.includes(pid))).length;
  const isBrainLearning = !!activeBrand && brandProductCount > 0 && brandAudienceCount > 0;

  const getSegmentCount = (segId: string) => {
    if (segId === "brand") return activeBrand ? 1 : 0;
    if (segId === "product") return brandProductCount;
    if (segId === "audience") return brandAudienceCount;
    return segmentEntries[segId]?.length || 0;
  };

  const totalInsights = Object.values(segmentEntries).reduce((sum, arr) => sum + arr.length, 0);
  const activeSegmentData = BRAIN_SEGMENTS.find(s => s.id === activeSegment);

  return (
    <div className="flex flex-col h-full items-center">
      <div className="px-6 pt-6 pb-0 space-y-6 border-b border-border/50 w-full max-w-5xl">
        {/* Business Header */}
        <div className="flex items-start gap-4">
          {onBack && (
            <button onClick={onBack} className="mt-1.5 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
           <div className="h-24 w-24 rounded-xl bg-muted/60 border border-border/40 flex items-center justify-center shrink-0 overflow-hidden">
             {activeBrand?.logoUrls && activeBrand.logoUrls.length > 0 ? (
               <img
                 src={activeBrand.logoUrls[activeBrand.selectedLogo ?? 0]}
                 alt={activeBrand.name}
                 className="h-full w-full object-contain p-2"
               />
             ) : (
               <Building2 className="h-11 w-11 text-muted-foreground/60" />
             )}
           </div>
           <div className="flex flex-col gap-2 pt-1">
             <h1 className="text-2xl font-bold text-foreground leading-tight">{activeBrand?.name || "Your Business"}</h1>
             <div className="flex items-center gap-2.5">
                <BusinessBrainOrb size={22} />
               <span className="text-base text-muted-foreground">Business Brain</span>
               <motion.span
                 className="text-base font-medium text-primary"
                 animate={{ opacity: [1, 0.4, 1] }}
                 transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
               >
                 Setting up
               </motion.span>
             </div>
           </div>
        </div>

        {/* Segment Tabs */}
        <div className="flex items-center gap-8">
          {BRAIN_SEGMENTS.map((seg) => {
            const Icon = seg.icon;
            const count = getSegmentCount(seg.id);
            const isActive = activeSegment === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => setActiveSegment(isActive ? null : seg.id)}
                className={cn(
                  "relative flex items-center gap-2 pb-3 text-sm font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? seg.color : "")} />
                <span>{seg.label}</span>
                {seg.beta && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
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
        <div className="max-w-5xl mx-auto px-6 pb-6">
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
              <BusinessDataListView />
            </motion.div>
          ) : activeSegment === "sop" ? (
            <motion.div
              key="sop-coming-soon"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Coming Soon</h3>
              <p className="text-sm text-muted-foreground max-w-sm">Standard Operating Procedures will be available in a future update.</p>
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
