import { useState, useCallback } from "react";
import { NodePalette, type NodeItem } from "./dataconversion/NodePalette";
import { WhiteboardCanvas } from "./dataconversion/WhiteboardCanvas";
import { Play, Save, Undo, Redo, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DataConversionView() {
  const [draggedNode, setDraggedNode] = useState<NodeItem | null>(null);

  const handleNodeDragStart = useCallback((item: NodeItem) => {
    setDraggedNode(item);
  }, []);

  const handleCanvasDrop = useCallback((item: NodeItem, x: number, y: number) => {
    console.log("Dropped node:", draggedNode, "at", x, y);
    setDraggedNode(null);
  }, [draggedNode]);

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="h-12 border-b border-border flex items-center px-4 gap-2 bg-card/50">
        <span className="text-sm font-medium">Data Conversion</span>
        <span className="text-xs text-muted-foreground ml-2">• Workflow Builder</span>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Redo className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="sm" className="h-8">
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button size="sm" className="h-8">
            <Play className="h-4 w-4 mr-1" />
            Run
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <NodePalette onNodeDragStart={handleNodeDragStart} />
        <WhiteboardCanvas onDrop={handleCanvasDrop} />
      </div>
    </div>
  );
}
