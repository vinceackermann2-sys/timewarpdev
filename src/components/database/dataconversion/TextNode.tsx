import { useState, useCallback, useEffect, useRef } from "react";
import { useActionGate } from "@/hooks/useActionGate";
import { Type, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
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
  const analyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { checkCanUseAction } = useActionGate();

  const analyzeText = useCallback(async (textToAnalyze: string) => {
    if (!textToAnalyze.trim() || textToAnalyze.length < 10) return;
    if (!checkCanUseAction()) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Progress animation
    const interval = setInterval(() => {
      setAnalysisProgress(prev => Math.min(prev + Math.random() * 10 + 5, 90));
    }, 300);

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
            type: "text",
            content: { text: textToAnalyze }
          }),
        }
      );

      const data = await response.json();
      
      if (data.success && data.analysis) {
        onUpdate(node.id, { 
          textContent: textToAnalyze,
          analyzedContent: data.analysis,
          isAnalyzed: true
        });

        // Persist to user_business_data
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await (supabase as any).from('user_business_data').insert({
              user_id: session.user.id,
              data_type: 'text',
              source: 'canvas',
              title: `Text note (${textToAnalyze.slice(0, 30)}...)`,
              content: textToAnalyze,
              analyzed_content: data.analysis,
              is_analyzed: true,
            });
          }
        } catch (dbErr) {
          console.error("Failed to persist text data:", dbErr);
        }
      }
    } catch (error) {
      console.error("Failed to analyze text:", error);
    } finally {
      clearInterval(interval);
      setAnalysisProgress(100);
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 300);
    }
  }, [node.id, onUpdate]);

  // Debounced analysis when text changes
  useEffect(() => {
    if (analyzeTimeoutRef.current) {
      clearTimeout(analyzeTimeoutRef.current);
    }

    if (text.trim() && text.length >= 10 && text !== node.textContent) {
      analyzeTimeoutRef.current = setTimeout(() => {
        analyzeText(text);
      }, 1500); // Wait 1.5s after typing stops
    }

    return () => {
      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current);
      }
    };
  }, [text, node.textContent, analyzeText]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    // Mark as not analyzed when text changes
    if (node.isAnalyzed && newText !== node.textContent) {
      onUpdate(node.id, { isAnalyzed: false, analyzedContent: undefined });
    }
  }, [node.id, node.isAnalyzed, node.textContent, onUpdate]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div
      className={cn(
        "absolute bg-card border rounded-xl shadow-lg select-none overflow-visible canvas-node-smooth",
        isSelected ? "border-primary ring-2 ring-primary/30 shadow-xl" : "border-border hover:border-primary/50"
      )}
      style={{
        left: node.x,
        top: node.y,
        width: 280,
        height: 220,
      }}
      onMouseDown={onMouseDown}
      onWheel={handleWheel}
    >

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
          {node.isAnalyzed && !isAnalyzing && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              Ready
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 h-[calc(100%-44px)] flex flex-col">
        <Textarea
          value={text}
          onChange={handleTextChange}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          placeholder="Enter text to analyze..."
          className="flex-1 resize-none text-sm min-h-0"
        />
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
        </div>
      </div>

      {/* Output port (centered on right edge of card) */}
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
