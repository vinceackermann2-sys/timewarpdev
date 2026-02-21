import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dna, Zap, Cog, Eye, Scale, Loader2, Plus, Trash2, Check, X,
  RefreshCw, Upload, Globe, Pencil, Link, FileText, Image, Music, Video, File
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
];

// ── File upload helpers ──
const SUPPORTED_TYPES = [
  "application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
  "text/plain", "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/mp4",
  "video/mp4", "video/quicktime", "video/webm",
];

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType === "application/pdf") return FileText;
  return File;
};

// ── Segment Card ──
function SegmentCard({
  segment,
  entries,
  isLoading,
  onAddManual,
  onDeleteEntry,
  onEditEntry,
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

        {/* Add entry */}
        {isAdding && (
          <div className="space-y-2 pt-1">
            <Textarea
              placeholder={`Add your ${segment.label.toLowerCase()} insight...`}
              className="text-xs min-h-[60px] resize-none"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
            />
            <div className="flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setIsAdding(false); setNewText(""); }}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!newText.trim()}>
                <Check className="h-3 w-3 mr-1" /> Save
              </Button>
            </div>
          </div>
        )}

        {/* Entries list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Insights ({entries.length})
            </p>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="group rounded-md border border-border/40 bg-muted/20 px-2.5 py-2 text-xs"
              >
                {editingId === entry.id ? (
                  <div className="space-y-1.5">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="text-xs min-h-[50px] resize-none"
                    />
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button size="sm" className="h-6 px-2 text-[10px]" onClick={() => handleEdit(entry.id)}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className="flex-1 leading-relaxed text-foreground/80">{entry.text}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {!entry.isManual && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary mr-1">AI</span>
                      )}
                      <button
                        onClick={() => { setEditingId(entry.id); setEditText(entry.text); }}
                        className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => onDeleteEntry(entry.id)}
                        className="p-0.5 rounded hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                )}
                {!editingId && (
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

// ── Context Upload Section ──
function ContextUploadSection({ onUploaded }: { onUploaded: () => void }) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isAnalyzingUrl, setIsAnalyzingUrl] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processFile = async (file: globalThis.File) => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      toast({ title: "Unsupported file type", description: `${file.name} is not supported.`, variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setCurrentFile(file.name);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in");

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64Data = btoa(binary);

      let analyzeType = "document";
      if (file.type.startsWith("image/")) analyzeType = "image";
      else if (file.type.startsWith("audio/")) analyzeType = "audio";
      else if (file.type.startsWith("video/")) analyzeType = "video";
      else if (file.type === "text/plain" || file.type === "text/csv") analyzeType = "text";

      let contentBody: any;
      if (analyzeType === "audio" || analyzeType === "video") {
        contentBody = { fileName: file.name, fileBase64: base64Data, fileMimeType: file.type };
      } else if (analyzeType === "image") {
        contentBody = { imageName: file.name, imageBase64: base64Data, imageMimeType: file.type };
      } else if (analyzeType === "text") {
        contentBody = { text: await file.text() };
      } else {
        contentBody = { documentName: file.name, fileBase64: base64Data, fileMimeType: file.type };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-content`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ type: analyzeType, content: contentBody }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process file");
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Analysis failed");

      toast({ title: "File analyzed", description: `${file.name} added to your business context.` });
      onUploaded();
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
      setCurrentFile(null);
    }
  };

  const handleAnalyzeUrl = async () => {
    if (!websiteUrl.trim()) return;
    setIsAnalyzingUrl(true);

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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to analyze website");
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Analysis failed");

      toast({ title: "Website analyzed", description: `${url} added to your business context.` });
      setWebsiteUrl("");
      onUploaded();
    } catch (error) {
      console.error("URL error:", error);
      toast({ title: "Analysis failed", description: error instanceof Error ? error.message : "Failed", variant: "destructive" });
    } finally {
      setIsAnalyzingUrl(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Add Context Sources
      </p>

      {/* File upload */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); Array.from(e.dataTransfer.files).forEach(processFile); }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 transition-all cursor-pointer flex items-center gap-3",
          isDragging ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/50 hover:bg-muted/30",
          isUploading && "pointer-events-none opacity-70"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_TYPES.join(",")}
          onChange={(e) => { Array.from(e.target.files || []).forEach(processFile); if (fileInputRef.current) fileInputRef.current.value = ""; }}
          className="hidden"
        />
        {isUploading ? (
          <>
            <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Analyzing {currentFile}...</p>
              <p className="text-[10px] text-muted-foreground">AI is extracting content</p>
            </div>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Upload files for context</p>
              <p className="text-[10px] text-muted-foreground">PDF, images, audio, video, CSV, Word • Max 10MB</p>
            </div>
          </>
        )}
      </div>

      {/* Website URL */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://your-website.com"
            className="pl-8 text-xs h-9"
            onKeyDown={(e) => e.key === "Enter" && handleAnalyzeUrl()}
          />
        </div>
        <Button
          size="sm"
          className="h-9 px-3 text-xs"
          onClick={handleAnalyzeUrl}
          disabled={!websiteUrl.trim() || isAnalyzingUrl}
        >
          {isAnalyzingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link className="h-3.5 w-3.5" />}
          <span className="ml-1.5">Analyze</span>
        </Button>
      </div>
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
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({}),
        }
      );

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed");

      toast({ title: "DNA categorized", description: "Your business data has been analyzed and sorted." });
      await loadEntries();
    } catch (error) {
      console.error("Categorize error:", error);
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
        content: text,
        data_type: "text",
        source: "canvas",
        is_analyzed: true,
        analyzed_content: text,
        metadata: { dna_segment: segmentId, dna_insight: text },
      })
      .select("id, created_at")
      .single();

    if (!error && data) {
      setSegmentEntries(prev => ({
        ...prev,
        [segmentId]: [
          { id: data.id, text, source: "canvas", title: "Manual insight", isManual: true, createdAt: data.created_at },
          ...prev[segmentId],
        ],
      }));
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    await (supabase as any).from("user_business_data").delete().eq("id", entryId);
    setSegmentEntries(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = next[key].filter(e => e.id !== entryId);
      }
      return next;
    });
  };

  const handleEditEntry = async (entryId: string, newText: string) => {
    // Update both the content and the dna_insight in metadata
    const { data: existing } = await (supabase as any)
      .from("user_business_data")
      .select("metadata")
      .eq("id", entryId)
      .single();

    const meta = (existing?.metadata as any) || {};
    await (supabase as any)
      .from("user_business_data")
      .update({
        content: newText,
        analyzed_content: newText,
        metadata: { ...meta, dna_insight: newText },
      })
      .eq("id", entryId);

    setSegmentEntries(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = next[key].map(e => e.id === entryId ? { ...e, text: newText } : e);
      }
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
            <p className="text-sm text-muted-foreground">
              The repeatable delivery of a solution that costs less than the value it provides.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleCategorize}
          disabled={isCategorizing}
        >
          {isCategorizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {isCategorizing ? "Analyzing..." : "Auto-categorize"}
        </Button>
      </div>

      {/* Summary */}
      <div className="mx-6 mt-2 mb-4 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">What is the DNA?</span>{" "}
          If you remove the Price, it's a gift. If you remove the Solution, it's a scam. If you remove the Value, it's obsolete.
          Everything else—marketing, HR, legal, branding—is just the "flesh" built around that skeleton.
          {totalInsights > 0 && (
            <span className="ml-1 text-primary font-medium">• {totalInsights} insights extracted</span>
          )}
        </p>
      </div>

      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="space-y-6">
          {/* Context upload section */}
          <Card className="border border-border/50 bg-card/50">
            <CardContent className="pt-4 pb-4">
              <ContextUploadSection onUploaded={() => { loadEntries(); }} />
            </CardContent>
          </Card>

          {/* Segment grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {DNA_SEGMENTS.map((seg) => (
              <SegmentCard
                key={seg.id}
                segment={seg}
                entries={segmentEntries[seg.id] || []}
                isLoading={isLoading}
                onAddManual={handleAddManual}
                onDeleteEntry={handleDeleteEntry}
                onEditEntry={handleEditEntry}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
