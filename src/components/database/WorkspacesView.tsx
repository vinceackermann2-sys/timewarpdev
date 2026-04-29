import { useState } from "react";
import { Plus, Building2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WorkspaceFooter } from "@/components/database/WorkspaceFooter";
import { WorkspaceDetailView } from "@/components/database/WorkspaceDetailView";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface WorkspacesViewProps {
  onBack?: () => void;
}

export function WorkspacesView({ onBack }: WorkspacesViewProps) {
  const { user } = useAuth();
  const {
    workspaces,
    activeWorkspaceId,
    selectWorkspace,
    createWorkspace,
    isLoading,
  } = useWorkspace();

  const [managingWsId, setManagingWsId] = useState<string | null>(null);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const id = await createWorkspace(newName.trim());
      selectWorkspace(id);
      setNewName("");
      setShowNewInput(false);
    } finally {
      setCreating(false);
    }
  };

  const roleBadgeVariant = (role: string) => {
    if (role === "owner") return "default" as const;
    return "secondary" as const;
  };

  // Show detail view when managing a workspace
  const managingWs = managingWsId ? workspaces.find(w => w.workspaceId === managingWsId) : null;
  if (managingWs) {
    return (
      <WorkspaceDetailView
        workspaceId={managingWs.workspaceId}
        workspaceName={managingWs.workspaceName}
        memberCount={managingWs.memberCount}
        userRole={managingWs.role}
        onBack={() => setManagingWsId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      {/* Header */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 inline-block"
          >
            ← Back
          </button>
        )}
        <h1 className="text-3xl font-bold text-foreground">Workspaces</h1>
        <p className="text-muted-foreground mt-1">
          Manage your workspaces and team members.
        </p>
      </div>

      {/* Table */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex-1">
        <div>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm font-medium text-muted-foreground">
              {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
            </span>
            {showNewInput ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Workspace name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  className="h-9 w-52"
                  autoFocus
                />
                <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowNewInput(false); setNewName(""); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowNewInput(true)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input h-9 rounded-md px-3 text-white bg-primary">
                <Plus className="h-4 w-4 mr-1" />
                New workspace
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="rounded-tl-xl">Workspace</TableHead>
                  <TableHead>Your Role</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="text-right rounded-tr-xl" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspaces.map((ws) => (
                  <TableRow
                    key={ws.workspaceId}
                    className={cn("rounded-xl overflow-hidden [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl", ws.workspaceId === activeWorkspaceId ? "bg-muted/40" : "")}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-card">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{ws.workspaceName}</p>
                          <p className="text-xs text-muted-foreground">
                            Created {new Date(ws.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(ws.role)} className="capitalize">
                        {ws.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {ws.memberCount} member{ws.memberCount !== 1 ? "s" : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setManagingWsId(ws.workspaceId)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Manage <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16">
        <WorkspaceFooter compact />
      </div>

    </div>
  );
}
