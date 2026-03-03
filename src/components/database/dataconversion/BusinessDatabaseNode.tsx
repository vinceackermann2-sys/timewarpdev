import { useState, useEffect } from "react";
import { Database, Loader2, CheckCircle2, FileText, Image, Globe, Type, Mail, Video, Music, Table2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [items, setItems] = useState<DataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await (supabase as any)
          .from('user_business_data')
          .select('id, data_type, source, title, content, analyzed_content, is_analyzed, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          setItems(data);
        }
      } catch (err) {
        console.error("Failed to fetch business data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          )}
          {!isLoading && items.length > 0 && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              {items.length} items
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          )}
          {!isLoading && items.length === 0 && (
            <span className="text-xs text-amber-500">No data</span>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100%-44px)]" onWheel={(e) => e.stopPropagation()}>
        <div className="p-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Loading business data...</p>
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
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Database className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground text-center">No business data</p>
              <p className="text-xs text-muted-foreground/60 text-center mt-1">Connect integrations or add data via canvas nodes</p>
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
