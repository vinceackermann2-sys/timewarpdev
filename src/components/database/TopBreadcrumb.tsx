import { useState } from "react";
import { ChevronsUpDown, Check, Search, Plus, PanelLeft } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSidebar } from "@/components/ui/sidebar";
import { useWorkspace } from "@/hooks/useWorkspace";

type View = "aiceo" | "businessdna" | "employees" | "workspaces" | "connections" | "manage";

const VIEW_LABELS: Record<View, string> = {
  aiceo: "AI CEO",
  businessdna: "Business DNA",
  employees: "Assistant",
  workspaces: "Workspaces",
  connections: "Connectors",
  manage: "Dashboard",
};

interface TopBreadcrumbProps {
  currentView: View;
}

export function TopBreadcrumb({ currentView }: TopBreadcrumbProps) {
  const { workspaces, activeWorkspaceId, activeWorkspace, selectWorkspace, createWorkspace } = useWorkspace();
  const { toggleSidebar } = useSidebar();
  const [wsOpen, setWsOpen] = useState(false);
  const [wsSearch, setWsSearch] = useState("");
  const [showNewWs, setShowNewWs] = useState(false);
  const [newWsName, setNewWsName] = useState("");

  return (
    <div className="hidden md:flex items-center gap-2 px-4 h-10 border-b border-border bg-sidebar text-sm shrink-0">
      <button
        onClick={toggleSidebar}
        className="p-1 rounded-md hover:bg-primary/10 transition-colors"
        title="Toggle sidebar"
      >
        <PanelLeft className="h-4 w-4 text-muted-foreground" />
      </button>

      <Popover open={wsOpen} onOpenChange={setWsOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-muted/50 transition-colors text-foreground font-medium">
            {activeWorkspace?.workspaceName || "Workspace"}
            <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 p-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Find workspace..."
              value={wsSearch}
              onChange={(e) => setWsSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="py-1.5 max-h-[240px] overflow-y-auto">
            {workspaces
              .filter(ws => ws.workspaceName.toLowerCase().includes(wsSearch.toLowerCase()))
              .map(ws => (
                <button
                  key={ws.workspaceId}
                  onClick={() => { selectWorkspace(ws.workspaceId); setWsOpen(false); setWsSearch(""); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 transition-colors text-sm"
                >
                  <span className="truncate flex-1 text-left">{ws.workspaceName}</span>
                  {ws.workspaceId === activeWorkspaceId && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))}
          </div>
          <div className="border-t border-border/50 py-1">
            {showNewWs ? (
              <div className="px-3 py-1.5">
                <input
                  type="text"
                  placeholder="Workspace name"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && newWsName.trim()) {
                      const id = await createWorkspace(newWsName.trim());
                      selectWorkspace(id);
                      setNewWsName("");
                      setShowNewWs(false);
                      setWsOpen(false);
                    }
                  }}
                  autoFocus
                  className="w-full bg-transparent text-sm outline-none border-b border-border pb-0.5 placeholder:text-muted-foreground"
                />
              </div>
            ) : (
              <button
                onClick={() => setShowNewWs(true)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add workspace
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground">/</span>
      <span className="text-foreground font-medium">{VIEW_LABELS[currentView]}</span>
    </div>
  );
}
