import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings, Users, CreditCard, Key, Unplug, Plug, Loader2,
  Sun, Moon, Monitor, Mail, MailPlus, User, UserPlus, Crown,
  Pencil, Trash2, Clock, X, Plus, ChevronRight, ArrowLeft, Check,
} from "lucide-react";
import { useTheme } from "next-themes";
import logoMicrosoft from "@/assets/logo-microsoft.png";
import { cn } from "@/lib/utils";
import { useWorkspace, WorkspaceMember, WorkspaceInvitation } from "@/hooks/useWorkspace";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const integrations = [
  { id: "microsoft", name: "Microsoft", description: "Outlook, OneDrive, Calendar, Teams", logo: logoMicrosoft, authType: "oauth" as const },
];

type SettingsTab = "settings" | "workspace" | "plans" | "connections";
type Role = "owner" | "editor";
type BillingPeriod = "monthly" | "quarterly" | "annually";
type PlanKey = "co_founder" | "aristotle" | "timewarp_og";

const sidebarItems = [
  { section: "Account", items: [
    { id: "settings" as SettingsTab, label: "Settings", icon: Settings },
    { id: "workspace" as SettingsTab, label: "Workspace", icon: Users },
    { id: "plans" as SettingsTab, label: "Plans & Billing", icon: CreditCard },
  ]},
  { section: "Connections", items: [
    { id: "connections" as SettingsTab, label: "Integrations", icon: Unplug },
  ]},
];

const ROLE_CONFIG: Record<Role, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: "Owner", icon: Crown, color: "text-amber-500" },
  editor: { label: "Editor", icon: Pencil, color: "text-emerald-500" },
};

const STRIPE_PRICES: Record<BillingPeriod, Record<PlanKey, string>> = {
  monthly: { co_founder: "price_1T7WhZGKbzbe9CQL2XgsQJ1i", aristotle: "price_1T7WjHGKbzbe9CQLopjmOrkg", timewarp_og: "price_1T7WkLGKbzbe9CQLd7zjQtl7" },
  quarterly: { co_founder: "price_1T7WicGKbzbe9CQLJc2YAgFa", aristotle: "price_1T7WjhGKbzbe9CQLt570pbGz", timewarp_og: "price_1T7WkqGKbzbe9CQLtJEqLbQv" },
  annually: { co_founder: "price_1T7WirGKbzbe9CQLlNxy4zyK", aristotle: "price_1T7Wk6GKbzbe9CQLzECMgYMt", timewarp_og: "price_1T7WltGKbzbe9CQLhNXfJ2Tf" },
};

const PRICES: Record<BillingPeriod, Record<PlanKey, number>> = {
  monthly: { co_founder: 69, aristotle: 109, timewarp_og: 999 },
  quarterly: { co_founder: 62, aristotle: 98, timewarp_og: 899 },
  annually: { co_founder: 55, aristotle: 87, timewarp_og: 799 },
};

const PLAN_FEATURES: { name: string; co_founder: string | boolean; aristotle: string | boolean; timewarp_og: string | boolean }[] = [
  { name: "Team members", co_founder: "Unlimited", aristotle: "Unlimited", timewarp_og: "Unlimited" },
  { name: "Connected data", co_founder: "5GB", aristotle: "10GB", timewarp_og: "Unlimited" },
  { name: "Actions / month", co_founder: "100", aristotle: "1,000", timewarp_og: "Unlimited" },
  { name: "AI CEO", co_founder: true, aristotle: true, timewarp_og: true },
  { name: "Business Brain", co_founder: true, aristotle: true, timewarp_og: true },
  { name: "Developer Line", co_founder: false, aristotle: true, timewarp_og: true },
  { name: "Scale assistance", co_founder: false, aristotle: false, timewarp_og: true },
];

const RANDOM_NAMES = [
  "Cosmic Panda", "Stellar Fox", "Neon Tiger", "Pixel Wolf", "Turbo Owl",
  "Cyber Lynx", "Astro Bear", "Quantum Hawk", "Nova Otter", "Solar Raven",
];

