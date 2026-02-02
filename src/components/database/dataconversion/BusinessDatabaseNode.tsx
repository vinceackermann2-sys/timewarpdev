import { useState, useEffect } from "react";
import { Database, Loader2, CheckCircle2, Mail, FileText, Calendar } from "lucide-react";
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
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // Simulate loading progress
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 20 + 5;
        });
      }, 150);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsLoading(false);
          clearInterval(progressInterval);
          return;
        }

        const { data, error } = await supabase.storage
          .from('business-data')
          .download(`${session.user.id}/research.json`);

        if (error) {
          console.log("No business data yet");
          setIsLoading(false);
          clearInterval(progressInterval);
          return;
        }

        const text = await data.text();
        const parsed = JSON.parse(text);
        setSummary(parsed.summary || null);
        setLoadingProgress(100);
      } catch (err) {
        console.error("Failed to fetch business data:", err);
      } finally {
        clearInterval(progressInterval);
        setTimeout(() => setIsLoading(false), 300);
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
        "absolute bg-card border rounded-xl shadow-lg",
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
      {/* Input port (centered) */}
      <div
        className={cn(
          "absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
          pendingConnection ? "border-primary scale-125 bg-primary/20" : "border-muted-foreground/50 hover:border-primary hover:scale-110"
        )}
        onMouseUp={onInputPortMouseUp}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Business Database</span>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="text-xs text-primary flex items-center gap-1">
              Syncing... ({Math.min(Math.round(loadingProgress), 100)}%)
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          )}
          {!isLoading && hasData && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              Ready
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
            <p className="text-xs text-muted-foreground">Connecting to business data...</p>
          </div>
        ) : hasData ? (
          <div className="h-full rounded-lg bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Emails:</span>
              <span className="font-medium">{summary!.emailsAnalyzed || 0}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Documents:</span>
              <span className="font-medium">{summary!.documentsAnalyzed || 0}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Events:</span>
              <span className="font-medium">{summary!.eventsAnalyzed || 0}</span>
            </div>
            {(summary!.sheetsAnalyzed || 0) > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Sheets:</span>
                <span className="font-medium">{summary!.sheetsAnalyzed}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full rounded-lg bg-muted/20 flex flex-col items-center justify-center p-4">
            <Database className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground text-center">No business data</p>
            <p className="text-xs text-muted-foreground/60 text-center mt-1">Run research to sync data</p>
          </div>
        )}
      </div>

      {/* Output port (centered) */}
      <div
        className={cn(
          "absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
          "border-primary bg-primary/20 hover:scale-110"
        )}
        onMouseDown={onOutputPortMouseDown}
      />
    </div>
  );
}
