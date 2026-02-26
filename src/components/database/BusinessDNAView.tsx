import { useState, useEffect, useCallback } from "react";
import {
  Brain, Palette, Package, BookOpen, Loader2, Plus, Trash2, Check, X,
  Pencil, Building2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
}

const BRAIN_SEGMENTS: BrainSegment[] = [
  {
    id: "brand",
    label: "Brand",
    subtitle: "Identity & Perception",
    icon: Palette,
    description: "Your brand DNA — mission, vision, values, voice, visual identity, positioning, and how the world perceives you.",
    color: "text-violet-400",
    hslColor: "263 70% 58%",
    bgAccent: "bg-violet-500/10",
    borderAccent: "border-violet-500/20",
  },
  {
    id: "product",
    label: "Product",
    subtitle: "What You Build & Deliver",
    icon: Package,
    description: "Your product DNA — features, pricing, competitive advantages, user experience, roadmap, and core value proposition.",
    color: "text-sky-400",
    hslColor: "199 89% 48%",
    bgAccent: "bg-sky-500/10",
    borderAccent: "border-sky-500/20",
  },
  {
    id: "sop",
    label: "SOP",
    subtitle: "Standard Operating Procedures",
    icon: BookOpen,
    description: "Your operational DNA — processes, workflows, playbooks, team structures, and repeatable systems.",
    color: "text-emerald-400",
    hslColor: "160 84% 39%",
    bgAccent: "bg-emerald-500/10",
    borderAccent: "border-emerald-500/20",
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


// ── Animated Brain Circle ──
function AnimatedBrainCircle() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Outer animated gradient ring */}
        <motion.div
          className="h-32 w-32 rounded-full p-[3px]"
          style={{
            background: "conic-gradient(from 0deg, hsl(var(--primary)), hsl(263 70% 58%), hsl(199 89% 48%), hsl(160 84% 39%), hsl(var(--primary)))",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
            {/* Inner pulsing gradient */}
            <motion.div
              className="h-24 w-24 rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Brain className="h-10 w-10 text-primary" />
            </motion.div>
          </div>
        </motion.div>

        {/* Orbiting dots */}
        {[0, 120, 240].map((deg, i) => (
          <motion.div
            key={i}
            className="absolute h-2.5 w-2.5 rounded-full"
            style={{
              background: i === 0 ? "hsl(263 70% 58%)" : i === 1 ? "hsl(199 89% 48%)" : "hsl(160 84% 39%)",
              top: "50%",
              left: "50%",
            }}
            animate={{
              x: [
                Math.cos(((deg) * Math.PI) / 180) * 76,
                Math.cos(((deg + 360) * Math.PI) / 180) * 76,
              ],
              y: [
                Math.sin(((deg) * Math.PI) / 180) * 76,
                Math.sin(((deg + 360) * Math.PI) / 180) * 76,
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground animate-pulse">Business brain setting up...</p>
    </div>
  );
}

// ── Main View ──
export function BusinessDNAView() {
  const [segmentEntries, setSegmentEntries] = useState<Record<string, SegmentEntry[]>>({
    brand: [], product: [], sop: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const { toast } = useToast();

  const loadEntries = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setIsLoading(false); return; }

    const { data } = await (supabase as any)
      .from("user_business_data")
      .select("id, title, content, analyzed_content, created_at, metadata, source")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const grouped: Record<string, SegmentEntry[]> = { brand: [], product: [], sop: [] };
      for (const d of data) {
        const meta = d.metadata as any;
        const seg = meta?.dna_segment;
        if (seg && grouped[seg]) {
          grouped[seg].push({
            id: d.id,
            text: meta?.dna_insight || d.analyzed_content || d.content || d.title,
            source: d.source,
            title: d.title,
            isManual: d.source === "canvas" && !meta?.dna_insight,
            createdAt: d.created_at,
          });
        }
      }
      setSegmentEntries(grouped);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);


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

  const totalInsights = Object.values(segmentEntries).reduce((sum, arr) => sum + arr.length, 0);
  const activeSegmentData = BRAIN_SEGMENTS.find(s => s.id === activeSegment);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 space-y-5 border-b border-border/50">
        {/* Business Logo & Name */}
      {/* Business Logo & Name */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">Your Business</h1>
            <p className="text-xs text-muted-foreground">Business brain setting up...</p>
          </div>
        </div>

        {/* Segment Tabs */}
        <div className="flex items-center gap-2">
          {BRAIN_SEGMENTS.map((seg) => {
            const Icon = seg.icon;
            const count = segmentEntries[seg.id]?.length || 0;
            const isActive = activeSegment === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => setActiveSegment(isActive ? null : seg.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? cn("border-primary/30 bg-primary/10 text-foreground", seg.bgAccent)
                    : "border-border bg-card/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? seg.color : "")} />
                <span>{seg.label}</span>
                {count > 0 && (
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", seg.bgAccent, seg.color)}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <ScrollArea className="flex-1 px-6 pb-6">
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
              <AnimatedBrainCircle />
              {totalInsights > 0 && (
                <p className="text-xs text-muted-foreground/60 mt-4">
                  {totalInsights} insight{totalInsights !== 1 ? "s" : ""} across your business brain
                </p>
              )}
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
      </ScrollArea>

      
    </div>
  );
}
