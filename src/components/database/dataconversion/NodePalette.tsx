import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { nodeIconMap, type NodeItem } from "./types";

const quickAccessNodes: NodeItem[] = [
  { id: "business-db", label: "Business Database", description: "Synced business data" },
  { id: "leads", label: "Leads", description: "Lead generation" },
  { id: "text", label: "Text", description: "Text input" },
  { id: "document", label: "Document", description: "Documents" },
  { id: "image", label: "Image", description: "Visual assets" },
  { id: "website", label: "Website", description: "Web data" },
];

const researchNode: NodeItem = {
  id: "research",
  label: "Research",
  description: "AI chat for data analysis",
};

const actionNode: NodeItem = {
  id: "action",
  label: "Generation",
  description: "Execute from research",
};

interface NodeItemCardProps {
  item: NodeItem;
  onDragStart?: (e: React.DragEvent, item: NodeItem) => void;
}

function NodeItemCard({ item, onDragStart }: NodeItemCardProps) {
  const Icon = nodeIconMap[item.id];
  const isNew = item.id === "leads";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, item)}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-lg cursor-grab active:cursor-grabbing",
        "bg-transparent border border-border hover:border-primary hover:bg-card/30",
        "transition-all duration-200",
        "w-[106px] h-[106px]"
      )}
    >
      {isNew && (
        <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
          NEW
        </span>
      )}
      <div className="flex items-center justify-center h-10 w-10">
        {Icon && <Icon className="text-primary h-5 w-5" />}
      </div>
      <p className="text-xs font-medium text-center leading-tight px-1">{item.label}</p>
    </div>
  );
}

interface MainNodeCardProps {
  item: NodeItem;
  onDragStart?: (e: React.DragEvent, item: NodeItem) => void;
  variant?: "research" | "action";
}

function MainNodeCard({ item, onDragStart, variant = "research" }: MainNodeCardProps) {
  const Icon = nodeIconMap[item.id];
  const isAction = variant === "action";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, item)}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg cursor-grab active:cursor-grabbing",
        "bg-transparent border border-border hover:border-primary hover:bg-card/30",
        "transition-all duration-200",
        "w-[106px] h-[106px]"
      )}
    >
      <div className="h-10 w-10 flex items-center justify-center">
        {Icon && <Icon className={cn("h-5 w-5", isAction ? "text-accent-foreground" : "text-primary")} />}
      </div>
      <div className="text-center px-1">
        <p className="text-xs font-medium">{item.label}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{item.description}</p>
      </div>
    </div>
  );
}

interface NodePaletteProps {
  onNodeDragStart?: (e: React.DragEvent, item: NodeItem) => void;
}

export function NodePalette({ onNodeDragStart }: NodePaletteProps) {
  return (
    <div className="w-[260px] border-r border-border bg-card/30 flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h2 className="font-semibold text-sm">Node Library</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Drag nodes onto the canvas</p>
      </div>
      
      <ScrollArea className="flex-1">
        {/* Quick Access Section */}
        <div className="border-b border-border/50">
          <div className="px-3 py-2">
            <span className="text-sm font-semibold">Quick Access</span>
          </div>
          <div className="px-3 pb-3 grid grid-cols-2 gap-2">
            {quickAccessNodes.map((item) => (
              <NodeItemCard 
                key={item.id} 
                item={item} 
                onDragStart={onNodeDragStart}
              />
            ))}
          </div>
        </div>

        {/* Research & Action Side by Side */}
        <div className="p-3">
          <p className="text-sm font-semibold mb-2">AI Chats</p>
          <div className="flex gap-2">
            <MainNodeCard 
              item={researchNode} 
              onDragStart={onNodeDragStart}
              variant="research"
            />
            <MainNodeCard 
              item={actionNode} 
              onDragStart={onNodeDragStart}
              variant="action"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
