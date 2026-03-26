import { useState, useEffect, useMemo } from "react";
import { Database, CheckCircle2, FileText, Image, Globe, Type, Mail, Video, Music, Table2, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBusinessDNA } from "@/components/database/BusinessDNAContext";
import type { CanvasNode, PendingConnection } from "./types";

interface BusinessDatabaseNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  pendingConnection: PendingConnection | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onInputPortMouseUp: (e: React.MouseEvent) => void;
  onOutputPortMouseDown: (e: React.MouseEvent) => void;
}

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
  document: <FileText className="h-3.5 w-3.5 text-primary" />,
  image: <Image className="h-3.5 w-3.5 text-primary" />,
  text: <Type className="h-3.5 w-3.5 text-primary" />,
  website: <Globe className="h-3.5 w-3.5 text-primary" />,
  email: <Mail className="h-3.5 w-3.5 text-primary" />,
  video: <Video className="h-3.5 w-3.5 text-primary" />,
  audio: <Music className="h-3.5 w-3.5 text-primary" />,
  spreadsheet: <Table2 className="h-3.5 w-3.5 text-primary" />,
};

const sourceLabels: Record<string, string> = {
  canvas: "Canvas",
  google: "Google",
  microsoft: "Microsoft",
  slack: "Slack",
  wordpress: "WordPress",
  upload: "Upload",
};

export function BusinessDatabaseNode({
  node,
  isSelected,
  pendingConnection,
  onMouseDown,
  onInputPortMouseUp,
  onOutputPortMouseDown,
}: BusinessDatabaseNodeProps) {
  const { products, audiences, isLoading: dnaLoading } = useBusinessDNA();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(() => {
    return localStorage.getItem("preferred_business_id");
  });

  // Listen for business selection changes
  useEffect(() => {
    const handleStorageChange = () => {
      setSelectedBrandId(localStorage.getItem("preferred_business_id"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const isLoading = dnaLoading;

  // Derive items from cached context data instead of fetching
  const items: DataItem[] = useMemo(() => {
    if (!selectedBrandId) return [];
    const productItems = products
      .filter(p => p.brandId === selectedBrandId)
      .map(p => ({
        id: (p as any).id || crypto.randomUUID(),
        data_type: "product",
        source: (p as any).source || "canvas",
        title: p.name || "Product",
        content: null,
        analyzed_content: p.tagline || p.description || null,
        is_analyzed: true,
        created_at: (p as any).created_at || null,
      }));
    const audienceItems = audiences
      .filter(a => a.productIds?.some(pid => productItems.some(p => p.id === pid)) || (a as any).brandId === selectedBrandId)
      .map(a => ({
        id: (a as any).id || crypto.randomUUID(),
        data_type: "audience",
        source: (a as any).source || "canvas",
        title: a.name || "Audience",
        content: null,
        analyzed_content: a.description || null,
        is_analyzed: true,
        created_at: (a as any).created_at || null,
      }));
    return [...productItems, ...audienceItems];
  }, [selectedBrandId, products, audiences]);

  // Group items by source
  const groupedBySource = items.reduce<Record<string, DataItem[]>>((acc, item) => {
    const src = item.source || "unknown";
    if (!acc[src]) acc[src] = [];
    acc[src].push(item);
    return acc;
  }, {});

  const getPreview = (item: DataItem) => {
    const text = item.analyzed_content || item.content;
    if (!text) return "No content extracted";
    return text.slice(0, 120) + (text.length > 120 ? "…" : "");
  };

  return (
    <div
      className={cn(
        "absolute bg-card border rounded-xl shadow-lg select-none overflow-visible canvas-node-smooth",
        isSelected ? "border-primary ring-2 ring-primary/30 shadow-xl" : "border-border hover:border-primary/50"
      )}
      style={{
        left: node.x,
        top: node.y,
        width: 320,
        height: 360,
      }}
      onMouseDown={onMouseDown}
    >

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Business Database</span>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="text-xs text-primary flex items-center gap-1">
              Loading...
            </span>
          )}
          {!isLoading && items.length > 0 && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              {items.length} items
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          )}
          {!isLoading && !selectedBrandId && (
            <span className="text-xs text-amber-500">Select business</span>
          )}
          {!isLoading && selectedBrandId && items.length === 0 && (
            <span className="text-xs text-muted-foreground">Empty</span>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100%-44px)]" onWheel={(e) => e.stopPropagation()}>
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-3 p-1">
              {/* Source group skeleton */}
              {Array.from({ length: 2 }).map((_, gi) => (
                <div key={gi}>
                  <div className="flex items-center gap-1.5 mb-1.5 px-1">
                    <Skeleton className="h-2.5 w-14" />
                    <Skeleton className="h-2.5 w-6" />
                  </div>
                  <div className="space-y-1">
                    {Array.from({ length: gi === 0 ? 3 : 2 }).map((_, i) => (
                      <div key={i} className="rounded-lg border border-border/40 px-2.5 py-2 flex items-center gap-2">
                        <Skeleton className="h-3.5 w-3.5 rounded" />
                        <Skeleton className="h-3 flex-1" />
                        <Skeleton className="h-1.5 w-1.5 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="space-y-3">
              {Object.entries(groupedBySource).map(([source, sourceItems]) => (
                <div key={source}>
                  <div className="flex items-center gap-1.5 mb-1.5 px-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      {sourceLabels[source] || source}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">({sourceItems.length})</span>
                  </div>
                  <div className="space-y-1">
                    {sourceItems.map((item) => {
                      const isExpanded = expandedId === item.id;
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "rounded-lg border border-border/40 transition-all cursor-pointer hover:border-primary/30",
                            isExpanded && "border-primary/40 bg-muted/30"
                          )}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        >
                          <div className="flex items-center gap-2 px-2.5 py-2">
                            {typeIcons[item.data_type] || <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span className="text-xs font-semibold text-foreground truncate flex-1">
                              {item.title}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {item.is_analyzed && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Analyzed" />
                              )}
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="px-2.5 pb-2.5 pt-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                                  {item.data_type}
                                </span>
                                {item.created_at && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(item.created_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-foreground/70 leading-relaxed">
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
          ) : !selectedBrandId ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Database className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground text-center">Select a business</p>
              <p className="text-xs text-muted-foreground/60 text-center mt-1">Choose a business from the sidebar to load its data</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Database className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground text-center">No products or audiences</p>
              <p className="text-xs text-muted-foreground/60 text-center mt-1">Add products and audiences in Business DNA</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Output port */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full border-2 border-border bg-primary cursor-crosshair transition-all z-20 hover:scale-125"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onOutputPortMouseDown(e);
        }}
      />
    </div>
  );
}
