import { useState, useEffect } from "react";
import { Dna, Zap, Cog, Eye, Scale, ChevronRight, Loader2, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface DataItem {
  id: string;
  data_type: string;
  source: string;
  title: string;
  content: string | null;
  analyzed_content: string | null;
  is_analyzed: boolean | null;
  created_at: string | null;
}

// DNA Segment definitions
const DNA_SEGMENTS = [
  {
    id: "problem",
    label: "The Problem",
    subtitle: "The Void",
    icon: Zap,
    physics: "Potential energy",
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
    description:
      'This is the mechanism that bridges the gap. It is the specific "how" that moves a person from Point A to Point B. Whether it\'s a physical hammer or lines of code, the DNA here is the utility.',
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
    description:
      "For a business to be a business and not a hobby or a charity, the Value Created must be greater than the Cost of Creation, and the Price must be lower than the Value Perceived.",
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
] as const;

interface SegmentEntry {
  id: string;
  text: string;
  source: "manual" | "ai";
  createdAt: string;
}

function SegmentCard({ segment }: { segment: { id: string; label: string; subtitle: string; icon: any; physics: string; description: string; color: string; bgAccent: string; borderAccent: string; formula?: { equation: string; terms: readonly { readonly symbol: string; readonly meaning: string }[] } } }) {
  const [entries, setEntries] = useState<SegmentEntry[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const Icon = segment.icon;

  // Load entries from user_business_data with metadata.dna_segment
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setIsLoading(false); return; }

      const { data } = await (supabase as any)
        .from("user_business_data")
        .select("id, title, content, analyzed_content, created_at, metadata, source")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (data) {
        const filtered = data.filter((d: any) => {
          const meta = d.metadata as any;
          return meta?.dna_segment === segment.id;
        });
        setEntries(
          filtered.map((d: any) => ({
            id: d.id,
            text: d.analyzed_content || d.content || d.title,
            source: d.source === "canvas" ? "manual" : ("ai" as const),
            createdAt: d.created_at,
          }))
        );
      }
      setIsLoading(false);
    };
    load();
  }, [segment.id]);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await (supabase as any)
      .from("user_business_data")
      .insert({
        user_id: session.user.id,
        title: `${segment.label} insight`,
        content: newText.trim(),
        data_type: "text",
        source: "canvas",
        metadata: { dna_segment: segment.id },
      })
      .select("id, created_at")
      .single();

    if (!error && data) {
      setEntries((prev) => [
        { id: data.id, text: newText.trim(), source: "manual", createdAt: data.created_at },
        ...prev,
      ]);
      setNewText("");
      setIsAdding(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    await (supabase as any).from("user_business_data").delete().eq("id", entryId);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setIsAdding(!isAdding)}
          >
            {isAdding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">{segment.description}</p>

        {/* Physics equivalent */}
        <div className={cn("text-[11px] px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5", segment.bgAccent)}>
          <span className="text-muted-foreground">Physics:</span>
          <span className={cn("font-medium", segment.color)}>{segment.physics}</span>
        </div>

        {/* Formula for economics */}
        {segment.formula && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
            <p className="text-sm font-mono font-bold text-center text-foreground tracking-wider">
              {segment.formula.equation}
            </p>
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

        {/* Add entry form */}
        {isAdding && (
          <div className="space-y-2 pt-1">
            <Textarea
              placeholder={`Add your ${segment.label.toLowerCase()} insight...`}
              className="text-xs min-h-[60px] resize-none"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
            />
            <div className="flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setIsAdding(false); setNewText(""); }}>
                Cancel
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!newText.trim()}>
                <Check className="h-3 w-3 mr-1" /> Save
              </Button>
            </div>
          </div>
        )}

        {/* Entries */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your Insights</p>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-start gap-2 rounded-md border border-border/40 bg-muted/20 px-2.5 py-2 text-xs text-foreground/80"
              >
                <span className="flex-1 leading-relaxed">{entry.text}</span>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0 mt-0.5"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function BusinessDNAView() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Dna className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Business DNA</h1>
          <p className="text-sm text-muted-foreground">
            The repeatable delivery of a solution that costs less than the value it provides.
          </p>
        </div>
      </div>

      {/* Summary banner */}
      <div className="mx-6 mb-4 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">What is the DNA?</span>{" "}
          If you remove the Price, it's a gift. If you remove the Solution, it's a scam. If you remove the Value, it's obsolete.
          Everything else—marketing, HR, legal, branding—is just the "flesh" built around that skeleton.
        </p>
      </div>

      {/* Segment grid */}
      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {DNA_SEGMENTS.map((seg) => (
            <SegmentCard key={seg.id} segment={seg} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
