import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings, Users, CreditCard, Key, Loader2, Mail, User, UserPlus, Crown,
  Pencil, Trash2, X, Plus, ArrowLeft, Check, Building2, ArrowRight, Search,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace, WorkspaceMember, WorkspaceInvitation } from "@/hooks/useWorkspace";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import { ConnectionsView } from "@/components/database/ConnectionsView";
import { WorkspacesView } from "@/components/database/WorkspacesView";
import PricingPage from "@/pages/PricingPage";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

/**
 * SettingsPanel — the content body of the legacy SettingsDialog, lifted out
 * so it can be reused as a full page (/app/settings) AND the legacy dialog.
 *
 * NOTHING about the user-facing functionality has changed: Profile, Password,
 * Workspaces (members + invites + create/rename/delete), Plans & Billing
 * (Stripe checkout / customer portal / billing period toggle), and the
 * Connections sub-view all behave exactly as before.
 */

const ACTION_LIMITS_SETTINGS: Record<string, number> = {
  co_founder: 100,
  aristotle: 500,
  timewarp_og: Infinity,
};
const FREE_LIMIT_SETTINGS = 10;

function PlanUsageSummary({ fallbackPlan, userId }: { fallbackPlan: string | null; userId?: string }) {
  const { data } = useQuery<{ actions_used: number; bonus_actions: number; plan: string | null }>({
    queryKey: ["actions-used", userId],
    queryFn: async () => {
      if (!userId) return { actions_used: 0, bonus_actions: 0, plan: null };
      const { data } = await supabase
        .from("user_subscriptions")
        .select("actions_used, bonus_actions, plan, status")
        .eq("user_id", userId)
        .maybeSingle();
      const isActive = data?.status && ["active", "trialing", "past_due"].includes(data.status);
      return {
        actions_used: data?.actions_used ?? 0,
        bonus_actions: (data as any)?.bonus_actions ?? 0,
        plan: isActive ? (data?.plan as string) ?? null : null,
      };
    },
    enabled: !!userId,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const used = data?.actions_used ?? 0;
  const bonus = data?.bonus_actions ?? 0;
  const dbPlan = data?.plan ?? fallbackPlan;
  const planName = dbPlan === "co_founder" ? "Co Founder"
    : dbPlan === "aristotle" ? "Aristotle"
    : dbPlan === "timewarp_og" ? "TimeWarp OG"
    : "Free";
  const limit = dbPlan ? ACTION_LIMITS_SETTINGS[dbPlan] ?? FREE_LIMIT_SETTINGS : FREE_LIMIT_SETTINGS;
  const totalNum = limit === Infinity ? Infinity : limit + bonus;
  const remaining = totalNum === Infinity ? "∞" : String(Math.max(0, totalNum - used));

  return (
    <div className="rounded-xl border border-border p-5 space-y-4 bg-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Current Plan</p>
          <p className="text-lg font-bold mt-0.5">{planName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Actions Remaining</p>
          <p className="text-lg font-bold mt-0.5">{remaining}</p>
        </div>
      </div>
    </div>
  );
}

export type SettingsTab = "settings" | "workspace" | "plans" | "connections";
type Role = "owner" | "editor";
type BillingPeriod = "monthly" | "quarterly" | "annually";
type PlanKey = "co_founder" | "aristotle" | "timewarp_og";

const sidebarItems = [
  { section: "Account", items: [
    { id: "settings" as SettingsTab, label: "Settings", icon: Settings },
    { id: "workspace" as SettingsTab, label: "Workspace", icon: Users },
    { id: "plans" as SettingsTab, label: "Plans & Billing", icon: CreditCard },
  ]},
];

const ROLE_CONFIG: Record<Role, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: "Owner", icon: Crown, color: "text-amber-500" },
  editor: { label: "Editor", icon: Pencil, color: "text-emerald-500" },
};

const STRIPE_PRICES: Record<BillingPeriod, Record<PlanKey, string>> = {
  monthly: { co_founder: "price_1THjCGGKbzbe9CQL4jgCLlXl", aristotle: "price_1THjDRGKbzbe9CQLjZ0ndhNP", timewarp_og: "price_1T7WkLGKbzbe9CQLd7zjQtl7" },
  quarterly: { co_founder: "price_1THjCkGKbzbe9CQLXFZ9c7ep", aristotle: "price_1THjDpGKbzbe9CQLC3hLvl3o", timewarp_og: "price_1T7WkqGKbzbe9CQLtJEqLbQv" },
  annually: { co_founder: "price_1THjDBGKbzbe9CQL2XGRqWCt", aristotle: "price_1THjEGGKbzbe9CQL877lDRK7", timewarp_og: "price_1T7WltGKbzbe9CQLhNXfJ2Tf" },
};

const PRICES: Record<BillingPeriod, Record<PlanKey, number>> = {
  monthly: { co_founder: 20, aristotle: 29, timewarp_og: 499 },
  quarterly: { co_founder: 18, aristotle: 26, timewarp_og: 499 },
  annually: { co_founder: 16, aristotle: 23, timewarp_og: 499 },
};

type DisplayPlan = "free" | PlanKey;

const PLAN_BENEFITS: Record<DisplayPlan, { tagline: string; bullets: string[] }> = {
  free: {
    tagline: "Try us out, see what lands",
    bullets: ["10 Actions", "1 AI Employee", "1 business"],
  },
  co_founder: {
    tagline: "For early-stage founders getting started",
    bullets: [
      "10x usage of free",
      "Up to 10 AI employees",
      "Smarter brain",
    ],
  },
  aristotle: {
    tagline: "For growing businesses scaling operations",
    bullets: [
      "Everything in Co Founder, plus:",
      "5x usage of co founder",
      "Up to 50 AI employees",
      "Direct developer line",
    ],
  },
  timewarp_og: {
    tagline: "Unlimited power for serious operators",
    bullets: [
      "Unlimited Actions",
      "Unlimited AI Employees",
      "Unlimited Businesses",
      "Unlimited connected data",
      "Direct developer line",
      "Priority support",
    ],
  },
};

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

interface SettingsPanelProps {
  userEmail: string;
  defaultTab?: SettingsTab;
  onTabChange?: (tab: SettingsTab) => void;
  onClose?: () => void;
  /** When true, the panel is rendered as a full-bleed page (no rounded corners, no inner shadow). */
  pageMode?: boolean;
}

export function SettingsPanel({
  userEmail,
  defaultTab = "settings",
  onTabChange,
  onClose,
  pageMode = false,
}: SettingsPanelProps) {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Workspace state
  const {
    workspaces, createWorkspace, sendInvite, removeMember, updateMemberRole,
    cancelInvitation, renameWorkspace, deleteWorkspace, loadMembersForWorkspace, isLoading: wsLoading,
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
  const [wsDetailTab, setWsDetailTab] = useState<"users" | "invites">("users");
  const [wsFilter, setWsFilter] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Plans state
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { plan: currentPlan } = useSubscription();
  const { user: authUser } = useAuth();

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setDisplayName(data.user?.user_metadata?.display_name || "");
    });
    setSelectedWsId(null);
    setShowCreateWs(false);
  }, []);

  // Load workspace members when selected
  useEffect(() => {
    if (!selectedWsId) return;
    let mounted = true;
    const refresh = async () => {
      setLoadingMembers(true);
      const data = await loadMembersForWorkspace(selectedWsId);
      if (mounted) { setWsMemberData(data); setLoadingMembers(false); }
    };
    void refresh();
    return () => { mounted = false; };
  }, [selectedWsId, loadMembersForWorkspace]);

  // Profile/password handlers
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

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    try { await createWorkspace(newWsName.trim()); setShowCreateWs(false); setNewWsName(""); toast({ title: "Workspace created" }); }
    catch (err: any) { toast({ title: "Failed", description: err.message, variant: "destructive" }); }
  };

  const handleDeleteWorkspace = async () => {
    if (!selectedWsId) return;
    try {
      await deleteWorkspace(selectedWsId);
      setSelectedWsId(null);
      toast({ title: "Workspace deleted" });
    } catch (err: any) {
      toast({ title: "Failed to delete workspace", description: err.message, variant: "destructive" });
    }
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

  const getPlanButtonLabel = (plan: PlanKey) => currentPlan === plan ? "Manage Plan" : "Get Started";
  const prices = PRICES[billing];

  const setTab = useCallback((tab: SettingsTab) => {
    setActiveTab(tab);
    if (tab === "workspace") {
      setSelectedWsId(null);
      setShowCreateWs(false);
    }
    onTabChange?.(tab);
  }, [onTabChange]);

  return (
    <div className={cn("flex h-full min-h-0", pageMode && "bg-background")}>
      {/* Sidebar */}
      <div className="w-60 border-r border-border p-4 flex flex-col gap-1 shrink-0 bg-background">
        {sidebarItems.map((section) => (
          <div key={section.section} className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-3">{section.section}</p>
            {section.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
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
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {(activeTab === "settings" || activeTab === "connections") && (
          <div className="px-8 pt-8 pb-2 bg-background">
            <h2 className="text-2xl font-bold tracking-tight">
              {activeTab === "settings" && "Account Settings"}
              {activeTab === "connections" && "Connections"}
            </h2>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-8 py-4 bg-background">
          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="space-y-4 bg-[#fcfcfd]">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2 mb-4"><User className="h-4 w-4" /> Profile</h3>
                <div className="bg-[#fcfcfd]">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                    <Input id="fullName" placeholder="Your full name" value={displayName} onChange={(e) => { setDisplayName(e.target.value); setHasChanges(true); }} />
                    <p className="text-xs text-muted-foreground">Your full name, as visible to others.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Email</Label>
                      <div className="flex items-center gap-2.5 p-3 rounded-md border-input bg-background border-2">
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
                <div className="rounded-xl border border-border p-5 space-y-4 bg-gray-100">
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

          {/* WORKSPACE TAB — list */}
          {activeTab === "workspace" && !selectedWsId && (
            <div className="space-y-4 bg-[#fcfcfd]">
              <p className="text-sm text-muted-foreground">Manage your workspaces and team members.</p>
              <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background">
                  <span className="text-sm font-medium text-muted-foreground">{workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}</span>
                  {showCreateWs ? (
                    <div className="flex items-center gap-2">
                      <Input placeholder="Workspace name" value={newWsName} onChange={(e) => setNewWsName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()} className="h-9 w-52" autoFocus />
                      <Button size="sm" onClick={handleCreateWorkspace} disabled={!newWsName.trim()}>Create</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setShowCreateWs(false); setNewWsName(""); }}>Cancel</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setShowCreateWs(true)} className="bg-background"><Plus className="h-4 w-4 mr-1" /> New workspace</Button>
                  )}
                </div>
                {wsLoading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Workspace</TableHead><TableHead>Your Role</TableHead><TableHead>Members</TableHead><TableHead className="text-right" /></TableRow></TableHeader>
                    <TableBody>
                      {workspaces.map((ws) => (
                        <TableRow key={ws.workspaceId}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-card"><Building2 className="h-4 w-4 text-muted-foreground" /></div>
                              <div><p className="font-medium text-foreground">{ws.workspaceName}</p><p className="text-xs text-muted-foreground">Created {new Date(ws.createdAt).toLocaleDateString()}</p></div>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant={ws.role === "owner" ? "default" : "secondary"} className="capitalize">{ws.role}</Badge></TableCell>
                          <TableCell><span className="text-sm text-muted-foreground">{ws.memberCount} member{ws.memberCount !== 1 ? "s" : ""}</span></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedWsId(ws.workspaceId); setWsDetailTab("users"); setWsFilter(""); setShowInviteForm(false); }} className="text-muted-foreground hover:text-foreground bg-background">Manage <ArrowRight className="h-4 w-4 ml-1" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {workspaces.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No workspaces yet. Create one to get started.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}

          {/* WORKSPACE TAB — detail */}
          {activeTab === "workspace" && selectedWsId && selectedWs && (() => {
            const filteredMembers = wsFilter ? wsMemberData.members.filter(m => m.email.toLowerCase().includes(wsFilter.toLowerCase()) || getDisplayName(m.email).toLowerCase().includes(wsFilter.toLowerCase())) : wsMemberData.members;
            const filteredInvitations = wsFilter ? wsMemberData.invitations.filter(i => i.email.toLowerCase().includes(wsFilter.toLowerCase())) : wsMemberData.invitations;
            return (
              <div className="space-y-4 bg-[#fcfcfd]">
                <p className="text-muted-foreground text-sm">{selectedWs.workspaceName} · {wsMemberData.members.length} member{wsMemberData.members.length !== 1 ? "s" : ""}</p>
                <div className="inline-flex items-center p-1 rounded-lg bg-muted border border-border">
                  <button onClick={() => setWsDetailTab("users")} className={`px-5 py-1.5 text-sm font-medium rounded-md transition-all ${wsDetailTab === "users" ? "text-foreground shadow-sm bg-card" : "text-muted-foreground hover:text-foreground"}`}>Users</button>
                  <button onClick={() => setWsDetailTab("invites")} className={`px-5 py-1.5 text-sm font-medium rounded-md transition-all ${wsDetailTab === "invites" ? "text-foreground shadow-sm bg-card" : "text-muted-foreground hover:text-foreground"}`}>Pending invites</button>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Filter by name or email" value={wsFilter} onChange={(e) => setWsFilter(e.target.value)} className="pl-9 h-9" />
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwnerOfSelected && <Button size="sm" onClick={() => setShowInviteForm(true)}><UserPlus className="h-4 w-4 mr-1.5" /> Invite member</Button>}
                    {isOwnerOfSelected && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="outline" className="h-9 w-9"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditName(selectedWs.workspaceName); setEditingName(true); }}><Pencil className="h-4 w-4 mr-2" /> Rename workspace</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={handleDeleteWorkspace}><Trash2 className="h-4 w-4 mr-2" /> Delete workspace</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                {showInviteForm && (
                  <div className="flex items-center gap-2 p-4 rounded-xl border border-border bg-muted/30">
                    <Input placeholder="name@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInvite()} className="flex-1 h-9" autoFocus />
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                      <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="editor">Editor</SelectItem></SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleInvite} disabled={isSending}>{isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowInviteForm(false); setInviteEmail(""); }}><X className="h-4 w-4" /></Button>
                  </div>
                )}
                <div className="rounded-xl border border-border bg-card">
                  {loadingMembers ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : wsDetailTab === "users" ? (
                    <Table>
                      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Account type</TableHead><TableHead>Date added</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filteredMembers.map((member) => {
                          const isCurrentUser = member.email === userEmail || (member.email === "unknown" && member.role === "owner");
                          const displayMemberName = isCurrentUser ? `${getDisplayName(userEmail || member.email)} (You)` : getDisplayName(member.email);
                          const displayEmail = isCurrentUser ? userEmail : (member.email !== "unknown" ? member.email : "");
                          const initials = displayMemberName.replace(" (You)", "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                          return (
                            <TableRow key={member.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0"><span className="text-xs font-semibold text-muted-foreground">{initials}</span></div>
                                  <div><p className="font-medium text-foreground text-sm">{displayMemberName}</p>{displayEmail && <p className="text-xs text-muted-foreground">{displayEmail}</p>}</div>
                                </div>
                              </TableCell>
                              <TableCell><Badge variant={member.role === "owner" ? "default" : "secondary"} className="capitalize">{member.role === "owner" ? "Owner" : "Editor"}</Badge></TableCell>
                              <TableCell><span className="text-sm text-muted-foreground">{new Date(member.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></TableCell>
                              <TableCell className="text-right">
                                {isOwnerOfSelected && member.role !== "owner" && !isCurrentUser && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveMember(member.id)}><Trash2 className="h-4 w-4" /></Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {filteredMembers.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No members found.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Invited</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filteredInvitations.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell><span className="text-sm font-medium">{inv.email}</span></TableCell>
                            <TableCell><Badge variant="secondary" className="capitalize">{inv.role}</Badge></TableCell>
                            <TableCell><span className="text-sm text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></TableCell>
                            <TableCell className="text-right">
                              {isOwnerOfSelected && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleCancelInvite(inv.id)}><X className="h-4 w-4" /></Button>}
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredInvitations.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No pending invitations.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            );
          })()}

          {/* PLANS TAB — render the standalone Pricing page for visual parity */}
          {activeTab === "plans" && (
            <div className="-mx-8 -my-4">
              <PricingPage />
            </div>
          )}

          {/* CONNECTIONS TAB */}
          {activeTab === "connections" && (
            <div className="h-full min-h-0 -mx-8 -mt-2 -mb-4">
              <ConnectionsView />
            </div>
          )}
        </div>

        {/* Footer (only on settings tab) */}
        {activeTab === "settings" && (
          <div className="border-t border-border px-8 py-4 flex justify-end gap-3 shrink-0">
            {onClose && <Button variant="outline" onClick={onClose}>Cancel</Button>}
            <Button onClick={handleSaveChanges} disabled={isUpdatingName || !hasChanges}>
              {isUpdatingName ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Changes"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
