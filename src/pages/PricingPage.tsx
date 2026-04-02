import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowLeft, Loader2, ShoppingCart, ChevronDown, WandSparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type BillingPeriod = "monthly" | "quarterly" | "annually";
type PlanKey = "co_founder" | "aristotle" | "timewarp_og";

const STRIPE_PRICES: Record<BillingPeriod, Record<PlanKey, string>> = {
  monthly: {
    co_founder: "price_1THjCGGKbzbe9CQL4jgCLlXl",
    aristotle: "price_1THjDRGKbzbe9CQLjZ0ndhNP",
    timewarp_og: "price_1TGKOzGKbzbe9CQL8pj9zYEf",
  },
  quarterly: {
    co_founder: "price_1THjCkGKbzbe9CQLXFZ9c7ep",
    aristotle: "price_1THjDpGKbzbe9CQLC3hLvl3o",
    timewarp_og: "price_1TGKOzGKbzbe9CQL8pj9zYEf",
  },
  annually: {
    co_founder: "price_1THjDBGKbzbe9CQL2XGRqWCt",
    aristotle: "price_1THjEGGKbzbe9CQL877lDRK7",
    timewarp_og: "price_1TGKOzGKbzbe9CQL8pj9zYEf",
  },
};

const PRICES: Record<BillingPeriod, Record<PlanKey, number>> = {
  monthly: { co_founder: 20, aristotle: 29, timewarp_og: 499 },
  quarterly: { co_founder: 18, aristotle: 26, timewarp_og: 499 },
  annually: { co_founder: 16, aristotle: 23, timewarp_og: 499 },
};

const ACTION_LIMITS: Record<string, number> = {
  co_founder: 100,
  aristotle: 1000,
  timewarp_og: Infinity,
};

const ACTION_PACKS = [
  { label: "50 Actions", price: "$15.00", priceId: "price_1TAvQkGKbzbe9CQLJzFOPcBL" },
  { label: "100 Actions", price: "$30.00", priceId: "price_1TAvR5GKbzbe9CQLzPPcn891" },
  { label: "150 Actions", price: "$45.00", priceId: "price_1TAvS9GKbzbe9CQLmpcVUOLW" },
  { label: "200 Actions", price: "$60.00", priceId: "price_1TAvXcGKbzbe9CQLtQgY1kwy" },
  { label: "300 Actions", price: "$85.00", priceId: "price_1TBAJTGKbzbe9CQLxrFmBDhw" },
  { label: "400 Actions", price: "$100.00", priceId: "price_1TBAJoGKbzbe9CQLnIE5C2IC" },
];

interface Feature {
  name: string;
  co_founder: string | boolean;
  aristotle: string | boolean;
  timewarp_og: string | boolean;
}

const features: Feature[] = [
  { name: "Team members", co_founder: "Unlimited", aristotle: "Unlimited", timewarp_og: "Unlimited" },
  { name: "Connected data", co_founder: "5GB", aristotle: "10GB", timewarp_og: "Unlimited" },
  { name: "Actions / month", co_founder: "100", aristotle: "1,000", timewarp_og: "Unlimited" },
  { name: "Businesses", co_founder: "3", aristotle: "10", timewarp_og: "Unlimited" },
  { name: "Employees", co_founder: "3", aristotle: "10", timewarp_og: "Unlimited" },
  { name: "Developer Line", co_founder: false, aristotle: true, timewarp_og: true },
  { name: "Priority Support", co_founder: false, aristotle: false, timewarp_og: true },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === "string") {
    return <span className="text-sm font-medium text-foreground">{value}</span>;
  }
  return value ? (
    <Check className="h-5 w-5 text-primary" />
  ) : (
    <X className="h-5 w-5 text-muted-foreground/40" />
  );
}

