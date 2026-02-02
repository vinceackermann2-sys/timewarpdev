import { useState, useCallback } from "react";
import { Globe, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { CanvasNode, PendingConnection } from "./types";

interface WebsiteNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  pendingConnection: PendingConnection | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onInputPortMouseUp: (e: React.MouseEvent) => void;
  onOutputPortMouseDown: (e: React.MouseEvent) => void;
  onUpdate: (nodeId: string, updates: Partial<CanvasNode>) => void;
}

export function WebsiteNode({
  node,
  isSelected,
  pendingConnection,
  onMouseDown,
  onInputPortMouseUp,
  onOutputPortMouseDown,
  onUpdate,
}: WebsiteNodeProps) {
  const [url, setUrl] = useState(node.websiteUrl || "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const analyzeWebsite = useCallback(async (websiteUrl: string) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Progress animation
    const interval = setInterval(() => {
      setAnalysisProgress(prev => Math.min(prev + Math.random() * 8 + 3, 90));
    }, 500);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            type: "website",
            content: { websiteUrl }
          }),
        }
      );

      const data = await response.json();
      
      if (data.success && data.analysis) {
        onUpdate(node.id, { 
          websiteUrl,
          analyzedContent: data.analysis,
          isAnalyzed: true
        });
      } else {
        onUpdate(node.id, { websiteUrl, isAnalyzed: false });
      }
    } catch (error) {
      console.error("Failed to analyze website:", error);
      onUpdate(node.id, { websiteUrl, isAnalyzed: false });
    } finally {
      clearInterval(interval);
      setAnalysisProgress(100);
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 300);
    }
  }, [node.id, onUpdate]);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
  }, []);

  const handleUrlBlur = useCallback(() => {
    if (url && url !== node.websiteUrl) {
      let normalizedUrl = url.trim();
      if (normalizedUrl && !normalizedUrl.match(/^https?:\/\//)) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      setUrl(normalizedUrl);
      onUpdate(node.id, { 
        websiteUrl: normalizedUrl, 
        isAnalyzed: false, 
        analyzedContent: undefined 
      });
      // Trigger analysis
      analyzeWebsite(normalizedUrl);
    }
  }, [url, node.id, node.websiteUrl, onUpdate, analyzeWebsite]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleUrlBlur();
    }
  }, [handleUrlBlur]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  const getFaviconUrl = (websiteUrl: string) => {
    try {
      const urlObj = new URL(websiteUrl);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
    } catch {
      return null;
    }
  };

  const getDomain = (websiteUrl: string) => {
    try {
      return new URL(websiteUrl).hostname;
    } catch {
      return websiteUrl;
    }
  };

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
        height: 200,
      }}
      onMouseDown={onMouseDown}
      onWheel={handleWheel}
    >
      {/* Input port (centered) */}
      <div
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all z-20",
          pendingConnection ? "border-primary scale-125 bg-primary/20" : "border-muted-foreground/50 hover:border-primary hover:scale-110"
        )}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={onInputPortMouseUp}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Website</span>
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <span className="text-xs text-primary flex items-center gap-1">
              Analyzing... ({Math.min(Math.round(analysisProgress), 100)}%)
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          )}
          {node.isAnalyzed && !isAnalyzing && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              Ready
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3 h-[calc(100%-44px)]">
        <Input
          value={url}
          onChange={handleUrlChange}
          onBlur={handleUrlBlur}
          onKeyDown={handleKeyDown}
          placeholder="Enter URL..."
          className="h-8 text-sm"
        />

        {node.websiteUrl ? (
          <div className="h-[calc(100%-44px)] rounded-lg bg-muted/30 flex items-center justify-center p-4 relative">
            {isAnalyzing && (
              <div className="absolute inset-0 bg-background/70 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Fetching & analyzing...</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 w-full">
              <img
                src={getFaviconUrl(node.websiteUrl) || ""}
                alt=""
                className="h-10 w-10 rounded-lg bg-muted"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{getDomain(node.websiteUrl)}</p>
                {node.isAnalyzed && (
                  <p className="text-xs text-muted-foreground">Content analyzed</p>
                )}
              </div>
              <a
                href={node.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-primary p-2"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100%-44px)] rounded-lg bg-muted/20 flex flex-col items-center justify-center p-4">
            <Globe className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">Enter a URL above</p>
          </div>
        )}
      </div>

      {/* Output port (centered) */}
      <div
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all z-20",
          "border-primary bg-primary/20 hover:scale-110"
        )}
        onMouseDown={(e) => {
          e.stopPropagation();
          onOutputPortMouseDown(e);
        }}
      />
    </div>
  );
}
