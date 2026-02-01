import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { 
  MousePointer2, 
  Hand, 
  Undo2, 
  Redo2, 
  Minus,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { nodeIconMap, type NodeItem, type CanvasNode } from "./types";

interface WhiteboardCanvasProps {
  onDrop?: (item: NodeItem, x: number, y: number) => void;
}

export function WhiteboardCanvas({ onDrop }: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [tool, setTool] = useState<"select" | "pan">("select");
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
    
    try {
      const nodeData = e.dataTransfer.getData("application/json");
      if (nodeData && canvasRef.current) {
        const item: NodeItem = JSON.parse(nodeData);
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / (zoom / 100) - 75;
        const y = (e.clientY - rect.top) / (zoom / 100) - 40;
        
        const newNode: CanvasNode = {
          id: `${item.id}-${Date.now()}`,
          type: item.id,
          label: item.label,
          x: Math.max(0, x),
          y: Math.max(0, y),
        };
        
        setNodes(prev => [...prev, newNode]);
        onDrop?.(item, x, y);
      }
    } catch (err) {
      console.error("Failed to parse dropped node:", err);
    }
  }, [onDrop, zoom]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (tool !== "select") return;
    e.stopPropagation();
    
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDraggingNodeId(nodeId);
      setDragOffset({
        x: e.clientX - node.x * (zoom / 100),
        y: e.clientY - node.y * (zoom / 100)
      });
    }
  }, [nodes, tool, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingNodeId) return;
    
    const newX = (e.clientX - dragOffset.x) / (zoom / 100);
    const newY = (e.clientY - dragOffset.y) / (zoom / 100);
    
    setNodes(prev => prev.map(node => 
      node.id === draggingNodeId 
        ? { ...node, x: Math.max(0, newX), y: Math.max(0, newY) }
        : node
    ));
  }, [draggingNodeId, dragOffset, zoom]);

  const handleMouseUp = useCallback(() => {
    setDraggingNodeId(null);
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col">
      {/* Canvas Area */}
      <div 
        ref={canvasRef}
        className={cn(
          "flex-1 relative overflow-auto transition-colors duration-200",
          isDragOver ? "bg-primary/5" : "bg-muted/20",
          tool === "pan" ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Zoomable container */}
        <div 
          className="min-w-full min-h-full relative"
          style={{ 
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top left",
            width: `${10000 / (zoom / 100)}px`,
            height: `${10000 / (zoom / 100)}px`
          }}
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

          {/* Rendered nodes */}
          {nodes.map((node) => {
            const Icon = nodeIconMap[node.type];
            return (
              <div
                key={node.id}
                className={cn(
                  "absolute bg-card border border-border rounded-lg shadow-lg p-3 min-w-[150px]",
                  tool === "select" ? "cursor-move hover:border-primary/50" : "cursor-default",
                  draggingNodeId === node.id && "ring-2 ring-primary shadow-xl"
                )}
                style={{ left: node.x, top: node.y }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    {Icon && <Icon className="h-4 w-4 text-primary" />}
                  </div>
                  <span className="text-sm font-medium">{node.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-1 bg-card/95 backdrop-blur border border-border rounded-lg shadow-lg px-2 py-1.5">
          {/* Undo/Redo */}
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Tools */}
          <Button 
            variant={tool === "select" ? "secondary" : "ghost"} 
            size="icon" 
            className="h-8 w-8" 
            title="Select"
            onClick={() => setTool("select")}
          >
            <MousePointer2 className="h-4 w-4" />
          </Button>
          <Button 
            variant={tool === "pan" ? "secondary" : "ghost"} 
            size="icon" 
            className="h-8 w-8" 
            title="Pan"
            onClick={() => setTool("pan")}
          >
            <Hand className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Zoom Controls */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            title="Zoom Out"
            onClick={handleZoomOut}
            disabled={zoom <= 25}
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <span className="text-xs font-medium w-12 text-center tabular-nums">
            {zoom}%
          </span>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            title="Zoom In"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
