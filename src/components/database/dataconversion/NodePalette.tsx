import { useState, useEffect } from "react";
import { Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessDNA } from "@/components/database/BusinessDNAContext";
import { nodeIconMap, type NodeItem } from "./types";

const quickAccessNodes: NodeItem[] = [
  { id: "business-db", label: "Business Database", description: "Synced business data" },
  { id: "text", label: "Text", description: "Text input" },
  { id: "document", label: "Document", description: "Documents" },
  { id: "image", label: "Image", description: "Visual assets" },
  { id: "website", label: "URL", description: "Any URL" },
];

const researchNode: NodeItem = {
  id: "research",
  label: "Research Chat",
  description: "",
};

const actionNode: NodeItem = {
  id: "action",
  label: "Generation Chat",
  description: "",
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
        {Icon && <Icon className="text-foreground h-5 w-5" />}
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
        {Icon && <Icon className="h-5 w-5 text-foreground" />}
      </div>
      <p className="text-xs font-medium text-center px-1">{item.label}</p>
    </div>
  );
}

interface NodePaletteProps {
  onNodeDragStart?: (e: React.DragEvent, item: NodeItem) => void;
}

export function NodePalette({ onNodeDragStart }: NodePaletteProps) {
  const { brands, isLoading: brandsLoading } = useBusinessDNA();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(() => {
    return localStorage.getItem("preferred_business_id");
  });

  // Persist selected business to localStorage and trigger storage event for other components
  useEffect(() => {
    if (selectedBrandId) {
      localStorage.setItem("preferred_business_id", selectedBrandId);
    } else {
      localStorage.removeItem("preferred_business_id");
    }
    window.dispatchEvent(new Event("storage"));
  }, [selectedBrandId]);

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
        <div className="p-3 border-b border-border/50">
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

        {/* Workspace & Business Selector */}
        <div className="p-3 space-y-3">
          {/* Workspace List */}
          <div>
            <p className="text-sm font-semibold mb-2">Workspace</p>
            <div className="space-y-1">
              {workspacesLoading ? (
                <>
                  {[1, 2].map(i => (
                    <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
                      <Skeleton className="h-7 w-7 rounded-md" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-2.5 w-16" />
                      </div>
                    </div>
                  ))}
                </>
              ) : workspaces.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No workspaces</p>
              ) : (
                workspaces.map(ws => (
                  <button
                    key={ws.workspaceId}
                    onClick={() => selectWorkspace(ws.workspaceId)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150",
                      activeWorkspaceId === ws.workspaceId
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-accent/50 border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "h-7 w-7 rounded-md flex items-center justify-center shrink-0 text-xs font-bold",
                      activeWorkspaceId === ws.workspaceId
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {ws.workspaceName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{ws.workspaceName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {ws.role === "owner" ? "Owner" : "Member"} · {ws.memberCount} {ws.memberCount === 1 ? "member" : "members"}
                      </p>
                    </div>
                    {activeWorkspaceId === ws.workspaceId && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Business List */}
          <div>
            <p className="text-sm font-semibold mb-2">Business</p>
            <div className="space-y-1">
              {brandsLoading ? (
                <>
                  {[1, 2].map(i => (
                    <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
                      <Skeleton className="h-7 w-7 rounded-md" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-2.5 w-14" />
                      </div>
                    </div>
                  ))}
                </>
              ) : brands.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No businesses added yet</p>
              ) : (
                brands.map(brand => (
                  <button
                    key={brand.id}
                    onClick={() => setSelectedBrandId(brand.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150",
                      selectedBrandId === brand.id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-accent/50 border border-transparent"
                    )}
                  >
                    <div className="h-7 w-7 rounded-md bg-muted/60 border border-border/40 flex items-center justify-center shrink-0 overflow-hidden">
                      {brand.logoUrls && brand.logoUrls.length > 0 ? (
                        <img
                          src={brand.logoUrls[brand.selectedLogo ?? 0]}
                          alt={brand.name}
                          className="h-full w-full object-contain p-0.5"
                        />
                      ) : (
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{brand.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {brand.category || "Business"}
                      </p>
                    </div>
                    {selectedBrandId === brand.id && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
