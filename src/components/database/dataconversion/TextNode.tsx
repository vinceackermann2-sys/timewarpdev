import { useState, useCallback } from "react";
import { Type } from "lucide-react";
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

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    onUpdate(node.id, { textContent: newText });
  }, [node.id, onUpdate]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

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
          <Type className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-xs font-medium">Text Input</span>
      </div>

      {/* Text area */}
      <div className="p-2">
        <Textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Enter text content..."
          className="min-h-[80px] text-xs resize-none border-0 bg-muted/30 focus-visible:ring-1"
        />
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
