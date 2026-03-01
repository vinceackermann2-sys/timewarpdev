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
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Role = "owner" | "admin" | "editor" | "viewer";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarInitial: string;
  status: "active" | "pending";
}

const ROLE_CONFIG: Record<Role, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: "Owner", icon: Crown, color: "text-amber-500" },
  admin: { label: "Admin", icon: Shield, color: "text-primary" },
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("editor");
  const [copiedLink, setCopiedLink] = useState(false);
  const [members] = useState<TeamMember[]>([
    {
      id: "1",
      email: userEmail,
      name: "You",
      role: "owner",
      avatarInitial: userEmail.charAt(0).toUpperCase(),
      status: "active",
    },
  ]);

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast({ title: "Missing email", description: "Please enter an email address.", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    toast({
      title: "Invitation sent",
      description: `An invite has been sent to ${inviteEmail} as ${ROLE_CONFIG[inviteRole].label}.`,
    });
    setInviteEmail("");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/workspace`);
    setCopiedLink(true);
    toast({ title: "Link copied", description: "Invite link copied to clipboard." });
    setTimeout(() => setCopiedLink(false), 2000);
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
          {/* Invite Section */}
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
                />
              </div>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} size="default">
                Invite
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={handleCopyLink}
            >
              {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedLink ? "Copied!" : "Copy invite link"}
            </Button>
          </div>

          <Separator />

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

            <div className="space-y-1.5">
              {members.map((member) => {
                const roleConfig = ROLE_CONFIG[member.role];
                const RoleIcon = roleConfig.icon;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {member.avatarInitial}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.name}
                          {member.status === "pending" && (
                            <span className="ml-2 text-xs text-amber-500 font-normal">(pending)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className={cn("flex items-center gap-1.5 text-xs font-medium", roleConfig.color)}>
                        <RoleIcon className="h-3.5 w-3.5" />
                        {roleConfig.label}
                      </div>
                      {member.role !== "owner" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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
                      {key === "admin" && " — Manage & edit"}
                      {key === "editor" && " — Edit content"}
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
