import { useState, useEffect, useCallback } from "react";
import {
  Brain, Palette, Package, BookOpen, Loader2, Plus, Trash2, Check, X,
  RefreshCw, Globe, Pencil, Link, ChevronLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

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
    description:
      "Your brand DNA — mission, vision, values, voice, visual identity, positioning, and how the world perceives you. Everything that shapes who you are.",
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
    description:
      "Your product DNA — features, pricing, competitive advantages, user experience, roadmap, and the core value proposition you deliver to customers.",
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
    description:
      "Your operational DNA — processes, workflows, playbooks, team structures, and the repeatable systems that keep your business running consistently.",
    color: "text-emerald-400",
    hslColor: "160 84% 39%",
    bgAccent: "bg-emerald-500/10",
    borderAccent: "border-emerald-500/20",
  },
];

// ── Segment Card ──
function SegmentCard({
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
  const Icon = segment.icon;

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
    <Card className={cn("border", segment.borderAccent, "bg-card/50 backdrop-blur-sm")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", segment.bgAccent)}>
              <Icon className={cn("h-4.5 w-4.5", segment.color)} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{segment.label}</CardTitle>
              <CardDescription className="text-xs">{segment.subtitle}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {entries.length > 0 && (
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", segment.bgAccent, segment.color)}>
                {entries.length}
              </span>
            )}
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setIsAdding(!isAdding)}>
              {isAdding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{segment.description}</p>

        {isAdding && (
          <div className="space-y-2 pt-1">
            <Textarea placeholder={`Add a ${segment.label.toLowerCase()} insight...`} className="text-xs min-h-[60px] resize-none" value={newText} onChange={(e) => setNewText(e.target.value)} />
            <div className="flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setIsAdding(false); setNewText(""); }}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!newText.trim()}>
                <Check className="h-3 w-3 mr-1" /> Save
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : entries.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            {entries.map((entry) => (
              <div key={entry.id} className="group rounded-md border border-border/40 bg-muted/20 px-2.5 py-2 text-xs">
                {editingId === entry.id ? (
                  <div className="space-y-1.5">
                    <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="text-xs min-h-[50px] resize-none" />
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button size="sm" className="h-6 px-2 text-[10px]" onClick={() => handleEdit(entry.id)}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className="flex-1 leading-relaxed text-foreground/80">{entry.text}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {!entry.isManual && <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary mr-1">AI</span>}
                      <button onClick={() => { setEditingId(entry.id); setEditText(entry.text); }} className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil className="h-2.5 w-2.5" /></button>
                      <button onClick={() => onDeleteEntry(entry.id)} className="p-0.5 rounded hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"><Trash2 className="h-2.5 w-2.5" /></button>
                    </div>
                  </div>
                )}
                {editingId !== entry.id && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-muted-foreground/60">{entry.source}</span>
                    <span className="text-[9px] text-muted-foreground/40">•</span>
                    <span className="text-[9px] text-muted-foreground/60 truncate">{entry.title}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ── Website Dialog ──
function WebsiteDialog({ open, onOpenChange, onUploaded }: { open: boolean; onOpenChange: (v: boolean) => void; onUploaded: () => void }) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!websiteUrl.trim()) return;
    setIsAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in");
      let url = websiteUrl.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) url = `https://${url}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-content`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ type: "website", content: { url } }),
        }
      );
      if (!response.ok) { const e = await response.json(); throw new Error(e.error || "Failed"); }
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Analysis failed");

      toast({ title: "Website analyzed", description: `${url} added to your business context.` });
      setWebsiteUrl("");
      onUploaded();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Analysis failed", description: error instanceof Error ? error.message : "Failed", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Analyze Website
          </DialogTitle>
          <DialogDescription>
            Enter a website URL to analyze and add to your Business DNA context.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-2">
          <div className="relative flex-1">
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://your-website.com"
              className="pl-8 text-sm h-10"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
          </div>
          <Button onClick={handleAnalyze} disabled={!websiteUrl.trim() || isAnalyzing} className="h-10">
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
            <span className="ml-1.5">Analyze</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Animated Brain Visualization ──
function BrainVisualization({
  hoveredSegment,
  onHover,
  onClick,
  entryCounts,
}: {
  hoveredSegment: string | null;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  entryCounts: Record<string, number>;
}) {
  const totalEntries = Object.values(entryCounts).reduce((s, n) => s + n, 0);

  // Brain node positions (triangle layout)
  const nodes = [
    { id: "brand", cx: 150, cy: 60, color: "263 70% 58%", label: "Brand" },
    { id: "product", cx: 60, cy: 220, color: "199 89% 48%", label: "Product" },
    { id: "sop", cx: 240, cy: 220, color: "160 84% 39%", label: "SOP" },
  ];

  // Connection lines between nodes
  const connections = [
    { from: nodes[0], to: nodes[1] },
    { from: nodes[0], to: nodes[2] },
    { from: nodes[1], to: nodes[2] },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <svg width={300} height={280} viewBox="0 0 300 280" className="overflow-visible">
          {/* Pulsing center brain icon area */}
          <motion.circle
            cx={150} cy={140} r={40}
            fill="hsl(var(--primary) / 0.05)"
            stroke="hsl(var(--primary) / 0.15)"
            strokeWidth={1}
            animate={{ r: [38, 42, 38], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Connection lines */}
          {connections.map((conn, i) => (
            <motion.line
              key={i}
              x1={conn.from.cx} y1={conn.from.cy}
              x2={conn.to.cx} y2={conn.to.cy}
              stroke={
                hoveredSegment === conn.from.id || hoveredSegment === conn.to.id
                  ? "hsl(var(--primary))"
                  : "hsl(var(--border))"
              }
              strokeWidth={hoveredSegment === conn.from.id || hoveredSegment === conn.to.id ? 2 : 1}
              strokeOpacity={0.4}
              strokeDasharray="6 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.3 + i * 0.15 }}
            />
          ))}

          {/* Data flow particles along connections */}
          {connections.map((conn, i) => (
            <motion.circle
              key={`particle-${i}`}
              r={2}
              fill="hsl(var(--primary))"
              opacity={0.6}
              animate={{
                cx: [conn.from.cx, conn.to.cx],
                cy: [conn.from.cy, conn.to.cy],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: i * 0.8 }}
            />
          ))}

          {/* Brain nodes */}
          {nodes.map((node, i) => {
            const isHovered = hoveredSegment === node.id;
            const count = entryCounts[node.id] || 0;
            const baseR = 32;
            const r = isHovered ? 36 : baseR;

            return (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.15, type: "spring", stiffness: 200 }}
                onMouseEnter={() => onHover(node.id)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onClick(node.id)}
                className="cursor-pointer"
              >
                {/* Glow */}
                {isHovered && (
                  <motion.circle
                    cx={node.cx} cy={node.cy} r={r + 12}
                    fill={`hsl(${node.color} / 0.1)`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
                {/* Outer ring */}
                <circle
                  cx={node.cx} cy={node.cy} r={r + 4}
                  fill="none"
                  stroke={`hsl(${node.color} / ${isHovered ? 0.5 : 0.2})`}
                  strokeWidth={1.5}
                />
                {/* Main circle */}
                <motion.circle
                  cx={node.cx} cy={node.cy}
                  r={r}
                  fill={`hsl(${node.color} / ${isHovered ? 0.2 : 0.1})`}
                  stroke={`hsl(${node.color} / ${isHovered ? 0.8 : 0.4})`}
                  strokeWidth={2}
                  animate={{ r }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
                {/* Label */}
                <text
                  x={node.cx} y={node.cy - 4}
                  textAnchor="middle"
                  fill={`hsl(${node.color})`}
                  fontSize={12}
                  fontWeight={600}
                  className="select-none"
                >
                  {node.label}
                </text>
                {/* Count */}
                <text
                  x={node.cx} y={node.cy + 12}
                  textAnchor="middle"
                  fill="hsl(var(--muted-foreground))"
                  fontSize={10}
                  className="select-none"
                >
                  {count} insight{count !== 1 ? "s" : ""}
                </text>
              </motion.g>
            );
          })}

          {/* Center brain icon */}
          <text
            x={150} y={145}
            textAnchor="middle"
            fill="hsl(var(--primary) / 0.6)"
            fontSize={24}
            className="select-none"
          >
            🧠
          </text>
        </svg>
      </motion.div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredSegment && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-card border border-border/50 rounded-lg px-4 py-2.5 shadow-lg text-center max-w-xs">
              <p className="text-sm font-semibold text-foreground">
                {BRAIN_SEGMENTS.find(s => s.id === hoveredSegment)?.label}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {BRAIN_SEGMENTS.find(s => s.id === hoveredSegment)?.subtitle}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Segment buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        {BRAIN_SEGMENTS.map((seg) => (
          <button
            key={seg.id}
            onMouseEnter={() => onHover(seg.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(seg.id)}
            className={cn(
              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
              "bg-card/50 border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-primary/5"
            )}
          >
            {seg.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground/60 italic">
        {totalEntries > 0
          ? `${totalEntries} total insights across your business brain`
          : "Click a node to explore or add insights"}
      </p>
    </div>
  );
}

// ── Main View ──
export function BusinessDNAView() {
  const [segmentEntries, setSegmentEntries] = useState<Record<string, SegmentEntry[]>>({
    brand: [], product: [], sop: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [showWebsiteDialog, setShowWebsiteDialog] = useState(false);
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

  const handleCategorize = async () => {
    setIsCategorizing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/categorize-dna`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({}) }
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed");
      toast({ title: "Brain updated", description: "Your business data has been analyzed and categorized." });
      await loadEntries();
    } catch (error) {
      toast({ title: "Categorization failed", description: error instanceof Error ? error.message : "Failed", variant: "destructive" });
    } finally {
      setIsCategorizing(false);
    }
  };

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
  const entryCounts = Object.fromEntries(BRAIN_SEGMENTS.map(s => [s.id, segmentEntries[s.id]?.length || 0]));

  const activeSegmentData = BRAIN_SEGMENTS.find(s => s.id === activeSegment);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Business DNA Brain</h1>
            <p className="text-sm text-muted-foreground">Your business intelligence organized into Brand, Product & SOPs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowWebsiteDialog(true)}>
            <Globe className="h-3.5 w-3.5" />
            Add Website
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleCategorize} disabled={isCategorizing}>
            {isCategorizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {isCategorizing ? "Analyzing..." : "Auto-categorize"}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-6 pb-6">
        <AnimatePresence mode="wait">
          {!activeSegment ? (
            <motion.div key="hub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <BrainVisualization
                hoveredSegment={hoveredSegment}
                onHover={setHoveredSegment}
                onClick={(id) => setActiveSegment(id)}
                entryCounts={entryCounts}
              />

              {/* Summary */}
              <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3 mb-6">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Your Business Brain</span>{" "}
                  accumulates all your business intelligence into three core pillars — Brand identity, Product knowledge, and Standard Operating Procedures.
                  {totalInsights > 0 && <span className="ml-1 text-primary font-medium">• {totalInsights} insights extracted</span>}
                </p>
              </div>
            </motion.div>
          ) : activeSegmentData ? (
            <motion.div key={activeSegment} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="space-y-4 mt-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setActiveSegment(null)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", activeSegmentData.bgAccent)}>
                  <activeSegmentData.icon className={cn("h-4.5 w-4.5", activeSegmentData.color)} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{activeSegmentData.label}</h2>
                  <p className="text-xs text-muted-foreground">{activeSegmentData.subtitle}</p>
                </div>
              </div>

              <SegmentCard
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

      <WebsiteDialog open={showWebsiteDialog} onOpenChange={setShowWebsiteDialog} onUploaded={loadEntries} />
    </div>
  );
}
