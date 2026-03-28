import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, UserPlus, MoreHorizontal, Loader2, Trash2, Pencil, X,
} from "lucide-react";
import { useWorkspace, WorkspaceMember, WorkspaceInvitation } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Role = "owner" | "editor";

interface WorkspaceDetailViewProps {
  workspaceId: string;
  workspaceName: string;
  memberCount: number;
  userRole: string;
  onBack: () => void;
}

function getDisplayName(email: string): string {
  if (!email || email === "unknown") return "Unknown User";
  const local = email.split("@")[0];
  return local.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export function WorkspaceDetailView({
  workspaceId, workspaceName, memberCount, userRole, onBack,
}: WorkspaceDetailViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    sendInvite, removeMember, updateMemberRole, cancelInvitation,
    renameWorkspace, deleteWorkspace, loadMembersForWorkspace,
  } = useWorkspace();

  const [tab, setTab] = useState<"users" | "invites">("users");
  const [filter, setFilter] = useState("");
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("editor");
  const [showInvite, setShowInvite] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(workspaceName);

  const isOwner = userRole === "owner";

  const refreshData = async () => {
    const data = await loadMembersForWorkspace(workspaceId);
    setMembers(data.members);
    setInvitations(data.invitations);
  };

  useEffect(() => {
    setLoading(true);
    refreshData().finally(() => setLoading(false));
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredMembers = useMemo(() => {
    if (!filter) return members;
    const q = filter.toLowerCase();
    return members.filter(m =>
      m.email.toLowerCase().includes(q) || getDisplayName(m.email).toLowerCase().includes(q)
    );
  }, [members, filter]);

  const filteredInvitations = useMemo(() => {
    if (!filter) return invitations;
    const q = filter.toLowerCase();
    return invitations.filter(i => i.email.toLowerCase().includes(q));
  }, [invitations, filter]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      await sendInvite(inviteEmail, inviteRole, workspaceId);
      toast({ title: "Invitation sent", description: `Invited ${inviteEmail} as ${inviteRole}.` });
      setInviteEmail("");
      setShowInvite(false);
      await refreshData();
    } catch (err: any) {
      toast({ title: "Failed to send invite", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleRename = async () => {
    if (!editName.trim()) return;
    try {
      await renameWorkspace(workspaceId, editName.trim());
      setEditingName(false);
      toast({ title: "Workspace renamed" });
    } catch {
      toast({ title: "Failed to rename", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteWorkspace(workspaceId);
      toast({ title: "Workspace deleted" });
      onBack();
    } catch {
      toast({ title: "Failed to delete workspace", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <div className="mb-6">
          {editingName ? (
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">Workspace</h1>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setEditingName(false);
                }}
                className="h-8 w-56 text-sm"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleRename}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>Cancel</Button>
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-foreground">Workspace</h1>
          )}
          <p className="text-muted-foreground mt-1">
            {editingName ? "" : workspaceName} · {memberCount} member{memberCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ← All workspaces */}
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 inline-block"
        >
          ← All workspaces
        </button>

        {/* Tabs */}
        <div className="flex items-center gap-6 mb-4 border-b border-border">
          <button
            onClick={() => setTab("users")}
            className={`pb-2.5 text-sm font-medium transition-colors relative ${
              tab === "users"
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setTab("invites")}
            className={`pb-2.5 text-sm font-medium transition-colors relative ${
              tab === "invites"
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending invites
          </button>
        </div>

        {/* Filter + actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by name or email"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Button size="sm" onClick={() => setShowInvite(true)}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                Invite member
              </Button>
            )}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="h-9 w-9">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditName(workspaceName); setEditingName(true); }}>
                    <Pencil className="h-4 w-4 mr-2" /> Rename workspace
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete workspace
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Invite inline form */}
      {showInvite && (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-4">
          <div className="flex items-center gap-2 p-4 rounded-xl border border-border bg-muted/30">
            <Input
              placeholder="name@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              className="flex-1 h-9"
              autoFocus
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleInvite} disabled={isSending}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowInvite(false); setInviteEmail(""); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex-1">
        <div className="rounded-xl border border-border bg-card">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tab === "users" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Account type</TableHead>
                  <TableHead>Date added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => {
                  const isCurrentUser = member.email === user?.email || (member.email === "unknown" && member.role === "owner");
                  const displayName = isCurrentUser
                    ? `${getDisplayName(user?.email || member.email)} (You)`
                    : getDisplayName(member.email);
                  const displayEmail = isCurrentUser ? (user?.email || "") : (member.email !== "unknown" ? member.email : "");
                  const initials = getInitials(displayName.replace(" (You)", ""));

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-muted-foreground">{initials}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{displayName}</p>
                            {displayEmail && (
                              <p className="text-xs text-muted-foreground">{displayEmail}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={member.role === "owner" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {member.role === "owner" ? "Owner" : "Editor"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(member.joinedAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {isOwner && member.role !== "owner" && !isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={async () => {
                              await removeMember(member.id, workspaceId);
                              await refreshData();
                              toast({ title: "Member removed" });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <span className="text-sm font-medium">{inv.email}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{inv.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            await cancelInvitation(inv.id, workspaceId);
                            await refreshData();
                            toast({ title: "Invitation cancelled" });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredInvitations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No pending invitations.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
