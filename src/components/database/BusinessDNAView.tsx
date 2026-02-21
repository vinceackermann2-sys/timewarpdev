import { useState, useEffect, useCallback } from "react";
import {
  Dna, Zap, Cog, Eye, Scale, Loader2, Plus, Trash2, Check, X,
  RefreshCw, Globe, Pencil, Link,
  ChevronLeft
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

interface DNASegment {
  id: string;
  label: string;
  subtitle: string;
  icon: any;
  physics: string;
  dnaComponent: string;
  description: string;
  color: string;
  bgAccent: string;
  borderAccent: string;
  formula?: { equation: string; terms: readonly { readonly symbol: string; readonly meaning: string }[] };
}

const DNA_SEGMENTS: DNASegment[] = [
  {
    id: "problem",
    label: "The Problem",
    subtitle: "The Void",
    icon: Zap,
    physics: "Potential energy",
    dnaComponent: "Gap",
    description:
      "Before a business exists, there is a gap between a current state and a desired state. Without a problem to solve or a desire to fulfill, there is no reason for an exchange to occur.",
    color: "text-red-400",
    bgAccent: "bg-red-500/10",
    borderAccent: "border-red-500/20",
  },
  {
    id: "solution",
    label: "The Solution",
    subtitle: "The Transformation",
    icon: Cog,
    physics: "Kinetic energy (the work being done)",
    dnaComponent: "Utility",
    description:
      'This is the mechanism that bridges the gap. It is the specific "how" that moves a person from Point A to Point B.',
    color: "text-blue-400",
    bgAccent: "bg-blue-500/10",
    borderAccent: "border-blue-500/20",
  },
  {
    id: "customer",
    label: "The Customer",
    subtitle: "The Observer",
    icon: Eye,
    physics: "Demand",
    dnaComponent: "Demand",
    description:
      "A business cannot exist in a vacuum. You need a conscious entity that perceives the value of the solution and has the authority to initiate the exchange.",
    color: "text-emerald-400",
    bgAccent: "bg-emerald-500/10",
    borderAccent: "border-emerald-500/20",
  },
  {
    id: "economics",
    label: "The Economics",
    subtitle: "The Equilibrium",
    icon: Scale,
    physics: "Minimum breaking point",
    dnaComponent: "Viability",
    description:
      "For a business to be a business and not a hobby or a charity, the Value Created must be greater than the Cost of Creation.",
    color: "text-amber-400",
    bgAccent: "bg-amber-500/10",
    borderAccent: "border-amber-500/20",
    formula: {
      equation: "Vp > P > C",
      terms: [
        { symbol: "Vp", meaning: "Perceived Value — What the customer thinks it's worth" },
        { symbol: "P", meaning: "Price — What is exchanged" },
        { symbol: "C", meaning: "Cost — What it takes to sustain the solution" },
      ],
    },
  },
];

interface DNASection {
  id: string;
  label: string;
  description: string;
}

const DNA_SECTIONS: DNASection[] = [
  {
    id: "value-exchange",
    label: "The Value Exchange Loop",
    description: "The repeatable delivery of a solution that costs less than the value it provides.",
  },
];

// ── Segment Card ──
function SegmentCard({
  segment, entries, isLoading, onAddManual, onDeleteEntry, onEditEntry,
}: {
  segment: DNASegment;
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
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{segment.description}</p>
        <div className={cn("text-[11px] px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5", segment.bgAccent)}>
          <span className="text-muted-foreground">Physics:</span>
          <span className={cn("font-medium", segment.color)}>{segment.physics}</span>
        </div>

        {segment.formula && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
            <p className="text-sm font-mono font-bold text-center text-foreground tracking-wider">{segment.formula.equation}</p>
            <div className="space-y-1">
              {segment.formula.terms.map((t) => (
                <div key={t.symbol} className="flex items-start gap-2 text-[11px]">
                  <span className={cn("font-mono font-bold min-w-[20px]", segment.color)}>{t.symbol}</span>
                  <span className="text-muted-foreground">{t.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAdding && (
          <div className="space-y-2 pt-1">
            <Textarea placeholder={`Add your ${segment.label.toLowerCase()} insight...`} className="text-xs min-h-[60px] resize-none" value={newText} onChange={(e) => setNewText(e.target.value)} />
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
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Insights ({entries.length})</p>
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

// ── Animated DNA Helix ──
const HELIX_PAIRS = 8;
const PAIR_HEIGHT = 28;
const HELIX_WIDTH = 180;
const RADIUS = 65;

function DNAHelix({
  hoveredSection,
  onHover,
  onClick,
}: {
  hoveredSection: string | null;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}) {
  const totalHeight = HELIX_PAIRS * PAIR_HEIGHT + 40;

  return (
    <div className="flex flex-col items-center justify-center py-10 gap-6">
      <motion.div
        className="relative cursor-pointer"
        onMouseEnter={() => onHover("value-exchange")}
        onMouseLeave={() => onHover(null)}
        onClick={() => onClick("value-exchange")}
        whileHover={{ scale: 1.03 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <svg
          width={HELIX_WIDTH}
          height={totalHeight}
          viewBox={`0 0 ${HELIX_WIDTH} ${totalHeight}`}
          className="overflow-visible"
        >
          {/* Render base pairs */}
          {Array.from({ length: HELIX_PAIRS }).map((_, i) => {
            const y = 20 + i * PAIR_HEIGHT;
            const phase = (i / HELIX_PAIRS) * Math.PI * 2;
            const cx = HELIX_WIDTH / 2;
            const leftX = cx - Math.cos(phase) * RADIUS;
            const rightX = cx + Math.cos(phase) * RADIUS;
            const depth = Math.sin(phase);
            const opacity = 0.4 + (depth + 1) * 0.3;

            const colors = [
              ["#ef4444", "#f97316"],
              ["#3b82f6", "#6366f1"],
              ["#10b981", "#14b8a6"],
              ["#f59e0b", "#eab308"],
            ];
            const [c1, c2] = colors[i % 4];

            return (
              <motion.g
                key={i}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                {/* Connecting bar */}
                <motion.line
                  x1={leftX} y1={y} x2={rightX} y2={y}
                  stroke={hoveredSection ? "hsl(var(--primary))" : "hsl(var(--border))"}
                  strokeWidth={hoveredSection ? 2 : 1.5}
                  strokeOpacity={opacity * 0.6}
                  strokeDasharray={hoveredSection ? "none" : "4 3"}
                  animate={{
                    x1: [leftX, cx - Math.cos(phase + 0.3) * RADIUS, leftX],
                    x2: [rightX, cx + Math.cos(phase + 0.3) * RADIUS, rightX],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                />
                {/* Left node */}
                <motion.circle
                  cx={leftX} cy={y} r={hoveredSection ? 5 : 4}
                  fill={c1}
                  opacity={opacity}
                  animate={{
                    cx: [leftX, cx - Math.cos(phase + 0.3) * RADIUS, leftX],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                />
                {/* Right node */}
                <motion.circle
                  cx={rightX} cy={y} r={hoveredSection ? 5 : 4}
                  fill={c2}
                  opacity={opacity}
                  animate={{
                    cx: [rightX, cx + Math.cos(phase + 0.3) * RADIUS, rightX],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                />
              </motion.g>
            );
          })}

          {/* Left backbone */}
          <motion.path
            d={Array.from({ length: HELIX_PAIRS })
              .map((_, i) => {
                const y = 20 + i * PAIR_HEIGHT;
                const phase = (i / HELIX_PAIRS) * Math.PI * 2;
                const x = HELIX_WIDTH / 2 - Math.cos(phase) * RADIUS;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ")}
            fill="none"
            stroke={hoveredSection ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
            strokeWidth={2}
            strokeOpacity={0.3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right backbone */}
          <motion.path
            d={Array.from({ length: HELIX_PAIRS })
              .map((_, i) => {
                const y = 20 + i * PAIR_HEIGHT;
                const phase = (i / HELIX_PAIRS) * Math.PI * 2;
                const x = HELIX_WIDTH / 2 + Math.cos(phase) * RADIUS;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ")}
            fill="none"
            stroke={hoveredSection ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
            strokeWidth={2}
            strokeOpacity={0.3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Glow effect on hover */}
        <AnimatePresence>
          {hoveredSection && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.12) 0%, transparent 70%)",
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {hoveredSection && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-card border border-border/50 rounded-lg px-4 py-2.5 shadow-lg text-center">
              <p className="text-sm font-semibold text-foreground">
                {DNA_SECTIONS.find(s => s.id === hoveredSection)?.label}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {DNA_SECTIONS.find(s => s.id === hoveredSection)?.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        {DNA_SECTIONS.map((section) => (
          <button
            key={section.id}
            onMouseEnter={() => onHover(section.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(section.id)}
            className={cn(
              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
              "bg-card/50 border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-primary/5"
            )}
          >
            {section.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground/60 italic">
        Hover or click the DNA strand to explore
      </p>
    </div>
  );
}

// ── Main View ──
export function BusinessDNAView() {
  const [segmentEntries, setSegmentEntries] = useState<Record<string, SegmentEntry[]>>({
    problem: [], solution: [], customer: [], economics: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
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
      const grouped: Record<string, SegmentEntry[]> = { problem: [], solution: [], customer: [], economics: [] };
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
      toast({ title: "DNA categorized", description: "Your business data has been analyzed and sorted." });
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
        title: `${DNA_SEGMENTS.find(s => s.id === segmentId)?.label} insight`,
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Dna className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Business DNA</h1>
            <p className="text-sm text-muted-foreground">Map the fundamental strands of your business</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowWebsiteDialog(true)}>
            <Globe className="h-3.5 w-3.5" />
            Add Website
          </Button>
          {activeSection && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleCategorize} disabled={isCategorizing}>
              {isCategorizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {isCategorizing ? "Analyzing..." : "Auto-categorize"}
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-6 pb-6">
        <AnimatePresence mode="wait">
          {!activeSection ? (
            <motion.div key="hub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              {/* DNA Helix Hub */}
              <DNAHelix
                hoveredSection={hoveredSection}
                onHover={setHoveredSection}
                onClick={(id) => setActiveSection(id)}
              />

              {/* Summary */}
              <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3 mb-6">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">What is the DNA?</span>{" "}
                  If you remove the Price, it's a gift. If you remove the Solution, it's a scam. If you remove the Value, it's obsolete.
                  {totalInsights > 0 && <span className="ml-1 text-primary font-medium">• {totalInsights} insights extracted</span>}
                </p>
              </div>
            </motion.div>
          ) : activeSection === "value-exchange" ? (
            <motion.div key="value-exchange" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="space-y-4 mt-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setActiveSection(null)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">The Value Exchange Loop</h2>
                  <p className="text-xs text-muted-foreground">The repeatable delivery of a solution that costs less than the value it provides.</p>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">The Atomic Formula:</span>{" "}
                  <span className="font-mono font-bold text-foreground">Vp &gt; P &gt; C</span>{" "}
                  — Perceived Value must exceed Price, which must exceed Cost.
                  {totalInsights > 0 && <span className="ml-1 text-primary font-medium">• {totalInsights} insights</span>}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {DNA_SEGMENTS.map((seg) => (
                  <SegmentCard key={seg.id} segment={seg} entries={segmentEntries[seg.id] || []} isLoading={isLoading} onAddManual={handleAddManual} onDeleteEntry={handleDeleteEntry} onEditEntry={handleEditEntry} />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </ScrollArea>

      {/* Website URL popup */}
      <WebsiteDialog open={showWebsiteDialog} onOpenChange={setShowWebsiteDialog} onUploaded={loadEntries} />
    </div>
  );
}
