import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  MousePointer2, 
  Hand, 
  Undo2, 
  Redo2, 
  Minus,
  Plus,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { nodeIconMap, type NodeItem, type CanvasNode, type Connection, type PendingConnection } from "./types";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;

interface WhiteboardCanvasProps {
  onDrop?: (item: NodeItem, x: number, y: number) => void;
}

export function WhiteboardCanvas({ onDrop }: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [tool, setTool] = useState<"select" | "pan">("select");
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

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
        const x = (e.clientX - rect.left - panOffset.x) / (zoom / 100) - NODE_WIDTH / 2;
        const y = (e.clientY - rect.top - panOffset.y) / (zoom / 100) - NODE_HEIGHT / 2;
        
        const newNode: CanvasNode = {
          id: `${item.id}-${Date.now()}`,
          type: item.id,
          label: item.label,
          x: Math.max(0, x),
          y: Math.max(0, y),
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        };
        
        setNodes(prev => [...prev, newNode]);
        onDrop?.(item, x, y);
      }
    } catch (err) {
      console.error("Failed to parse dropped node:", err);
    }
  }, [onDrop, zoom, panOffset]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (tool !== "select") return;
    e.stopPropagation();
    
    setSelectedNodeId(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDraggingNodeId(nodeId);
      setDragOffset({
        x: e.clientX - rect.left - panOffset.x - node.x * (zoom / 100),
        y: e.clientY - rect.top - panOffset.y - node.y * (zoom / 100)
      });
    }
  }, [nodes, tool, zoom, panOffset]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (tool === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } else {
      setSelectedNodeId(null);
    }
  }, [tool, panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      
      // Handle pending connection line
      if (pendingConnection) {
        setPendingConnection(prev => prev ? {
          ...prev,
          mouseX: (e.clientX - rect.left - panOffset.x) / (zoom / 100),
          mouseY: (e.clientY - rect.top - panOffset.y) / (zoom / 100)
        } : null);
      }
      
      // Handle node dragging
      if (draggingNodeId) {
        const newX = (e.clientX - rect.left - panOffset.x - dragOffset.x) / (zoom / 100);
        const newY = (e.clientY - rect.top - panOffset.y - dragOffset.y) / (zoom / 100);
        
        setNodes(prev => prev.map(node => 
          node.id === draggingNodeId 
            ? { ...node, x: Math.max(0, newX), y: Math.max(0, newY) }
            : node
        ));
      }
      
      // Handle panning
      if (isPanning) {
        setPanOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        });
      }
    }
  }, [draggingNodeId, dragOffset, zoom, panOffset, isPanning, panStart, pendingConnection]);

  const handleMouseUp = useCallback(() => {
    setDraggingNodeId(null);
    setIsPanning(false);
    setPendingConnection(null);
  }, []);

  const handleOutputPortMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setPendingConnection({
        fromNodeId: nodeId,
        fromPort: "output",
        mouseX: (e.clientX - rect.left - panOffset.x) / (zoom / 100),
        mouseY: (e.clientY - rect.top - panOffset.y) / (zoom / 100)
      });
    }
  }, [zoom, panOffset]);

  const handleInputPortMouseUp = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (pendingConnection && pendingConnection.fromNodeId !== nodeId) {
      // Check if connection already exists
      const exists = connections.some(
        c => c.fromNodeId === pendingConnection.fromNodeId && c.toNodeId === nodeId
      );
      if (!exists) {
        const newConnection: Connection = {
          id: `conn-${Date.now()}`,
          fromNodeId: pendingConnection.fromNodeId,
          fromPort: "output",
          toNodeId: nodeId,
          toPort: "input"
        };
        setConnections(prev => [...prev, newConnection]);
      }
    }
    setPendingConnection(null);
  }, [pendingConnection, connections]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeId) {
      setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
      setConnections(prev => prev.filter(c => c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId));
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));

  // Get port positions for a node
  const getPortPosition = (node: CanvasNode, port: "input" | "output") => {
    const width = node.width || NODE_WIDTH;
    const height = node.height || NODE_HEIGHT;
    return {
      x: port === "input" ? node.x : node.x + width,
      y: node.y + height / 2
    };
  };

  // Generate bezier path for connection
  const getConnectionPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = Math.abs(to.x - from.x);
    const controlOffset = Math.min(dx * 0.5, 100);
    return `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`;
  };

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col">
      {/* Canvas Area */}
      <div 
        ref={canvasRef}
        className={cn(
          "flex-1 relative overflow-hidden transition-colors duration-200",
          isDragOver ? "bg-primary/5" : "bg-muted/20",
          tool === "pan" ? "cursor-grab" : "cursor-default",
          isPanning && "cursor-grabbing"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Transformed container */}
        <div 
          className="absolute inset-0"
          style={{ 
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
            transformOrigin: "top left",
          }}
        >
          {/* Grid pattern background */}
          <svg className="absolute w-[5000px] h-[5000px] pointer-events-none opacity-30" style={{ left: -2500, top: -2500 }}>
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Connection lines SVG layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
            {/* Existing connections */}
            {connections.map(conn => {
              const fromNode = nodes.find(n => n.id === conn.fromNodeId);
              const toNode = nodes.find(n => n.id === conn.toNodeId);
              if (!fromNode || !toNode) return null;
              
              const from = getPortPosition(fromNode, "output");
              const to = getPortPosition(toNode, "input");
              
              return (
                <g key={conn.id}>
                  <path
                    d={getConnectionPath(from, to)}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    className="opacity-60"
                  />
                  <path
                    d={getConnectionPath(from, to)}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="6"
                    className="opacity-0 hover:opacity-20 cursor-pointer"
                    onClick={() => setConnections(prev => prev.filter(c => c.id !== conn.id))}
                    style={{ pointerEvents: "stroke" }}
                  />
                </g>
              );
            })}
            
            {/* Pending connection line */}
            {pendingConnection && (() => {
              const fromNode = nodes.find(n => n.id === pendingConnection.fromNodeId);
              if (!fromNode) return null;
              const from = getPortPosition(fromNode, "output");
              return (
                <path
                  d={getConnectionPath(from, { x: pendingConnection.mouseX, y: pendingConnection.mouseY })}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  className="opacity-60"
                />
              );
            })()}
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
            const isSelected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                className={cn(
                  "absolute bg-card border rounded-lg shadow-lg",
                  tool === "select" ? "cursor-move" : "cursor-default",
                  isSelected ? "border-primary ring-2 ring-primary/30 shadow-xl" : "border-border hover:border-primary/50",
                  draggingNodeId === node.id && "shadow-2xl"
                )}
                style={{ 
                  left: node.x, 
                  top: node.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              >
                {/* Input port (left side) */}
                <div
                  className={cn(
                    "absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
                    pendingConnection ? "border-primary scale-125 bg-primary/20" : "border-muted-foreground/50 hover:border-primary hover:scale-110"
                  )}
                  onMouseUp={(e) => handleInputPortMouseUp(e, node.id)}
                />

                {/* Node content */}
                <div className="flex items-center gap-2 p-3 h-full">
                  <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {Icon && <Icon className="h-5 w-5 text-primary" />}
                  </div>
                  <span className="text-sm font-medium truncate">{node.label}</span>
                </div>

                {/* Output port (right side) */}
                <div
                  className={cn(
                    "absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
                    "border-muted-foreground/50 hover:border-primary hover:scale-110"
                  )}
                  onMouseDown={(e) => handleOutputPortMouseDown(e, node.id)}
                />
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

          {/* Delete selected */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            title="Delete selected"
            onClick={handleDeleteSelected}
            disabled={!selectedNodeId}
          >
            <Trash2 className="h-4 w-4" />
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
