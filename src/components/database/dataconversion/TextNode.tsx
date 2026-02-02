import { useState, useCallback, useEffect } from "react";
import { Type, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import type { CanvasNode, PendingConnection } from "./types";

interface TextNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  pendingConnection: PendingConnection | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onInputPortMouseUp: (e: React.MouseEvent) => void;
  onOutputPortMouseDown: (e: React.MouseEvent) => void;
  onUpdate: (nodeId: string, updates: Partial<CanvasNode>) => void;
}

export function TextNode({
  node,
  isSelected,
  pendingConnection,
  onMouseDown,
  onInputPortMouseUp,
  onOutputPortMouseDown,
  onUpdate,
}: TextNodeProps) {
  const [text, setText] = useState(node.textContent || "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [analyzeTimeout, setAnalyzeTimeout] = useState<NodeJS.Timeout | null>(null);

  // Debounced analysis when text changes
  useEffect(() => {
    if (text.length > 10) {
      // Clear previous timeout
      if (analyzeTimeout) clearTimeout(analyzeTimeout);
      
      // Set new timeout to start analysis after typing stops
      const timeout = setTimeout(() => {
        setIsAnalyzing(true);
        setAnalysisProgress(0);
        setIsAnalyzed(false);
        
        const interval = setInterval(() => {
          setAnalysisProgress(prev => {
            if (prev >= 100) {
              clearInterval(interval);
              setIsAnalyzing(false);
              setIsAnalyzed(true);
              return 100;
            }
            return prev + Math.random() * 20 + 10;
          });
        }, 150);
      }, 500);
      
      setAnalyzeTimeout(timeout);
    } else {
      setIsAnalyzed(false);
      setIsAnalyzing(false);
    }

    return () => {
      if (analyzeTimeout) clearTimeout(analyzeTimeout);
    };
  }, [text]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    onUpdate(node.id, { textContent: newText });
  }, [node.id, onUpdate]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

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
      {/* Input port */}
      <div
        className={cn(
          "absolute -left-2 top-10 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
          pendingConnection ? "border-primary scale-125 bg-primary/20" : "border-muted-foreground/50 hover:border-primary hover:scale-110"
        )}
        onMouseUp={onInputPortMouseUp}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Text</span>
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <span className="text-xs text-primary flex items-center gap-1">
              Analyzing... ({Math.min(Math.round(analysisProgress), 100)}%)
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          )}
          {isAnalyzed && !isAnalyzing && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              Ready
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Text area */}
      <div className="p-3 h-[calc(100%-70px)]">
        <Textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Enter text content to analyze..."
          className="h-full text-sm resize-none border-0 bg-muted/30 focus-visible:ring-1"
        />
      </div>

      {/* Footer with stats */}
      <div className="px-3 pb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{wordCount} words • {charCount} chars</span>
        {text.length > 0 && text.length <= 10 && (
          <span className="text-amber-500">Need more text</span>
        )}
      </div>

      {/* Output port */}
      <div
        className={cn(
          "absolute -right-2 top-10 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
          "border-primary bg-primary/20 hover:scale-110"
        )}
        onMouseDown={onOutputPortMouseDown}
      />
    </div>
  );
}
