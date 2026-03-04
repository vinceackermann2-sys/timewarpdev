import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  UserPlus,
  Mail,
  Crown,
  Pencil,
  Eye,
  Trash2,
  Loader2,
  Clock,
  X,
  Plus,
  Building2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useWorkspace, WorkspaceMember, WorkspaceInvitation } from "@/hooks/useWorkspace";

type Role = "owner" | "editor" | "viewer";

const ROLE_CONFIG: Record<Role, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: "Owner", icon: Crown, color: "text-amber-500" },
  editor: { label: "Editor", icon: Pencil, color: "text-emerald-500" },
  viewer: { label: "Viewer", icon: Eye, color: "text-muted-foreground" },
};

interface WorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export function WorkspaceDialog({ open, onOpenChange, userEmail }: WorkspaceDialogProps) {
  const { toast } = useToast();
  const {
    workspaces, createWorkspace, sendInvite, removeMember, updateMemberRole,
    cancelInvitation, loadMembersForWorkspace, isLoading: wsLoading,
  } = useWorkspace();

  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [wsMemberData, setWsMemberData] = useState<{ members: WorkspaceMember[]; invitations: WorkspaceInvitation[] }>({ members: [], invitations: [] });
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("editor");
  const [isSending, setIsSending] = useState(false);
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [newWsName, setNewWsName] = useState("");

  // When opening the dialog, reset to list view
  useEffect(() => {
    if (open) {
      setSelectedWsId(null);
      setShowCreateWs(false);
    }
  }, [open]);

  // Load members when a workspace is selected
  useEffect(() => {
    if (!selectedWsId) return;
    setLoadingMembers(true);
    loadMembersForWorkspace(selectedWsId).then(data => {
      setWsMemberData(data);
      setLoadingMembers(false);
    });
  }, [selectedWsId, loadMembersForWorkspace]);

