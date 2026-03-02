import { useState, useEffect } from "react";
import {
  Database, Loader2, CheckCircle2, FileText, Image, Globe, Type,
  Mail, Video, Music, Table2, ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

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
};

const sourceLabels: Record<string, string> = {
  canvas: "Canvas",
  google: "Google",
  microsoft: "Microsoft",
  slack: "Slack",
  wordpress: "WordPress",
  upload: "Upload",
};

export function BusinessDataListView() {
  const [items, setItems] = useState<DataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setIsLoading(false); return; }

        const { data, error } = await (supabase as any)
          .from("user_business_data")
          .select("id, data_type, source, title, content, analyzed_content, is_analyzed, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(200);

        if (!error && data) setItems(data);
      } catch (err) {
        console.error("Failed to fetch business data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const groupedBySource = items.reduce<Record<string, DataItem[]>>((acc, item) => {
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
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Loading business data...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
          <Database className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">No business data yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Connect integrations or add data via the Data Conversion canvas
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          All your connected business data in one place.
        </p>
        <span className="text-xs text-primary flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {items.length} items
        </span>
      </div>

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
                      "rounded-lg border border-border/40 transition-all cursor-pointer hover:border-primary/30",
                      isExpanded && "border-primary/40 bg-muted/30"
                    )}
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5">
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
    </div>
  );
}
