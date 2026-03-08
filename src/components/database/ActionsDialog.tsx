import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WandSparkles, Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const ACTION_LIMITS: Record<string, number> = {
  co_founder: 100,
  aristotle: 1000,
  timewarp_og: Infinity,
};
const FREE_LIMIT = 20;

type Tab = "upgrade" | "refer" | "invite";

interface ActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActionsDialog({ open, onOpenChange }: ActionsDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>("upgrade");
  const [copied, setCopied] = useState(false);
  const { plan } = useSubscription();
  const { workspaces, sendInvite } = useWorkspace();
  const [selectedWsId, setSelectedWsId] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { data: subData } = useQuery({
    queryKey: ["actions-used"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { actions_used: 0, bonus_actions: 0 };
      const { data } = await supabase
        .from("user_subscriptions")
        .select("actions_used, bonus_actions")
        .eq("user_id", session.user.id)
        .maybeSingle();
      return { actions_used: data?.actions_used ?? 0, bonus_actions: (data as any)?.bonus_actions ?? 0 };
    },
    refetchInterval: 30000,
  });

  // Fetch or create referral code
  const { data: referralCode } = useQuery({
    queryKey: ["referral-code"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-referral");
      if (error) throw error;
      return data?.referral_code as string;
    },
    enabled: open && activeTab === "refer",
    staleTime: Infinity,
  });

  const actionsUsed = subData?.actions_used ?? 0;
  const bonusActions = subData?.bonus_actions ?? 0;
  const limit = plan ? ACTION_LIMITS[plan] ?? FREE_LIMIT : FREE_LIMIT;
  const isUnlimited = limit === Infinity;
  const remaining = isUnlimited ? Infinity : Math.max(0, limit + bonusActions - actionsUsed);

  // Auto-select first workspace
  useEffect(() => {
    if (workspaces.length > 0 && !selectedWsId) {
      setSelectedWsId(workspaces[0].workspaceId);
    }
  }, [workspaces, selectedWsId]);

  // Generate referral link using referral code
  const referralLink = referralCode
    ? `${window.location.origin}/auth?ref=${referralCode}`
    : "";

  const handleCopyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedWsId) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsSending(true);
    try {
      await sendInvite(inviteEmail, "editor", selectedWsId);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setIsSending(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "upgrade", label: "Get more Actions" },
    { key: "refer", label: "Refer friends" },
    { key: "invite", label: "Invite team members" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-card border-border p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="text-center pt-8 pb-4 px-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <WandSparkles className="h-7 w-7 text-primary" />
            <span className="text-4xl font-bold text-primary">
              {isUnlimited ? "∞" : remaining} Actions
            </span>
          </div>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            With Actions you can export ready-to-launch ads, including creative and its matching ad copy.
          </p>
        </div>

        {/* Tabs */}
        <div className="px-6 pb-2">
          <div className="flex rounded-xl bg-muted/50 p-1 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.key
                    ? "bg-card shadow-sm text-foreground border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-6 pb-8 pt-4 min-h-[220px]">
          {/* Get more Actions */}
          {activeTab === "upgrade" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">Upgrade your plan</h3>
                <p className="text-sm text-muted-foreground">
                  Get more Actions by upgrading to a higher tier plan.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { name: "Co-Founder", actions: 100, price: "$69/mo" },
                  { name: "Aristotle", actions: 1000, price: "$109/mo" },
                  { name: "TimeWarp OG", actions: "Unlimited", price: "$999/mo" },
                ].map((tier) => (
                  <div
                    key={tier.name}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{tier.name}</p>
                      <p className="text-xs text-muted-foreground">{tier.actions} Actions/month</p>
                    </div>
                    <Link to="/pricing" onClick={() => onOpenChange(false)}>
                      <Button size="sm" variant="outline" className="text-xs gap-1.5">
                        {tier.price}
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refer friends */}
          {activeTab === "refer" && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Give 125 Actions and earn 125 Actions for each new referral who signs up. Actions are personal and tied to your account.
                </p>
                <span className="shrink-0 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                  +125 Actions
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                (Free accounts can have up to 250 Actions at once)
              </p>

              <div className="flex gap-2">
                <Input
                  readOnly
                  value={referralLink || "Loading..."}
                  className="bg-muted/30 text-sm"
                />
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="shrink-0 gap-1.5"
                  disabled={!referralLink}
                >
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  Copy referral link
                </Button>
              </div>
            </div>
          )}

          {/* Invite team members */}
          {activeTab === "invite" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">Invite people to an organization</h3>
                <p className="text-sm text-muted-foreground">
                  Select an organization to generate a shareable invite link.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary">Organization</label>
                <Select value={selectedWsId} onValueChange={setSelectedWsId}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.workspaceId} value={ws.workspaceId}>
                        {ws.workspaceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Invite team members to collaborate. Each member has their own individual Actions balance.
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                (Free accounts can have up to 250 Actions at once)
              </p>

              <p className="text-xs text-muted-foreground">
                Select an organization to get an invite link.
              </p>

              {selectedWsId && (
                <div className="flex gap-2">
                  <Input
                    placeholder="name@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    className="bg-muted/30"
                    disabled={isSending}
                  />
                  <Button onClick={handleInvite} disabled={isSending || !inviteEmail.trim()}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
