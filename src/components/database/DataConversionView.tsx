import { useCallback } from "react";
import { NodePalette } from "./dataconversion/NodePalette";
import { WhiteboardCanvas } from "./dataconversion/WhiteboardCanvas";
import { type NodeItem } from "./dataconversion/types";

export function DataConversionView() {
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

  return (
    <div className="h-full w-full flex bg-background">
      <NodePalette onNodeDragStart={handleNodeDragStart} />
      <WhiteboardCanvas onDrop={handleCanvasDrop} />
    </div>
  );
}
