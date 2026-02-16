import { useState, useEffect } from "react";
import { Database, Loader2, CheckCircle2, FileText, Image, Globe, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { CanvasNode, PendingConnection } from "./types";

interface BusinessDatabaseNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  pendingConnection: PendingConnection | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onInputPortMouseUp: (e: React.MouseEvent) => void;
  onOutputPortMouseDown: (e: React.MouseEvent) => void;
}

interface DataCounts {
  documents: number;
  images: number;
  text: number;
  websites: number;
  total: number;
}

export function BusinessDatabaseNode({
  node,
  isSelected,
  pendingConnection,
  onMouseDown,
  onInputPortMouseUp,
  onOutputPortMouseDown,
}: BusinessDatabaseNodeProps) {
  const [counts, setCounts] = useState<DataCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await (supabase as any)
          .from('user_business_data')
          .select('data_type')
          .eq('user_id', session.user.id);

        if (error) {
          console.log("No business data yet");
          setIsLoading(false);
          return;
        }

        const items = data || [];
        setCounts({
          documents: items.filter((d: any) => d.data_type === 'document').length,
          images: items.filter((d: any) => d.data_type === 'image').length,
          text: items.filter((d: any) => d.data_type === 'text').length,
          websites: items.filter((d: any) => d.data_type === 'website').length,
          total: items.length,
        });
      } catch (err) {
        console.error("Failed to fetch business data counts:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
  }, []);

  const hasData = counts && counts.total > 0;

  return (
    <div
      className={cn(
        "absolute bg-card border rounded-xl shadow-lg select-none overflow-visible",
        isSelected ? "border-primary ring-2 ring-primary/30 shadow-xl" : "border-border hover:border-primary/50"
      )}
      style={{
        left: node.x,
        top: node.y,
        width: 280,
        height: 180,
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
          {!isLoading && hasData && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              {counts!.total} items
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          )}
          {!isLoading && !hasData && (
            <span className="text-xs text-amber-500">No data</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 h-[calc(100%-44px)]">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Loading business data...</p>
          </div>
        ) : hasData ? (
          <div className="h-full rounded-lg bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Documents:</span>
              <span className="font-medium">{counts!.documents}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Image className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Images:</span>
              <span className="font-medium">{counts!.images}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Type className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Text:</span>
              <span className="font-medium">{counts!.text}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Websites:</span>
              <span className="font-medium">{counts!.websites}</span>
            </div>
          </div>
        ) : (
          <div className="h-full rounded-lg bg-muted/20 flex flex-col items-center justify-center p-4">
            <Database className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground text-center">No business data</p>
            <p className="text-xs text-muted-foreground/60 text-center mt-1">Add data via canvas nodes</p>
          </div>
        )}
      </div>

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