function CurrentPlanCard({ userId }: { userId?: string }) {
  const { plan, hasActivePlan } = useSubscription();

  const { data } = useQuery<{ actions_used: number; bonus_actions: number }>({
    queryKey: ["pricing-actions", userId],
    queryFn: async () => {
      if (!userId) return { actions_used: 0, bonus_actions: 0 };
      const { data } = await supabase
        .from("user_subscriptions")
        .select("actions_used, bonus_actions")
        .eq("user_id", userId)
        .maybeSingle();
      return {
        actions_used: (data as any)?.actions_used ?? 0,
        bonus_actions: (data as any)?.bonus_actions ?? 0,
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const planName = plan === "co_founder" ? "Co Founder"
    : plan === "aristotle" ? "Aristotle"
    : plan === "timewarp_og" ? "TimeWarp OG"
    : "Free";
  const limit = plan ? ACTION_LIMITS[plan] ?? 0 : 0;
  const bonus = data?.bonus_actions ?? 0;
  const used = data?.actions_used ?? 0;
  const total = limit === Infinity ? Infinity : limit + bonus;
  const remaining = total === Infinity ? "∞" : String(Math.max(0, total - used));

  const planFeatures = plan ? features.map(f => ({
    name: f.name,
    value: f[plan],
  })) : [];

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Current Plan</p>
          <p className="text-2xl font-bold mt-0.5">{planName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Actions Remaining</p>
          <p className="text-2xl font-bold mt-0.5 flex items-center gap-1.5 justify-end">
            <WandSparkles className="h-5 w-5 text-primary" />
            {remaining}
          </p>
        </div>
      </div>
      {hasActivePlan && planFeatures.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 pt-4 border-t border-border/50">
          {planFeatures.map(f => (
            <div key={f.name} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{f.name}</span>
              <FeatureValue value={f.value} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [purchasingPriceId, setPurchasingPriceId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { plan: currentPlan } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const prices = PRICES[billing];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setUserId(session?.user?.id);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGetStarted = async (plan: PlanKey) => {
    if (!isLoggedIn) {
      navigate("/auth?mode=signup");
      return;
    }
    if (currentPlan === plan) {
      handleManageSubscription();
      return;
    }
    setLoadingPlan(plan);
    try {
      const priceId = STRIPE_PRICES[billing][plan];
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to create checkout session", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to open subscription management", variant: "destructive" });
    }
  };

  const handlePurchasePack = async (priceId: string) => {
    if (!isLoggedIn) {
      navigate("/auth?mode=signup");
      return;
    }
    setPurchasingPriceId(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-action-purchase", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to create purchase session", variant: "destructive" });
    } finally {
      setPurchasingPriceId(null);
    }
  };

  const getPlanButtonLabel = (plan: PlanKey) => {
    if (currentPlan === plan) return "Manage Plan";
    return "Get Started";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-20 space-y-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Plans & Pricing</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select the perfect plan for your needs. All plans include full access to our platform.
          </p>
        </div>

        {/* Current plan card (only if logged in) */}
        {isLoggedIn && (
          <div className="grid md:grid-cols-2 gap-6">
            <CurrentPlanCard userId={userId} />

            {/* Action Packs */}
            <div className="rounded-2xl border-2 border-border/60 bg-card p-6 flex flex-col">
              <h2 className="text-xl font-bold mb-1">Action Packs</h2>
              <p className="text-sm text-muted-foreground mb-5">Buy additional actions instantly — no subscription required.</p>

              <div className="flex gap-3 items-end mt-auto">
                <div className="flex-1 relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      !selectedPackId && "text-muted-foreground"
                    )}
                  >
                    <span>
                      {selectedPackId
                        ? `+${ACTION_PACKS.find(p => p.priceId === selectedPackId)?.label} — ${ACTION_PACKS.find(p => p.priceId === selectedPackId)?.price}`
                        : "Select an action pack"}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", dropdownOpen && "rotate-180")} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute z-50 top-full mt-1 w-full rounded-xl border border-border/50 bg-popover shadow-md max-h-[200px] overflow-y-auto animate-in fade-in-0 zoom-in-95">
                      {ACTION_PACKS.map((pack) => (
                        <button
                          key={pack.priceId}
                          onClick={() => { setSelectedPackId(pack.priceId); setDropdownOpen(false); }}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-accent",
                            selectedPackId === pack.priceId && "bg-accent"
                          )}
                        >
                          <span className="font-medium">+{pack.label}</span>
                          <span className="text-muted-foreground">{pack.price}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => selectedPackId && handlePurchasePack(selectedPackId)}
                  disabled={!selectedPackId || purchasingPriceId !== null}
                  className="gap-1.5 shrink-0"
                >
                  {purchasingPriceId ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart className="h-4 w-4" /> Buy</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Billing toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-full bg-muted p-1 gap-1">
            {(["monthly", "quarterly", "annually"] as BillingPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setBilling(period)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                  billing === period
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {period}
                {period === "annually" && (
                  <span className="ml-1.5 text-xs text-primary font-semibold">-20%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {/* Co Founder */}
          <div className={`relative rounded-2xl border-2 ${currentPlan === "co_founder" ? "border-primary" : "border-border/60"} bg-card p-7 flex flex-col`}>
            {currentPlan === "co_founder" && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground border-primary px-4 py-1 text-xs">Your Plan</Badge>
              </div>
            )}
            <div className="h-6 mb-4" />
            <h3 className="text-xl font-bold mb-1">Co Founder</h3>
            <p className="text-muted-foreground text-sm mb-5">For early-stage founders getting started</p>
            <div className="mb-6 h-16 flex flex-col justify-center">
              <div>
                <span className="text-4xl font-bold">${prices.co_founder}</span>
                <span className="text-muted-foreground text-sm"> / mo</span>
              </div>
            </div>
            <div className="space-y-3.5 flex-1 mb-6">
              {features.map((f) => (
                <div key={f.name} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{f.name}</span>
                  <FeatureValue value={f.co_founder} />
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-auto" onClick={() => handleGetStarted("co_founder")} disabled={loadingPlan === "co_founder"}>
              {loadingPlan === "co_founder" ? <Loader2 className="h-4 w-4 animate-spin" /> : getPlanButtonLabel("co_founder")}
            </Button>
          </div>

          {/* Aristotle */}
          <div className={`relative rounded-2xl border-2 ${currentPlan === "aristotle" ? "border-primary" : "border-primary/60"} bg-card p-7 flex flex-col`}>
            {currentPlan === "aristotle" ? (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground border-primary px-4 py-1 text-xs">Your Plan</Badge>
              </div>
            ) : (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground border-primary px-4 py-1 text-xs">Most Popular</Badge>
              </div>
            )}
            <div className="h-6 mb-4" />
            <h3 className="text-xl font-bold mb-1">Aristotle</h3>
            <p className="text-muted-foreground text-sm mb-5">For growing businesses scaling operations</p>
            <div className="mb-6 h-16 flex flex-col justify-center">
              <div>
                <span className="text-4xl font-bold">${prices.aristotle}</span>
                <span className="text-muted-foreground text-sm"> / mo</span>
              </div>
            </div>
            <div className="space-y-3.5 flex-1 mb-6">
              {features.map((f) => (
                <div key={f.name} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{f.name}</span>
                  <FeatureValue value={f.aristotle} />
                </div>
              ))}
            </div>
            <Button className="w-full mt-auto" onClick={() => handleGetStarted("aristotle")} disabled={loadingPlan === "aristotle"}>
              {loadingPlan === "aristotle" ? <Loader2 className="h-4 w-4 animate-spin" /> : getPlanButtonLabel("aristotle")}
            </Button>
          </div>

          {/* TimeWarp OG */}
          <div className={`relative rounded-2xl border-2 ${currentPlan === "timewarp_og" ? "border-primary" : "border-border/60"} bg-card p-7 flex flex-col`}>
            {currentPlan === "timewarp_og" && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground border-primary px-4 py-1 text-xs">Your Plan</Badge>
              </div>
            )}
            <div className="h-6 mb-4 flex items-center gap-2">
              <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                Ends April 1st
              </Badge>
            </div>
            <h3 className="text-xl font-bold mb-1">TimeWarp OG</h3>
            <p className="text-muted-foreground text-sm mb-5">Unlimited power for serious operators</p>
            <div className="mb-6 h-16 flex flex-col justify-center">
              <div>
                <span className="text-4xl font-bold">$499</span>
                <span className="text-muted-foreground text-sm"> / 3 months</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">One-time payment</p>
            </div>
            <div className="space-y-3.5 flex-1 mb-6">
              {features.map((f) => (
                <div key={f.name} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{f.name}</span>
                  <FeatureValue value={f.timewarp_og} />
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-auto" onClick={() => handleGetStarted("timewarp_og")} disabled={loadingPlan === "timewarp_og"}>
              {loadingPlan === "timewarp_og" ? <Loader2 className="h-4 w-4 animate-spin" /> : getPlanButtonLabel("timewarp_og")}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
