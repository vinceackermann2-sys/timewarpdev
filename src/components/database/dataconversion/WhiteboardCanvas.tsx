import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { 
  MousePointer2, 
  Hand, 
  Undo2, 
  Redo2, 
  Minus,
  Plus,
  Trash2,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { nodeIconMap, type NodeItem, type CanvasNode, type Connection, type PendingConnection } from "./types";
import { ResearchChatNode } from "./ResearchChatNode";
import { BusinessDatabaseNode } from "./BusinessDatabaseNode";
import { TextNode } from "./TextNode";
import { DocumentNode } from "./DocumentNode";
import { ImageNode } from "./ImageNode";
import { WebsiteNode } from "./WebsiteNode";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

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
  const [tool, setTool] = useState<"select" | "pan">("pan");
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    setZoom(prev => Math.max(25, Math.min(200, prev + delta)));
  }, []);

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
    e.stopPropagation();
    e.preventDefault(); // Prevent text selection
    
    // Handle multi-select with shift key (only in select mode)
    if (tool === "select" && e.shiftKey) {
      setSelectedNodeIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId);
        } else {
          newSet.add(nodeId);
        }
        return newSet;
      });
      return;
    }
    
    // Select single node for dragging - works in both pan and select modes
    if (!selectedNodeIds.has(nodeId)) {
      setSelectedNodeIds(new Set([nodeId]));
    }
    
    const node = nodes.find(n => n.id === nodeId);
    if (node && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDraggingNodeId(nodeId);
      setDragOffset({
        x: e.clientX - rect.left - panOffset.x - node.x * (zoom / 100),
        y: e.clientY - rect.top - panOffset.y - node.y * (zoom / 100)
      });
    }
  }, [nodes, tool, zoom, panOffset, selectedNodeIds]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    if (tool === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } else if (tool === "select") {
      // Start selection box
      const canvasX = (e.clientX - rect.left - panOffset.x) / (zoom / 100);
      const canvasY = (e.clientY - rect.top - panOffset.y) / (zoom / 100);
      setSelectionBox({
        startX: canvasX,
        startY: canvasY,
        endX: canvasX,
        endY: canvasY
      });
      setIsSelecting(true);
      if (!e.shiftKey) {
        setSelectedNodeIds(new Set());
      }
    }
  }, [tool, panOffset, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Handle pending connection line
    if (pendingConnection) {
      setPendingConnection(prev => prev ? {
        ...prev,
        mouseX: (e.clientX - rect.left - panOffset.x) / (zoom / 100),
        mouseY: (e.clientY - rect.top - panOffset.y) / (zoom / 100)
      } : null);
    }
    
    // Handle node dragging (move all selected nodes)
    if (draggingNodeId && selectedNodeIds.size > 0) {
      const deltaX = (e.clientX - rect.left - panOffset.x - dragOffset.x) / (zoom / 100);
      const deltaY = (e.clientY - rect.top - panOffset.y - dragOffset.y) / (zoom / 100);
      
      const draggedNode = nodes.find(n => n.id === draggingNodeId);
      if (draggedNode) {
        const offsetX = deltaX - draggedNode.x;
        const offsetY = deltaY - draggedNode.y;
        
        setNodes(prev => prev.map(node => 
          selectedNodeIds.has(node.id)
            ? { ...node, x: Math.max(0, node.x + offsetX), y: Math.max(0, node.y + offsetY) }
            : node
        ));
        
        // Update drag offset for next frame
        setDragOffset({
          x: e.clientX - rect.left - panOffset.x - deltaX * (zoom / 100),
          y: e.clientY - rect.top - panOffset.y - deltaY * (zoom / 100)
        });
      }
    }
    
    // Handle panning
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
    
    // Handle selection box
    if (isSelecting && selectionBox) {
      const canvasX = (e.clientX - rect.left - panOffset.x) / (zoom / 100);
      const canvasY = (e.clientY - rect.top - panOffset.y) / (zoom / 100);
      setSelectionBox(prev => prev ? {
        ...prev,
        endX: canvasX,
        endY: canvasY
      } : null);
    }
  }, [draggingNodeId, dragOffset, zoom, panOffset, isPanning, panStart, pendingConnection, isSelecting, selectionBox, selectedNodeIds, nodes]);

  const handleMouseUp = useCallback(() => {
    // Finalize selection box - select nodes within it
    if (isSelecting && selectionBox) {
      const minX = Math.min(selectionBox.startX, selectionBox.endX);
      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
      const minY = Math.min(selectionBox.startY, selectionBox.endY);
      const maxY = Math.max(selectionBox.startY, selectionBox.endY);
      
      const nodesInBox = nodes.filter(node => {
        const nodeRight = node.x + (node.width || NODE_WIDTH);
        const nodeBottom = node.y + (node.height || NODE_HEIGHT);
        return node.x < maxX && nodeRight > minX && node.y < maxY && nodeBottom > minY;
      });
      
      if (nodesInBox.length > 0) {
        setSelectedNodeIds(prev => {
          const newSet = new Set(prev);
          nodesInBox.forEach(n => newSet.add(n.id));
          return newSet;
        });
      }
    }
    
    setDraggingNodeId(null);
    setIsPanning(false);
    setPendingConnection(null);
    setSelectionBox(null);
    setIsSelecting(false);
  }, [isSelecting, selectionBox, nodes]);

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
    if (selectedNodeIds.size > 0) {
      setNodes(prev => prev.filter(n => !selectedNodeIds.has(n.id)));
      setConnections(prev => prev.filter(c => !selectedNodeIds.has(c.fromNodeId) && !selectedNodeIds.has(c.toNodeId)));
      setSelectedNodeIds(new Set());
    }
  }, [selectedNodeIds]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 25));

  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<CanvasNode>) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updates } : n));
  }, []);

  const getPortPosition = (node: CanvasNode, port: "input" | "output") => {
    // Get actual dimensions based on node type
    const nodeHeights: Record<string, number> = {
      "research": 336,
      "business-db": 180,
      "text": 220,
      "document": 200,
      "image": 220,
      "website": 200,
    };
    const nodeWidths: Record<string, number> = {
      "research": 460,
      "business-db": 280,
      "text": 280,
      "document": 260,
      "image": 260,
      "website": 280,
    };
    const width = nodeWidths[node.type] || node.width || NODE_WIDTH;
    const height = nodeHeights[node.type] || node.height || NODE_HEIGHT;
    // Ports are centered on the card edge (translate-x-1/2 / -translate-x-1/2)
    return {
      x: port === "input" ? node.x : node.x + width,
      y: node.y + height / 2
    };
  };

  const getConnectionPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = Math.abs(to.x - from.x);
    const controlOffset = Math.min(dx * 0.5, 100);
    return `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`;
  };

  // Calculate selection box rect
  const selectionRect = selectionBox ? {
    x: Math.min(selectionBox.startX, selectionBox.endX),
    y: Math.min(selectionBox.startY, selectionBox.endY),
    width: Math.abs(selectionBox.endX - selectionBox.startX),
    height: Math.abs(selectionBox.endY - selectionBox.startY)
  } : null;

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col">
      {/* Canvas Area */}
      <div 
        ref={canvasRef}
        className={cn(
          "flex-1 relative overflow-hidden transition-colors duration-200",
          isDragOver ? "bg-primary/5" : "bg-muted/20",
          tool === "pan" ? "cursor-grab" : "cursor-crosshair",
          isPanning && "cursor-grabbing"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
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

            {/* Selection box */}
            {selectionRect && selectionRect.width > 5 && selectionRect.height > 5 && (
              <rect
                x={selectionRect.x}
                y={selectionRect.y}
                width={selectionRect.width}
                height={selectionRect.height}
                fill="hsl(var(--primary) / 0.1)"
                stroke="hsl(var(--primary))"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            )}
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
            const isSelected = selectedNodeIds.has(node.id);
            
            // Render Research nodes as chat interfaces
            if (node.type === "research") {
              return (
                <ResearchChatNode
                  key={node.id}
                  node={node}
                  connections={connections}
                  connectedNodes={nodes}
                  isSelected={isSelected}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onInputPortMouseUp={(e) => handleInputPortMouseUp(e, node.id)}
                  onOutputPortMouseDown={(e) => handleOutputPortMouseDown(e, node.id)}
                  onClose={() => {
                    setNodes(prev => prev.filter(n => n.id !== node.id));
                    setConnections(prev => prev.filter(c => c.fromNodeId !== node.id && c.toNodeId !== node.id));
                  }}
                />
              );
            }
            
            // Business Database node with live data
            if (node.type === "business-db") {
              return (
                <BusinessDatabaseNode
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  pendingConnection={pendingConnection}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onInputPortMouseUp={(e) => handleInputPortMouseUp(e, node.id)}
                  onOutputPortMouseDown={(e) => handleOutputPortMouseDown(e, node.id)}
                />
              );
            }

            // Text node with editable content
            if (node.type === "text") {
              return (
                <TextNode
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  pendingConnection={pendingConnection}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onInputPortMouseUp={(e) => handleInputPortMouseUp(e, node.id)}
                  onOutputPortMouseDown={(e) => handleOutputPortMouseDown(e, node.id)}
                  onUpdate={handleNodeUpdate}
                />
              );
            }

            // Document node with upload
            if (node.type === "document") {
              return (
                <DocumentNode
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  pendingConnection={pendingConnection}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onInputPortMouseUp={(e) => handleInputPortMouseUp(e, node.id)}
                  onOutputPortMouseDown={(e) => handleOutputPortMouseDown(e, node.id)}
                  onUpdate={handleNodeUpdate}
                />
              );
            }

            // Image node with upload
            if (node.type === "image") {
              return (
                <ImageNode
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  pendingConnection={pendingConnection}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onInputPortMouseUp={(e) => handleInputPortMouseUp(e, node.id)}
                  onOutputPortMouseDown={(e) => handleOutputPortMouseDown(e, node.id)}
                  onUpdate={handleNodeUpdate}
                />
              );
            }

            // Website node with URL input
            if (node.type === "website") {
              return (
                <WebsiteNode
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  pendingConnection={pendingConnection}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onInputPortMouseUp={(e) => handleInputPortMouseUp(e, node.id)}
                  onOutputPortMouseDown={(e) => handleOutputPortMouseDown(e, node.id)}
                  onUpdate={handleNodeUpdate}
                />
              );
            }

            // Action node (styled differently)
            if (node.type === "action") {
              return (
                <div
                  key={node.id}
                  className={cn(
                    "absolute bg-card border rounded-lg shadow-lg",
                    tool === "select" ? "cursor-move" : "cursor-default",
                    isSelected ? "border-accent ring-2 ring-accent/30 shadow-xl" : "border-border hover:border-accent/50",
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
                  {/* Input port */}
                  <div
                    className={cn(
                      "absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
                      pendingConnection ? "border-accent scale-125 bg-accent/20" : "border-muted-foreground/50 hover:border-accent hover:scale-110"
                    )}
                    onMouseUp={(e) => handleInputPortMouseUp(e, node.id)}
                  />
                  <div className="flex items-center gap-2 p-3 h-full">
                    <div className="h-9 w-9 rounded-md bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <span className="text-sm font-medium truncate">{node.label}</span>
                  </div>
                  {/* Output port */}
                  <div
                    className={cn(
                      "absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
                      "border-muted-foreground/50 hover:border-accent hover:scale-110"
                    )}
                    onMouseDown={(e) => handleOutputPortMouseDown(e, node.id)}
                  />
                </div>
              );
            }
            
            // Default node rendering
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
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          <Button 
            variant={tool === "select" ? "secondary" : "ghost"} 
            size="icon" 
            className="h-8 w-8" 
            title="Select (drag to multi-select)"
            onClick={() => setTool("select")}
          >
            <MousePointer2 className="h-4 w-4" />
          </Button>
          <Button 
            variant={tool === "pan" ? "secondary" : "ghost"} 
            size="icon" 
            className="h-8 w-8" 
            title="Pan (drag to move canvas)"
            onClick={() => setTool("pan")}
          >
            <Hand className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            title="Delete selected"
            onClick={handleDeleteSelected}
            disabled={selectedNodeIds.size === 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            title="Zoom Out"
            onClick={handleZoomOut}
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <button 
            className="text-xs font-medium w-14 text-center tabular-nums hover:bg-accent rounded px-1 py-0.5"
            onClick={() => setZoom(100)}
            title="Reset to 100%"
          >
            {zoom}%
          </button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            title="Zoom In"
            onClick={handleZoomIn}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
