import { useState } from "react";
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
  Shield,
  Crown,
  Pencil,
  Eye,
  Trash2,
  Copy,
  Check,
  Loader2,
  Clock,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/hooks/useWorkspace";

type Role = "owner" | "admin" | "editor" | "viewer";

const ROLE_CONFIG: Record<Role, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: "Owner", icon: Crown, color: "text-amber-500" },
  admin: { label: "Admin", icon: Shield, color: "text-primary" }, // legacy, hidden from UI
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
  const { members, invitations, isLoading, sendInvite, removeMember, updateMemberRole, cancelInvitation } = useWorkspace();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("editor");
  const [isSending, setIsSending] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentUserMember = members.find(m => m.email === userEmail || m.email === "you");
  const isAdmin = currentUserMember?.role === "owner";

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({ title: "Missing email", description: "Please enter an email address.", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      await sendInvite(inviteEmail, inviteRole);
      toast({
        title: "Invitation sent",
        description: `An invite has been sent to ${inviteEmail} as ${ROLE_CONFIG[inviteRole].label}.`,
      });
      setInviteEmail("");
    } catch (err: any) {
      toast({
        title: "Failed to send invite",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/workspace`);
    setCopiedLink(true);
    toast({ title: "Link copied", description: "Invite link copied to clipboard." });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
      toast({ title: "Member removed" });
    } catch {
      toast({ title: "Failed to remove member", variant: "destructive" });
    }
  };

  const handleCancelInvite = async (invId: string) => {
    try {
      await cancelInvitation(invId);
      toast({ title: "Invitation cancelled" });
    } catch {
      toast({ title: "Failed to cancel invitation", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Workspace
          </DialogTitle>
          <DialogDescription>
            Invite team members and manage access to your business workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Invite Section - only for admins/owners */}
          {isAdmin && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite People
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

          {/* Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Members
              </Label>
              <span className="text-xs text-muted-foreground">
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-1.5">
                {members.map((member) => {
                  const roleConfig = ROLE_CONFIG[member.role];
                  const RoleIcon = roleConfig.icon;
                  const isCurrentUser = member.email === userEmail || member.email === "you";
                  const displayEmail = isCurrentUser ? userEmail : member.email;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {displayEmail.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {isCurrentUser ? "You" : displayEmail.split("@")[0]}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isAdmin && member.role !== "owner" && !isCurrentUser ? (
                          <Select
                            value={member.role}
                            onValueChange={(v) => updateMemberRole(member.id, v as Role)}
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
                        {isAdmin && member.role !== "owner" && !isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveMember(member.id)}
                          >
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

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Invitations
                </Label>
                <div className="space-y-1.5">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10"
                    >
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
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleCancelInvite(inv.id)}
                        >
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
              {Object.entries(ROLE_CONFIG)
                .filter(([key]) => key !== "admin")
                .map(([key, config]) => {
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
