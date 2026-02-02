import { useState, useEffect } from "react";
import { Database, Loader2, CheckCircle2 } from "lucide-react";
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

interface BusinessSummary {
  emailsAnalyzed?: number;
  eventsAnalyzed?: number;
  documentsAnalyzed?: number;
  sheetsAnalyzed?: number;
}

export function BusinessDatabaseNode({
  node,
  isSelected,
  pendingConnection,
  onMouseDown,
  onInputPortMouseUp,
  onOutputPortMouseDown,
}: BusinessDatabaseNodeProps) {
  const [summary, setSummary] = useState<BusinessSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.storage
          .from('business-data')
          .download(`${session.user.id}/research.json`);

        if (error) {
          console.log("No business data yet");
          setIsLoading(false);
          return;
        }

        const text = await data.text();
        const parsed = JSON.parse(text);
        setSummary(parsed.summary || null);
      } catch (err) {
        console.error("Failed to fetch business data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const hasData = summary && (
    (summary.emailsAnalyzed || 0) > 0 ||
    (summary.documentsAnalyzed || 0) > 0 ||
    (summary.eventsAnalyzed || 0) > 0
  );

  return (
    <div
      className={cn(
        "absolute bg-card border rounded-lg shadow-lg",
        isSelected ? "border-primary ring-2 ring-primary/30 shadow-xl" : "border-border hover:border-primary/50"
      )}
      style={{
        left: node.x,
        top: node.y,
        width: 200,
        height: 90,
      }}
      onMouseDown={onMouseDown}
    >
      {/* Input port */}
      <div
        className={cn(
          "absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
          pendingConnection ? "border-primary scale-125 bg-primary/20" : "border-muted-foreground/50 hover:border-primary hover:scale-110"
        )}
        onMouseUp={onInputPortMouseUp}
      />

      {/* Node content */}
      <div className="flex flex-col p-3 h-full">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Business Database</p>
          </div>
          {hasData && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground">
          {isLoading ? (
            <div className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : hasData ? (
            <span className="text-primary">
              {summary!.emailsAnalyzed || 0} emails • {summary!.documentsAnalyzed || 0} docs • {summary!.eventsAnalyzed || 0} events
            </span>
          ) : (
            <span className="text-destructive">Run research to sync data</span>
          )}
        </div>
      </div>

      {/* Output port */}
      <div
        className={cn(
          "absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
          "border-muted-foreground/50 hover:border-primary hover:scale-110"
        )}
        onMouseDown={onOutputPortMouseDown}
      />
    </div>
  );
}