  const selectedWs = workspaces.find(w => w.workspaceId === selectedWsId);
  const isOwnerOfSelected = selectedWs?.role === "owner";

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedWsId) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      await sendInvite(inviteEmail, inviteRole, selectedWsId);
      toast({ title: "Invitation sent", description: `Invited ${inviteEmail} as ${ROLE_CONFIG[inviteRole].label}.` });
      setInviteEmail("");
      // Refresh members
      const data = await loadMembersForWorkspace(selectedWsId);
      setWsMemberData(data);
    } catch (err: any) {
      toast({ title: "Failed to send invite", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedWsId) return;
    try {
      await removeMember(memberId, selectedWsId);
      const data = await loadMembersForWorkspace(selectedWsId);
      setWsMemberData(data);
      toast({ title: "Member removed" });
    } catch {
      toast({ title: "Failed to remove member", variant: "destructive" });
    }
  };

  const handleCancelInvite = async (invId: string) => {
    if (!selectedWsId) return;
    try {
      await cancelInvitation(invId, selectedWsId);
      const data = await loadMembersForWorkspace(selectedWsId);
      setWsMemberData(data);
      toast({ title: "Invitation cancelled" });
    } catch {
      toast({ title: "Failed to cancel invitation", variant: "destructive" });
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: Role) => {
    if (!selectedWsId) return;
    await updateMemberRole(memberId, newRole, selectedWsId);
    const data = await loadMembersForWorkspace(selectedWsId);
    setWsMemberData(data);
  };

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    try {
      await createWorkspace(newWsName.trim());
      setShowCreateWs(false);
      setNewWsName("");
      toast({ title: "Workspace created" });
    } catch (err: any) {
      toast({ title: "Failed to create workspace", description: err.message, variant: "destructive" });
    }
  };

  // ── Workspace Detail View ──
  if (selectedWsId && selectedWs) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedWsId(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {selectedWs.workspaceName}
              <span className={cn("text-xs font-medium ml-1", ROLE_CONFIG[selectedWs.role].color)}>
                ({ROLE_CONFIG[selectedWs.role].label})
              </span>
            </DialogTitle>
            <DialogDescription>
              {isOwnerOfSelected ? "Manage team members and invitations." : "View team members."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Invite Section - owners only */}
            {isOwnerOfSelected && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <UserPlus className="h-4 w-4" /> Invite People
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="name@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="pl-9"
                        onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                        disabled={isSending}
                      />
                    </div>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                      <SelectTrigger className="w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleInvite} disabled={isSending}>
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
                    </Button>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Members */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" /> Team Members
                </Label>
                <span className="text-xs text-muted-foreground">
                  {wsMemberData.members.length} {wsMemberData.members.length === 1 ? "member" : "members"}
                </span>
              </div>

              {loadingMembers ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {wsMemberData.members.map((member) => {
                    const roleConfig = ROLE_CONFIG[member.role];
                    const RoleIcon = roleConfig.icon;
                    const isCurrentUser = member.email === userEmail;

                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-sm font-semibold text-primary">
                              {member.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {isCurrentUser ? "You" : member.email.split("@")[0]}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isOwnerOfSelected && member.role !== "owner" && !isCurrentUser ? (
                            <Select
                              value={member.role}
                              onValueChange={(v) => handleUpdateRole(member.id, v as Role)}
                            >
                              <SelectTrigger className="h-7 w-[100px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className={cn("flex items-center gap-1.5 text-xs font-medium", roleConfig.color)}>
                              <RoleIcon className="h-3.5 w-3.5" />
                              {roleConfig.label}
                            </div>
                          )}
                          {isOwnerOfSelected && member.role !== "owner" && !isCurrentUser && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveMember(member.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pending Invitations - owners only */}
            {isOwnerOfSelected && wsMemberData.invitations.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Pending Invitations
                  </Label>
                  <div className="space-y-1.5">
                    {wsMemberData.invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-muted/40 flex items-center justify-center shrink-0">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{inv.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Invited as {ROLE_CONFIG[inv.role]?.label || inv.role}
                            </p>
                          </div>
                        </div>
                        {isOwnerOfSelected && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleCancelInvite(inv.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Roles Explanation */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Role Permissions</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon className={cn("h-3.5 w-3.5", config.color)} />
                      <span>
                        <span className="font-medium text-foreground">{config.label}</span>
                        {key === "owner" && " — Full control"}
                        {key === "editor" && " — Edit Business DNA"}
                        {key === "viewer" && " — View only"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Workspace List View ──
  const ownedWs = workspaces.filter(w => w.role === "owner");
  const sharedWs = workspaces.filter(w => w.role !== "owner");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Workspaces
          </DialogTitle>
          <DialogDescription>
            Manage your workspaces and team collaboration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Create Workspace */}
          {showCreateWs ? (
            <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-muted/20">
              <Label className="text-sm font-semibold">New Workspace</Label>
              <Input
                placeholder="Workspace name"
                value={newWsName}
                onChange={e => setNewWsName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreateWorkspace()}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowCreateWs(false); setNewWsName(""); }}>Cancel</Button>
                <Button size="sm" onClick={handleCreateWorkspace} disabled={!newWsName.trim()}>Create</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full gap-2" onClick={() => setShowCreateWs(true)}>
              <Plus className="h-4 w-4" /> Create Workspace
            </Button>
          )}

          {wsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* My Workspaces */}
              {ownedWs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">My Workspaces</Label>
                  <div className="space-y-1.5">
                    {ownedWs.map(ws => (
                      <WorkspaceListItem key={ws.workspaceId} ws={ws} onClick={() => setSelectedWsId(ws.workspaceId)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Shared with me */}
              {sharedWs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Shared with me</Label>
                  <div className="space-y-1.5">
                    {sharedWs.map(ws => (
                      <WorkspaceListItem key={ws.workspaceId} ws={ws} onClick={() => setSelectedWsId(ws.workspaceId)} />
                    ))}
                  </div>
                </div>
              )}

              {workspaces.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">No workspaces yet.</p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceListItem({ ws, onClick }: { ws: { workspaceId: string; workspaceName: string; role: Role; memberCount: number }; onClick: () => void }) {
  const roleConfig = ROLE_CONFIG[ws.role];
  const RoleIcon = roleConfig.icon;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
    >
      <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Building2 className="h-4 w-4 text-primary/70" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{ws.workspaceName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn("flex items-center gap-1 text-xs font-medium", roleConfig.color)}>
            <RoleIcon className="h-3 w-3" />
            {roleConfig.label}
          </span>
          <span className="text-xs text-muted-foreground">
            · {ws.memberCount} {ws.memberCount === 1 ? "member" : "members"}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
