import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Database, Loader2, FileText, Image, Globe, Type,
  Mail, Video, Music, Table2, ChevronDown, ChevronUp, HardDrive,
  Trash2, Upload, Users, ListChecks, Calendar, Search, X, CheckSquare, Square
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

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

const typeIcons: Record<string, React.ReactNode> = {
  document: <FileText className="h-4 w-4 text-primary" />,
  image: <Image className="h-4 w-4 text-primary" />,
  text: <Type className="h-4 w-4 text-primary" />,
  website: <Globe className="h-4 w-4 text-primary" />,
  email: <Mail className="h-4 w-4 text-primary" />,
  video: <Video className="h-4 w-4 text-primary" />,
  audio: <Music className="h-4 w-4 text-primary" />,
  spreadsheet: <Table2 className="h-4 w-4 text-primary" />,
  contact: <Users className="h-4 w-4 text-primary" />,
  task: <ListChecks className="h-4 w-4 text-primary" />,
  calendar: <Calendar className="h-4 w-4 text-primary" />,
  brand: <Globe className="h-4 w-4 text-primary" />,
  product: <Globe className="h-4 w-4 text-primary" />,
  audience: <Users className="h-4 w-4 text-primary" />,
};

const sourceLabels: Record<string, string> = {
  canvas: "Canvas",
  google: "Google",
  microsoft: "Microsoft",
  slack: "Slack",
  hubspot: "HubSpot",
  wordpress: "WordPress",
  upload: "Upload",
  "business-dna": "Business DNA",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (!isFinite(bytes)) return "Unlimited";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

// Module-level in-memory cache so the Database tab loads instantly on re-visit
let _cachedItems: DataItem[] | null = null;
let _cachedCacheKey: string | null = null;

function getCachedForBrand(brandId: string): DataItem[] | null {
  if (_cachedItems && _cachedCacheKey && _cachedCacheKey.endsWith(`:${brandId}`)) {
    return _cachedItems;
  }
  return null;
}

function calculateUsageFromItems(items: Array<{ title?: string; content?: string | null; analyzed_content?: string | null; metadata?: any; source?: string }>): number {
  let total = 0;
  for (const row of items) {
    if (row.source === "business-dna") continue;
    total += (row.title?.length || 0) + (row.content?.length || 0) + (row.analyzed_content?.length || 0);
    if (row.metadata?.file_size) total += Number(row.metadata.file_size) || 0;
  }
  return total;
}

export function BusinessDataListView({ activeBrandId }: { activeBrandId: string }) {
  const brandCache = getCachedForBrand(activeBrandId);
  const [items, setItems] = useState<DataItem[]>(brandCache ?? []);
  const [isLoading, setIsLoading] = useState(!brandCache);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { plan, getDataLimit } = useSubscription();
  const [realUsageBytes, setRealUsageBytes] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSourceFilter, setActiveSourceFilter] = useState<string | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSelectMenu, setShowSelectMenu] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showFilterMenu && filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
      if (showSelectMenu && selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setShowSelectMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilterMenu, showSelectMenu]);

  // Derived: available source filters
  const availableSources = useMemo(() => {
    const sources = new Set(items.map(i => i.source));
    return Array.from(sources).sort();
  }, [items]);

  // Derived: available type filters
  const availableTypes = useMemo(() => {
    const types = new Set(items.map(i => i.data_type));
    return Array.from(types).sort();
  }, [items]);

  // Derived: filtered items
  const filteredItems = useMemo(() => {
    let result = items;
    if (activeSourceFilter) {
      result = result.filter(i => i.source === activeSourceFilter);
    }
    if (activeTypeFilter) {
      result = result.filter(i => i.data_type === activeTypeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.data_type.toLowerCase().includes(q) ||
        (i.content && i.content.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, activeSourceFilter, activeTypeFilter, searchQuery]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredItems.map(i => i.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Reset state when brand changes to prevent stale data leaking across businesses
  useEffect(() => {
    const cached = getCachedForBrand(activeBrandId);
    setItems(cached ?? []);
    setIsLoading(!cached);
    setSelectedIds(new Set());
    setExpandedId(null);
    setSearchQuery("");
    setActiveSourceFilter(null);
    setActiveTypeFilter(null);
  }, [activeBrandId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setIsLoading(false); return; }

        const wsId = localStorage.getItem("preferred_workspace_id");
        const currentKey = `${session.user.id}:${wsId || "personal"}:${activeBrandId}`;

        // If cache matches current user+workspace+brand, skip fetch
        if (_cachedItems && _cachedCacheKey === currentKey) {
          setItems(_cachedItems);
          setRealUsageBytes(calculateUsageFromItems(_cachedItems));
          setIsLoading(false);
          return;
        }

        let query = (supabase as any)
          .from("user_business_data")
          .select("id, data_type, source, title, content, analyzed_content, is_analyzed, created_at, metadata")
          .order("created_at", { ascending: false })
          .limit(1000);

        if (wsId) {
          query = query.eq("workspace_id", wsId);
        } else {
          query = query.eq("user_id", session.user.id);
        }

        // Filter to items belonging to this brand
        query = query.eq("metadata->>brandId", activeBrandId);

        const { data, error } = await query;

        if (!error && data) {
          _cachedItems = data;
          _cachedCacheKey = currentKey;
          setItems(data);
          // Calculate usage from already-fetched data (no separate query needed)
          setRealUsageBytes(calculateUsageFromItems(data));
        }
      } catch (err) {
        console.error("Failed to fetch business data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeBrandId]);

  const handleDeleteItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    setDeletingId(itemId);
    try {
      await supabase.from("user_business_data").delete().eq("id", itemId);
      setItems(prev => { const next = prev.filter(i => i.id !== itemId); _cachedItems = next; return next; });
      if (expandedId === itemId) setExpandedId(null);
      // Refresh real usage (trigger auto-recalculates)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: sub } = await (supabase as any).from("user_subscriptions").select("data_used_bytes").eq("user_id", session.user.id).maybeSingle();
        if (sub) setRealUsageBytes(sub.data_used_bytes || 0);
      }
      toast.success("Data item deleted");
    } catch {
      toast.error("Failed to delete item");
    }
    setDeletingId(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { toast.error("Please log in first"); setIsUploading(false); return; }

      const dataLimit = getDataLimit();

      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB limit`);
          continue;
        }

        // Check storage limit before uploading
        if (isFinite(dataLimit) && (realUsageBytes + file.size) > dataLimit) {
          toast.error("Storage limit reached. Upgrade your plan for more space.");
          break;
        }

        const isBinary = file.type === "application/pdf" || file.type.startsWith("image/") ||
          file.type.includes("spreadsheet") || file.type.includes("excel") ||
          file.type === "application/msword" || file.type.includes("wordprocessingml");

        let content: string | null = null;
        if (!isBinary) {
          content = await file.text().catch(() => null);
        }

        const dataType = file.type.startsWith("image/") ? "image" 
          : file.type === "application/pdf" ? "document"
          : file.type.includes("spreadsheet") || file.type.includes("csv") ? "spreadsheet"
          : "text";

        const { data, error } = await supabase
          .from("user_business_data")
          .insert({
            user_id: session.user.id,
            title: file.name,
            content: content || `[File: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes]`,
            data_type: dataType,
            source: "upload",
            is_analyzed: false,
            workspace_id: localStorage.getItem("preferred_workspace_id"),
            metadata: { brandId: activeBrandId, file_size: file.size },
          })
          .select("id, data_type, source, title, content, analyzed_content, is_analyzed, created_at, metadata")
          .single();

        if (!error && data) {
          setItems(prev => { const next = [data, ...prev]; _cachedItems = next; return next; });
          setRealUsageBytes(prev => prev + file.size);
        }
      }
      toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
    } catch {
      toast.error("Upload failed");
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Use real tracked usage from DB
  const dataLimit = getDataLimit();
  const usagePercent = isFinite(dataLimit) ? Math.min((realUsageBytes / dataLimit) * 100, 100) : 0;
  const planLabel = plan === "timewarp_og" ? "TimeWarp OG" : plan === "aristotle" ? "Aristotle" : plan === "co_founder" ? "Co-Founder" : "Free";

  const groupedBySource = filteredItems.reduce<Record<string, DataItem[]>>((acc, item) => {
    const src = item.source || "unknown";
    if (!acc[src]) acc[src] = [];
    acc[src].push(item);
    return acc;
  }, {});

  const getPreview = (item: DataItem) => {
    const text = item.analyzed_content || item.content;
    if (!text) return "No content extracted";
    return text.slice(0, 200) + (text.length > 200 ? "…" : "");
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-1">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-[140px] rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
        {/* Storage bar skeleton */}
        <Skeleton className="h-2.5 w-full rounded-full" />
        {/* Source group skeletons */}
        {Array.from({ length: 2 }).map((_, gi) => (
          <div key={gi} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-6" />
            </div>
            <div className="space-y-1.5">
              {Array.from({ length: gi === 0 ? 4 : 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-14 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Usage Card */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Data Storage</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {planLabel} Plan
          </span>
        </div>
        <Progress value={usagePercent} className="h-2 mb-2" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatBytes(realUsageBytes)} used
          </span>
          <span className="text-xs text-muted-foreground">
            {isFinite(dataLimit) ? formatBytes(dataLimit) + " limit" : "Unlimited"}
          </span>
        </div>
      </div>

      {/* Compact header row: search + filter + select + actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative max-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full h-8 pl-8 pr-7 rounded-md border border-border/50 bg-card/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filter dropdown */}
        <div className="relative" ref={filterRef}>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowFilterMenu(prev => !prev)}
          >
            <Database className="h-3.5 w-3.5" />
            Filter
            {(activeSourceFilter || activeTypeFilter) && (
              <span className="ml-0.5 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {(activeSourceFilter ? 1 : 0) + (activeTypeFilter ? 1 : 0)}
              </span>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
          {showFilterMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded-lg border border-border bg-popover shadow-lg p-2 space-y-2">
              {/* Source section */}
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Source</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  <button
                    onClick={() => setActiveSourceFilter(null)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border",
                      !activeSourceFilter ? "bg-primary text-primary-foreground border-primary" : "bg-card/50 text-muted-foreground border-border/50 hover:border-primary/30"
                    )}
                  >All</button>
                  {availableSources.map(src => (
                    <button
                      key={src}
                      onClick={() => setActiveSourceFilter(activeSourceFilter === src ? null : src)}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border",
                        activeSourceFilter === src ? "bg-primary text-primary-foreground border-primary" : "bg-card/50 text-muted-foreground border-border/50 hover:border-primary/30"
                      )}
                    >{sourceLabels[src] || src}</button>
                  ))}
                </div>
              </div>
              {/* Type section */}
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Type</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  <button
                    onClick={() => setActiveTypeFilter(null)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border",
                      !activeTypeFilter ? "bg-primary text-primary-foreground border-primary" : "bg-card/50 text-muted-foreground border-border/50 hover:border-primary/30"
                    )}
                  >All</button>
                  {availableTypes.map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveTypeFilter(activeTypeFilter === t ? null : t)}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border capitalize",
                        activeTypeFilter === t ? "bg-primary text-primary-foreground border-primary" : "bg-card/50 text-muted-foreground border-border/50 hover:border-primary/30"
                      )}
                    >{t}</button>
                  ))}
                </div>
              </div>
              {(activeSourceFilter || activeTypeFilter) && (
                <button
                  onClick={() => { setActiveSourceFilter(null); setActiveTypeFilter(null); }}
                  className="text-[10px] text-primary hover:underline px-1"
                >Clear all filters</button>
              )}
            </div>
          )}
        </div>

        {/* Select dropdown */}
        <div className="relative" ref={selectRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setShowSelectMenu(prev => !prev)}
          >
            {selectedIds.size > 0 ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select"}
            <ChevronDown className="h-3 w-3" />
          </Button>
          {showSelectMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 w-44 rounded-lg border border-border bg-popover shadow-lg p-1">
              <button onClick={() => { selectAll(); setShowSelectMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent rounded-md">
                Select all ({filteredItems.length})
              </button>
              {[5, 10, 25, 50].filter(n => n <= filteredItems.length).map(n => (
                <button
                  key={n}
                  onClick={() => {
                    setSelectedIds(new Set(filteredItems.slice(0, n).map(i => i.id)));
                    setShowSelectMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent rounded-md"
                >
                  Select first {n}
                </button>
              ))}
              {selectedIds.size > 0 && (
                <button onClick={() => { clearSelection(); setShowSelectMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent rounded-md text-destructive">
                  Clear selection
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.csv,.json,.md,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload
          </Button>
        </div>
      </div>

      {/* Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-xs font-medium text-primary">{selectedIds.size} selected</span>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs gap-1.5 ml-2"
            onClick={async () => {
              const idsToDelete = Array.from(selectedIds);
              if (idsToDelete.length === 0) return;
              try {
                await supabase.from("user_business_data").delete().in("id", idsToDelete);
                setItems(prev => {
                  const next = prev.filter(i => !selectedIds.has(i.id));
                  _cachedItems = next;
                  return next;
                });
                setSelectedIds(new Set());
                toast.success(`Deleted ${idsToDelete.length} item${idsToDelete.length > 1 ? "s" : ""}`);
              } catch {
                toast.error("Failed to delete items");
              }
            }}
          >
            <Trash2 className="h-3 w-3" />
            Delete ({selectedIds.size})
          </Button>
          <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-foreground ml-auto">Clear</button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">No business data yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Upload files or add data to get started
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedBySource).map(([source, sourceItems]) => (
            <div key={source}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {sourceLabels[source] || source}
                </span>
                <span className="text-xs text-muted-foreground/50">({sourceItems.length})</span>
              </div>
              <div className="space-y-1.5">
                {sourceItems.map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group rounded-lg border border-border/40 transition-all cursor-pointer hover:border-primary/30",
                        isExpanded && "border-primary/40 bg-muted/30"
                      )}
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <button onClick={(e) => toggleSelect(item.id, e)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                          {selectedIds.has(item.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                        </button>
                        {typeIcons[item.data_type] || <FileText className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm font-medium text-foreground truncate flex-1">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.is_analyzed && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Analyzed" />
                          )}
                           <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {item.data_type}
                          </span>
                          <button
                            onClick={(e) => handleDeleteItem(e, item.id)}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                            title="Delete"
                          >
                            {deletingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-border/30">
                          <div className="flex items-center gap-2 mt-2 mb-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                              {item.data_type}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Source: {sourceLabels[item.source] || item.source}
                            </span>
                            {item.created_at && (
                              <>
                                <span className="text-[10px] text-muted-foreground/40">•</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(item.created_at).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap">
                            {getPreview(item)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