function getDisplayName(email: string): string {
  if (!email || email === "unknown") {
    const hash = Array.from(email || "x").reduce((a, c) => a + c.charCodeAt(0), 0);
    return RANDOM_NAMES[hash % RANDOM_NAMES.length];
  }
  return email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === "string") return <span className="text-sm font-medium text-foreground">{value}</span>;
  return value ? <Check className="h-4 w-4 text-primary" /> : <X className="h-4 w-4 text-muted-foreground/40" />;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export function SettingsDialog({ open, onOpenChange, userEmail }: SettingsDialogProps) {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("settings");
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [actionProvider, setActionProvider] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Workspace state
  const {
    workspaces, createWorkspace, sendInvite, removeMember, updateMemberRole,
    cancelInvitation, renameWorkspace, loadMembersForWorkspace, isLoading: wsLoading,
  } = useWorkspace();
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [wsMemberData, setWsMemberData] = useState<{ members: WorkspaceMember[]; invitations: WorkspaceInvitation[] }>({ members: [], invitations: [] });
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("editor");
  const [isSending, setIsSending] = useState(false);
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");

  // Plans state
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { plan: currentPlan } = useSubscription();

  useEffect(() => {
    if (open) {
      supabase.auth.getUser().then(({ data }) => {
        setDisplayName(data.user?.user_metadata?.display_name || "");
      });
      setSelectedWsId(null);
      setShowCreateWs(false);
    }
  }, [open]);

  // Load workspace members when selected
  useEffect(() => {
    if (!selectedWsId || !open) return;
    let mounted = true;
    const refresh = async () => {
      setLoadingMembers(true);
      const data = await loadMembersForWorkspace(selectedWsId);
      if (mounted) { setWsMemberData(data); setLoadingMembers(false); }
    };
    void refresh();
    const interval = setInterval(refresh, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, [selectedWsId, open, loadMembersForWorkspace]);

  const checkConnections = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ action: "check-status" }) }
      );
      if (response.ok) {
        const data = await response.json();
        setConnectedProviders((data.connected || []).map((c: any) => c.provider));
      }
    } catch (err) { console.error("Failed to check connections:", err); }
  }, []);

  useEffect(() => { if (open) checkConnections(); }, [open, checkConnections]);

  const handleConnect = async (providerId: string) => {
    setActionProvider(providerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ provider: providerId, action: "get-auth-url" }) }
      );
      const data = await response.json();
      if (data.authUrl) window.location.href = data.authUrl;
      else toast({ title: "Error", description: data.error || "Failed to get authorization URL", variant: "destructive" });
    } catch { toast({ title: "Error", description: "Failed to start connection", variant: "destructive" }); }
    setActionProvider(null);
  };

  const handleDisconnect = async (providerId: string) => {
    setActionProvider(providerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ provider: providerId, action: "disconnect" }) }
      );
      const data = await response.json();
      if (data.success) { toast({ title: "Disconnected", description: `${integrations.find(i => i.id === providerId)?.name} has been disconnected.` }); checkConnections(); }
      else toast({ title: "Error", description: data.error || "Failed to disconnect", variant: "destructive" });
    } catch { toast({ title: "Error", description: "Failed to disconnect", variant: "destructive" }); }
    setActionProvider(null);
  };

  const handleSaveChanges = async () => {
    if (displayName.trim()) {
      setIsUpdatingName(true);
      try {
        const { error } = await supabase.auth.updateUser({ data: { display_name: displayName } });
        if (error) throw error;
        toast({ title: "Settings saved", description: "Your changes have been saved successfully." });
        setHasChanges(false);
      } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      finally { setIsUpdatingName(false); }
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) { toast({ title: "Missing fields", description: "Please fill in all password fields.", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "Password too short", variant: "destructive" }); return; }
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    finally { setIsUpdatingPassword(false); }
  };

  // Workspace handlers
  const selectedWs = workspaces.find(w => w.workspaceId === selectedWsId);
  const isOwnerOfSelected = selectedWs?.role === "owner";

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedWsId) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) { toast({ title: "Invalid email", variant: "destructive" }); return; }
    setIsSending(true);
    try {
      const result = await sendInvite(inviteEmail, inviteRole, selectedWsId);
      if (result?.existingUser && result?.inviteUrl && navigator?.clipboard) await navigator.clipboard.writeText(result.inviteUrl);
      toast({ title: "Invitation sent", description: `Invited ${inviteEmail} as ${ROLE_CONFIG[inviteRole].label}.` });
      setInviteEmail("");
      const data = await loadMembersForWorkspace(selectedWsId);
      setWsMemberData(data);
    } catch (err: any) { toast({ title: "Failed to send invite", description: err.message, variant: "destructive" }); }
    finally { setIsSending(false); }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedWsId) return;
    try { await removeMember(memberId, selectedWsId); const data = await loadMembersForWorkspace(selectedWsId); setWsMemberData(data); toast({ title: "Member removed" }); }
    catch { toast({ title: "Failed to remove member", variant: "destructive" }); }
  };

  const handleCancelInvite = async (invId: string) => {
    if (!selectedWsId) return;
    try { await cancelInvitation(invId, selectedWsId); const data = await loadMembersForWorkspace(selectedWsId); setWsMemberData(data); toast({ title: "Invitation cancelled" }); }
    catch { toast({ title: "Failed to cancel invitation", variant: "destructive" }); }
  };

  const handleUpdateRole = async (memberId: string, newRole: Role) => {
    if (!selectedWsId) return;
    await updateMemberRole(memberId, newRole, selectedWsId);
    const data = await loadMembersForWorkspace(selectedWsId);
    setWsMemberData(data);
  };

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    try { await createWorkspace(newWsName.trim()); setShowCreateWs(false); setNewWsName(""); toast({ title: "Workspace created" }); }
    catch (err: any) { toast({ title: "Failed", description: err.message, variant: "destructive" }); }
  };

  // Plans handlers
  const handleGetStarted = async (plan: PlanKey) => {
    if (currentPlan === plan) { handleManageSubscription(); return; }
    setLoadingPlan(plan);
    try {
      const priceId = STRIPE_PRICES[billing][plan];
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { priceId } });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoadingPlan(null); }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const getPlanButtonLabel = (plan: PlanKey) => {
    if (currentPlan === plan) return "Manage Plan";
    if (plan === "co_founder") return "Pre-order";
    return "Get Started";
  };

  const prices = PRICES[billing];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl h-[75vh] p-0 gap-0 bg-background border-border overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-60 border-r border-border p-4 flex flex-col gap-1 shrink-0">
            {sidebarItems.map((section) => (
              <div key={section.section} className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-3">{section.section}</p>
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); if (item.id === "workspace") { setSelectedWsId(null); setShowCreateWs(false); } }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                      activeTab === item.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-8 pt-8 pb-2">
              <h2 className="text-2xl font-bold tracking-tight">
                {activeTab === "settings" && "Account Settings"}
                {activeTab === "workspace" && (selectedWsId && selectedWs ? (
                  <span className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedWsId(null); setEditingName(false); }}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    {editingName ? (
                      <div className="flex items-center gap-2">
                        <Input value={editName} onChange={e => setEditName(e.target.value)}
                          onKeyDown={async e => { if (e.key === "Enter" && editName.trim()) { await renameWorkspace(selectedWsId!, editName.trim()); setEditingName(false); } if (e.key === "Escape") setEditingName(false); }}
                          className="h-8 text-lg font-bold" autoFocus />
                      </div>
                    ) : (
                      <>{selectedWs.workspaceName}
                        {isOwnerOfSelected && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditName(selectedWs.workspaceName); setEditingName(true); }}><Pencil className="h-3 w-3" /></Button>}
                      </>
                    )}
                    <span className={cn("text-xs font-medium", ROLE_CONFIG[selectedWs.role].color)}>({ROLE_CONFIG[selectedWs.role].label})</span>
                  </span>
                ) : "Workspaces")}
                {activeTab === "plans" && "Plans & Billing"}
                {activeTab === "connections" && "Connections"}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4">
              {/* ── SETTINGS TAB ── */}
              {activeTab === "settings" && (
                <div className="space-y-8 max-w-xl">
                  <div>
                    <h3 className="text-base font-semibold flex items-center gap-2 mb-4"><User className="h-4 w-4" /> Profile</h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                        <Input id="fullName" placeholder="Your full name" value={displayName} onChange={(e) => { setDisplayName(e.target.value); setHasChanges(true); }} />
                        <p className="text-xs text-muted-foreground">Your full name, as visible to others.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Email</Label>
                        <div className="flex items-center gap-2.5 p-3 rounded-md border border-input bg-muted/30">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{userEmail}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Your email address associated with your account.</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="text-base font-semibold flex items-center gap-2 mb-4"><Key className="h-4 w-4" /> Security</h3>
                    <div className="rounded-xl bg-muted/40 border border-border p-5 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-1"><Key className="h-3.5 w-3.5" /> Change Password</h4>
                        <p className="text-xs text-muted-foreground mb-4">Update your password to keep your account secure.</p>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1.5"><Label className="text-xs font-medium">Current Password</Label><Input type="password" placeholder="Enter current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
                        <div className="space-y-1.5"><Label className="text-xs font-medium">New Password</Label><Input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
                        <div className="space-y-1.5"><Label className="text-xs font-medium">Confirm New Password</Label><Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
                        <Button onClick={handleUpdatePassword} disabled={isUpdatingPassword || !newPassword || !confirmPassword} variant="outline" size="sm" className="w-full">
                          {isUpdatingPassword ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating...</> : "Update Password"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── WORKSPACE TAB ── */}
              {activeTab === "workspace" && !selectedWsId && (
                <div className="space-y-5 max-w-xl">
                  {showCreateWs ? (
                    <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-muted/20">
                      <Label className="text-sm font-semibold">New Workspace</Label>
                      <Input placeholder="Workspace name" value={newWsName} onChange={e => setNewWsName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateWorkspace()} autoFocus />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setShowCreateWs(false); setNewWsName(""); }}>Cancel</Button>
                        <Button size="sm" onClick={handleCreateWorkspace} disabled={!newWsName.trim()}>Create</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full gap-2" onClick={() => setShowCreateWs(true)}><Plus className="h-4 w-4" /> Create Workspace</Button>
                  )}
                  {wsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : (
                    <>
                      {workspaces.filter(w => w.role === "owner").length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">My Workspaces</Label>
                          <div className="space-y-1.5">
                            {workspaces.filter(w => w.role === "owner").map(ws => (
                              <WorkspaceListItem key={ws.workspaceId} ws={ws} onClick={() => setSelectedWsId(ws.workspaceId)} />
                            ))}
                          </div>
                        </div>
                      )}
                      {workspaces.filter(w => w.role !== "owner").length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Shared with me</Label>
                          <div className="space-y-1.5">
                            {workspaces.filter(w => w.role !== "owner").map(ws => (
                              <WorkspaceListItem key={ws.workspaceId} ws={ws} onClick={() => setSelectedWsId(ws.workspaceId)} />
                            ))}
                          </div>
                        </div>
                      )}
                      {workspaces.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No workspaces yet.</p>}
                    </>
                  )}
                </div>
              )}

              {/* Workspace Detail */}
              {activeTab === "workspace" && selectedWsId && selectedWs && (
                <div className="space-y-5 max-w-xl">
                  <p className="text-sm text-muted-foreground">{isOwnerOfSelected ? "Manage team members and invitations." : "View team members."}</p>
                  {isOwnerOfSelected && (
                    <>
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> Invite People</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="name@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="pl-9" onKeyDown={e => e.key === "Enter" && handleInvite()} disabled={isSending} />
                          </div>
                          <Select value={inviteRole} onValueChange={v => setInviteRole(v as Role)}>
                            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="editor">Editor</SelectItem></SelectContent>
                          </Select>
                          <Button onClick={handleInvite} disabled={isSending}>{isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}</Button>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Team Members</Label>
                      <span className="text-xs text-muted-foreground">{wsMemberData.members.length} {wsMemberData.members.length === 1 ? "member" : "members"}</span>
                    </div>
                    {loadingMembers ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : (
                      <div className="space-y-1.5">
                        {wsMemberData.members.map(member => {
                          const roleConfig = ROLE_CONFIG[member.role];
                          const RoleIcon = roleConfig.icon;
                          const isCurrentUser = member.email === userEmail || (member.email === "unknown" && member.role === "owner");
                          const displayEmail = isCurrentUser ? userEmail : (member.email !== "unknown" ? member.email : null);
                          const name = isCurrentUser ? "You" : getDisplayName(member.email);
                          const avatarLetter = (displayEmail || name).charAt(0).toUpperCase();
                          return (
                            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><span className="text-sm font-semibold text-primary">{avatarLetter}</span></div>
                                <div className="min-w-0"><p className="text-sm font-medium truncate">{name}</p><p className="text-xs text-muted-foreground truncate">{displayEmail || "No email available"}</p></div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isOwnerOfSelected && member.role !== "owner" && !isCurrentUser ? (
                                  <Select value={member.role} onValueChange={v => handleUpdateRole(member.id, v as Role)}>
                                    <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="editor">Editor</SelectItem></SelectContent>
                                  </Select>
                                ) : (
                                  <div className={cn("flex items-center gap-1.5 text-xs font-medium", roleConfig.color)}><RoleIcon className="h-3.5 w-3.5" />{roleConfig.label}</div>
                                )}
                                {isOwnerOfSelected && member.role !== "owner" && !isCurrentUser && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveMember(member.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {isOwnerOfSelected && wsMemberData.invitations.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Pending Invitations</Label>
                        <div className="space-y-1.5">
                          {wsMemberData.invitations.map(inv => (
                            <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 rounded-full bg-muted/40 flex items-center justify-center shrink-0"><Mail className="h-4 w-4 text-muted-foreground" /></div>
                                <div className="min-w-0"><p className="text-sm font-medium truncate">{inv.email}</p><p className="text-xs text-muted-foreground">Invited as {ROLE_CONFIG[inv.role]?.label || inv.role}</p></div>
                              </div>
                              {isOwnerOfSelected && <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleCancelInvite(inv.id)}><X className="h-3.5 w-3.5" /></Button>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-medium">Role Permissions</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Icon className={cn("h-3.5 w-3.5", config.color)} />
                            <span><span className="font-medium text-foreground">{config.label}</span>{key === "owner" && " — Full control"}{key === "editor" && " — Edit Business DNA"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PLANS TAB ── */}
              {activeTab === "plans" && (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="inline-flex items-center rounded-full bg-muted p-1 gap-1">
                      {(["monthly", "quarterly", "annually"] as BillingPeriod[]).map(period => (
                        <button key={period} onClick={() => setBilling(period)}
                          className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize",
                            billing === period ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}>
                          {period}{period === "annually" && <span className="ml-1 text-xs text-primary font-semibold">-20%</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Co Founder */}
                    <div className={cn("relative rounded-xl border-2 bg-card p-5 flex flex-col", currentPlan === "co_founder" ? "border-green-500" : "border-border/60")}>
                      {currentPlan === "co_founder" && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="bg-green-500 text-white border-green-500 px-3 py-0.5 text-xs">Your Plan</Badge></div>}
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 text-xs w-fit mb-3">Launching next month</Badge>
                      <h3 className="text-lg font-bold mb-1">Co Founder</h3>
                      <p className="text-muted-foreground text-xs mb-4">For early-stage founders</p>
                      <div className="mb-4"><span className="text-3xl font-bold">${prices.co_founder}</span><span className="text-muted-foreground text-sm"> / mo</span></div>
                      <div className="space-y-2.5 flex-1 mb-4">
                        {PLAN_FEATURES.map(f => (
                          <div key={f.name} className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{f.name}</span><FeatureValue value={f.co_founder} /></div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => handleGetStarted("co_founder")} disabled={loadingPlan === "co_founder"}>
                        {loadingPlan === "co_founder" ? <Loader2 className="h-4 w-4 animate-spin" /> : getPlanButtonLabel("co_founder")}
                      </Button>
                    </div>

                    {/* Aristotle */}
                    <div className={cn("relative rounded-xl border-2 bg-card p-5 flex flex-col", currentPlan === "aristotle" ? "border-green-500" : "border-primary")}>
                      {currentPlan === "aristotle" ? (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="bg-green-500 text-white border-green-500 px-3 py-0.5 text-xs">Your Plan</Badge></div>
                      ) : (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="bg-primary text-primary-foreground border-primary px-3 py-0.5 text-xs">Most Popular</Badge></div>
                      )}
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 text-xs w-fit mb-3">Access today</Badge>
                      <h3 className="text-lg font-bold mb-1">Aristotle</h3>
                      <p className="text-muted-foreground text-xs mb-4">For growing businesses</p>
                      <div className="mb-4"><span className="text-3xl font-bold">${prices.aristotle}</span><span className="text-muted-foreground text-sm"> / mo</span></div>
                      <div className="space-y-2.5 flex-1 mb-4">
                        {PLAN_FEATURES.map(f => (
                          <div key={f.name} className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{f.name}</span><FeatureValue value={f.aristotle} /></div>
                        ))}
                      </div>
                      <Button size="sm" className="w-full" onClick={() => handleGetStarted("aristotle")} disabled={loadingPlan === "aristotle"}>
                        {loadingPlan === "aristotle" ? <Loader2 className="h-4 w-4 animate-spin" /> : getPlanButtonLabel("aristotle")}
                      </Button>
                    </div>

                    {/* TimeWarp OG */}
                    <div className={cn("relative rounded-xl border-2 bg-card p-5 flex flex-col", currentPlan === "timewarp_og" ? "border-green-500" : "border-border/60")}>
                      {currentPlan === "timewarp_og" && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="bg-green-500 text-white border-green-500 px-3 py-0.5 text-xs">Your Plan</Badge></div>}
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 text-xs w-fit mb-3">Access today</Badge>
                      <h3 className="text-lg font-bold mb-1">TimeWarp OG</h3>
                      <p className="text-muted-foreground text-xs mb-4">Unlimited power</p>
                      <div className="mb-4"><span className="text-3xl font-bold">${prices.timewarp_og}</span><span className="text-muted-foreground text-sm"> / mo</span></div>
                      <div className="space-y-2.5 flex-1 mb-4">
                        {PLAN_FEATURES.map(f => (
                          <div key={f.name} className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{f.name}</span><FeatureValue value={f.timewarp_og} /></div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => handleGetStarted("timewarp_og")} disabled={loadingPlan === "timewarp_og"}>
                        {loadingPlan === "timewarp_og" ? <Loader2 className="h-4 w-4 animate-spin" /> : getPlanButtonLabel("timewarp_og")}
                      </Button>
                    </div>
                  </div>

                  {currentPlan && (
                    <div className="text-center">
                      <Button variant="link" size="sm" className="text-muted-foreground" onClick={handleManageSubscription}>
                        Manage subscription in Stripe →
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ── CONNECTIONS TAB ── */}
              {activeTab === "connections" && (
                <div className="space-y-4 max-w-xl">
                  <div className="space-y-2">
                    {integrations.map(integration => {
                      const connected = connectedProviders.includes(integration.id);
                      const isActioning = actionProvider === integration.id;
                      return (
                        <div key={integration.id} className={cn("p-4 rounded-xl border transition-colors", connected ? "border-green-500/40 bg-green-500/5" : "border-border bg-muted/20")}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center p-2"><img src={integration.logo} alt={integration.name} className="h-6 w-6 object-contain" /></div>
                              <div><p className="text-sm font-medium">{integration.name}</p><p className="text-xs text-muted-foreground">{integration.description}</p></div>
                            </div>
                            {connected ? (
                              <Button variant="destructive" size="sm" onClick={() => handleDisconnect(integration.id)} disabled={isActioning}>
                                {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unplug className="h-3 w-3 mr-1" />} Disconnect
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => handleConnect(integration.id)} disabled={isActioning}>
                                {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plug className="h-3 w-3 mr-1" />} Connect
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <IntegrationRequestDialog />
                </div>
              )}
            </div>

            {/* Footer */}
            {activeTab === "settings" && (
              <div className="border-t border-border px-8 py-4 flex justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSaveChanges} disabled={isUpdatingName || !hasChanges}>
                  {isUpdatingName ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceListItem({ ws, onClick }: { ws: { workspaceId: string; workspaceName: string; role: Role; memberCount: number }; onClick: () => void }) {
  const roleConfig = ROLE_CONFIG[ws.role];
  const RoleIcon = roleConfig.icon;
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors text-left">
      <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0"><Users className="h-4 w-4 text-primary/70" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{ws.workspaceName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn("flex items-center gap-1 text-xs font-medium", roleConfig.color)}><RoleIcon className="h-3 w-3" />{roleConfig.label}</span>
          <span className="text-xs text-muted-foreground">· {ws.memberCount} {ws.memberCount === 1 ? "member" : "members"}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
