import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WandSparkles, Copy, Check, Loader2, ShoppingCart, ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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
import { useActionGate } from "@/hooks/useActionGate";

type Tab = "upgrade" | "refer" | "invite";

const ACTION_PACKS = [
  { label: "50 Actions", price: "$15.00", priceId: "price_1TAvQkGKbzbe9CQLJzFOPcBL" },
  { label: "100 Actions", price: "$30.00", priceId: "price_1TAvR5GKbzbe9CQLzPPcn891" },
  { label: "150 Actions", price: "$45.00", priceId: "price_1TAvS9GKbzbe9CQLmpcVUOLW" },
  { label: "200 Actions", price: "$60.00", priceId: "price_1TAvXcGKbzbe9CQLtQgY1kwy" },
  { label: "300 Actions", price: "$85.00", priceId: "price_1TBAJTGKbzbe9CQLxrFmBDhw" },
  { label: "400 Actions", price: "$100.00", priceId: "price_1TBAJoGKbzbe9CQLnIE5C2IC" },
];

interface ActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActionsDialog({ open, onOpenChange }: ActionsDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>("upgrade");
  const [copied, setCopied] = useState(false);
  const { remaining } = useActionGate();
  const { workspaces, sendInvite } = useWorkspace();
  const [selectedWsId, setSelectedWsId] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [purchasingPriceId, setPurchasingPriceId] = useState<string | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const isUnlimited = remaining === Infinity;

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const handlePurchase = async (priceId: string) => {
    setPurchasingPriceId(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-action-purchase", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error("Failed to start purchase. Please try again.");
    } finally {
      setPurchasingPriceId(null);
    }
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
      <DialogContent className="sm:max-w-xl bg-card border-border p-0 gap-0 overflow-visible" aria-describedby={undefined}>
        <VisuallyHidden.Root><DialogTitle>Get more Actions</DialogTitle></VisuallyHidden.Root>
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
              <p className="text-sm text-muted-foreground">
                Upgrade your plan or purchase action packs to get more actions.
              </p>
              <Button className="w-full" asChild>
                <Link to="/pricing">View Plans & Action Packs</Link>
              </Button>
            </div>
          )}

          {/* Refer friends */}
          {activeTab === "refer" && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Give 20 Actions and earn 20 Actions for each new referral who signs up. Actions are personal and tied to your account.
                </p>
                <span className="shrink-0 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                  +20 Actions
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
