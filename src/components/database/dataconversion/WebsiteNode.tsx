import { useState, useCallback } from "react";
import { Globe, ExternalLink, Loader2 } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setPreviewError(false);
  }, []);

  const handleUrlBlur = useCallback(() => {
    if (url && url !== node.websiteUrl) {
      let normalizedUrl = url.trim();
      if (normalizedUrl && !normalizedUrl.match(/^https?:\/\//)) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      setUrl(normalizedUrl);
      setIsLoading(true);
      onUpdate(node.id, { websiteUrl: normalizedUrl });
      // Simulate loading time for favicon/preview
      setTimeout(() => setIsLoading(false), 500);
    }
  }, [url, node.id, node.websiteUrl, onUpdate]);

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
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
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
        "absolute bg-card border rounded-lg shadow-lg",
        isSelected ? "border-primary ring-2 ring-primary/30 shadow-xl" : "border-border hover:border-primary/50"
      )}
      style={{
        left: node.x,
        top: node.y,
        width: 220,
        height: 140,
      }}
      onMouseDown={onMouseDown}
      onWheel={handleWheel}
    >
      {/* Input port */}
      <div
        className={cn(
          "absolute -left-2 top-8 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
          pendingConnection ? "border-primary scale-125 bg-primary/20" : "border-muted-foreground/50 hover:border-primary hover:scale-110"
        )}
        onMouseUp={onInputPortMouseUp}
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
          <Globe className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-xs font-medium">Website</span>
      </div>

      {/* Content */}
      <div className="p-2 space-y-2">
        <Input
          value={url}
          onChange={handleUrlChange}
          onBlur={handleUrlBlur}
          onKeyDown={handleKeyDown}
          placeholder="Enter URL..."
          className="h-7 text-xs"
        />

        {node.websiteUrl && (
          <div className="rounded-md bg-muted/50 p-2 flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <img
                  src={getFaviconUrl(node.websiteUrl) || ""}
                  alt=""
                  className="h-5 w-5 rounded"
                  onError={() => setPreviewError(true)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{getDomain(node.websiteUrl)}</p>
                </div>
                <a
                  href={node.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </>
            )}
          </div>
        )}

        {!node.websiteUrl && (
          <div className="rounded-md bg-muted/30 p-3 text-center">
            <p className="text-xs text-muted-foreground">Enter a URL above</p>
          </div>
        )}
      </div>

      {/* Output port */}
      <div
        className={cn(
          "absolute -right-2 top-8 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
          "border-muted-foreground/50 hover:border-primary hover:scale-110"
        )}
        onMouseDown={onOutputPortMouseDown}
      />
    </div>
  );
}
