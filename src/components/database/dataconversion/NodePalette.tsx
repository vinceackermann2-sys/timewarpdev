import { useState } from "react";
import { 
  Search,
  Zap,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { nodeIconMap, type NodeItem } from "./types";

const quickAccessNodes: NodeItem[] = [
  { id: "business-db", label: "Business Database", description: "Synced business data" },
  { id: "text", label: "Text", description: "Text input" },
  { id: "document", label: "Document", description: "Documents" },
  { id: "image", label: "Image", description: "Visual assets" },
  { id: "website", label: "Website", description: "Web data" },
];

const researchNode: NodeItem = {
  id: "research",
  label: "Research",
  description: "Analyze business data",
  templates: [
    "Analyze email patterns",
    "Map contact relationships", 
    "Extract meeting insights",
    "Identify data trends",
    "Find unanswered messages",
    "Track market sentiment"
  ]
};

const actionNode: NodeItem = {
  id: "action",
  label: "Action",
  description: "Execute from research",
  templates: [
    "Execute follow-ups from analysis",
    "Generate report from findings",
    "Send summary to stakeholders",
    "Create goals from insights",
    "Automate data entry",
    "Schedule based on analysis"
  ]
};

interface NodeItemCardProps {
  item: NodeItem;
  onDragStart?: (e: React.DragEvent, item: NodeItem) => void;
  compact?: boolean;
}

function NodeItemCard({ item, onDragStart, compact }: NodeItemCardProps) {
  const Icon = nodeIconMap[item.id];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, item)}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-lg cursor-grab active:cursor-grabbing",
        "bg-card/50 border border-border/50 hover:border-primary/50 hover:bg-card",
        "transition-all duration-200",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className={cn(
        "rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0",
        compact ? "h-8 w-8" : "h-10 w-10"
      )}>
        {Icon && <Icon className={cn("text-primary", compact ? "h-4 w-4" : "h-5 w-5")} />}
      </div>
      <p className={cn("font-medium text-center leading-tight", compact ? "text-xs" : "text-sm")}>{item.label}</p>
    </div>
  );
}

interface MainNodeCardProps {
  item: NodeItem;
  onDragStart?: (e: React.DragEvent, item: NodeItem) => void;
  variant?: "research" | "action";
}

function MainNodeCard({ item, onDragStart, variant = "research" }: MainNodeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = nodeIconMap[item.id];
  const isAction = variant === "action";

  return (
    <div 
      className="relative flex-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Templates popup - positioned ABOVE */}
      {isHovered && item.templates && item.templates.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-50 animate-fade-in">
          <div className="bg-popover border border-border rounded-lg shadow-xl p-3 mx-1">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className={cn("h-3 w-3", isAction ? "text-accent-foreground" : "text-primary")} />
              {isAction ? "Research-Based Actions" : "Business Data Templates"}
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {item.templates.map((template, idx) => (
                <button
                  key={idx}
                  className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent transition-colors"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main node card */}
      <div
        draggable
        onDragStart={(e) => onDragStart?.(e, item)}
        className={cn(
          "flex flex-col items-center gap-2 p-4 rounded-lg cursor-grab active:cursor-grabbing",
          "bg-card/50 border border-border/50 hover:border-primary/50 hover:bg-card",
          "transition-all duration-200 h-full"
        )}
      >
        <div className={cn(
          "h-12 w-12 rounded-lg flex items-center justify-center",
          isAction ? "bg-accent/20" : "bg-primary/10"
        )}>
          {Icon && <Icon className={cn("h-6 w-6", isAction ? "text-accent-foreground" : "text-primary")} />}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">{item.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
        </div>
      </div>
    </div>
  );
}

interface NodePaletteProps {
  onNodeDragStart?: (e: React.DragEvent, item: NodeItem) => void;
}

export function NodePalette({ onNodeDragStart }: NodePaletteProps) {
  const [quickAccessOpen, setQuickAccessOpen] = useState(true);

  return (
    <div className="w-72 border-r border-border bg-card/30 flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h2 className="font-semibold text-sm">Node Library</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Drag nodes onto the canvas</p>
      </div>
      
      <ScrollArea className="flex-1">
        {/* Quick Access Section */}
        <div className="border-b border-border/50">
          <button
            onClick={() => setQuickAccessOpen(!quickAccessOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors"
          >
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium flex-1 text-left">Quick Access</span>
            <ChevronDown className={cn(
              "h-3 w-3 text-muted-foreground transition-transform",
              !quickAccessOpen && "-rotate-90"
            )} />
          </button>
          
          {quickAccessOpen && (
            <div className="px-3 pb-3 grid grid-cols-2 gap-2 animate-fade-in">
              {quickAccessNodes.map((item) => (
                <NodeItemCard 
                  key={item.id} 
                  item={item} 
                  onDragStart={onNodeDragStart}
                  compact
                />
              ))}
            </div>
          )}
        </div>

        {/* Research & Action Side by Side */}
        <div className="p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Workflow Nodes</p>
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
