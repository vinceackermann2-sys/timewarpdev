import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { WorkspaceDialog } from "@/components/database/WorkspaceDialog";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";

export default function Workspaces() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
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

  // Redirect unauthenticated users
  if (!authLoading && !user) {
    navigate("/auth");
    return null;
  }

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
    if (role === "owner") return "default";
    return "secondary";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-6">
        <button
          onClick={() => navigate("/app")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 inline-block"
        >
          ← Back to app
        </button>
        <h1 className="text-3xl font-bold text-foreground">Workspaces</h1>
        <p className="text-muted-foreground mt-1">
          Manage your workspaces and team members.
        </p>
      </div>

      {/* Table */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex-1">
        <div className="rounded-xl border border-border bg-card">
          {/* Table toolbar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
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
              <Button size="sm" variant="outline" onClick={() => setShowNewInput(true)}>
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
                  <TableHead>Workspace</TableHead>
                  <TableHead>Your Role</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspaces.map((ws) => (
                  <TableRow
                    key={ws.workspaceId}
                    className={ws.workspaceId === activeWorkspaceId ? "bg-muted/40" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
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
        <WorkspaceFooter />
      </div>

      {/* Workspace manage dialog */}
      {managingWsId && (
        <WorkspaceDialog
          open={!!managingWsId}
          onOpenChange={(open) => { if (!open) setManagingWsId(null); }}
          workspaceId={managingWsId}
        />
      )}
    </div>
  );
}
