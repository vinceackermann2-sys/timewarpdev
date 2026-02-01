import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { NodeItem } from "./NodePalette";

interface CanvasNode {
  id: string;
  type: string;
  label: string;
  icon: React.ElementType;
  x: number;
  y: number;
}

interface WhiteboardCanvasProps {
  onDrop?: (item: NodeItem, x: number, y: number) => void;
}

export function WhiteboardCanvas({ onDrop }: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    // Get drop position relative to canvas
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onDrop?.(null as any, x, y); // Will be connected to actual node data
    }
  }, [onDrop]);

  return (
    <div 
      ref={canvasRef}
      className={cn(
        "flex-1 relative overflow-hidden transition-colors duration-200",
        isDragOver ? "bg-primary/5" : "bg-muted/20"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Grid pattern background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Drop indicator */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-primary/10 border-2 border-dashed border-primary/50 rounded-xl px-8 py-6 animate-pulse">
            <p className="text-primary font-medium">Drop node here</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {nodes.length === 0 && !isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">Start building your workflow</p>
            <p className="text-sm mt-1">Drag nodes from the left panel onto the canvas</p>
          </div>
        </div>
      )}

      {/* Rendered nodes will go here */}
      {nodes.map((node) => {
        const Icon = node.icon;
        return (
          <div
            key={node.id}
            className="absolute bg-card border border-border rounded-lg shadow-lg p-3 cursor-move"
            style={{ left: node.x, top: node.y }}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{node.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
