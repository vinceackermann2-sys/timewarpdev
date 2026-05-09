import { useCallback } from "react";
import { NodePalette } from "./dataconversion/NodePalette";
import { WhiteboardCanvas } from "./dataconversion/WhiteboardCanvas";
import { type NodeItem } from "./dataconversion/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Monitor } from "lucide-react";

export function DataConversionView() {
  const isMobile = useIsMobile();

  const handleNodeDragStart = useCallback((e: React.DragEvent, item: NodeItem) => {
    const nodeData = {
      id: item.id,
      label: item.label,
      description: item.description,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(nodeData));
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleCanvasDrop = useCallback((item: NodeItem, x: number, y: number) => {
    console.log("Node added to canvas:", item.label, "at", x, y);
  }, []);

  if (isMobile) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 p-8 text-center bg-background">
        <Monitor className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Desktop Required</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          The Data Conversion canvas requires a desktop browser for the best experience.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex bg-background">
      <NodePalette onNodeDragStart={handleNodeDragStart} />
      <WhiteboardCanvas onDrop={handleCanvasDrop} />
    </div>
  );
}
