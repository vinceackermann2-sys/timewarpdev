import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Loader2, ShoppingCart, ChevronDown, WandSparkles, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type BillingPeriod = "monthly" | "quarterly" | "annually";
type PlanKey = "co_founder" | "aristotle" | "timewarp_og";
type DisplayPlan = "free" | PlanKey;

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
  aristotle: 500,
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

// Benefits — must reflect what is actually enforced by useSubscription / DB
const PLAN_BENEFITS: Record<DisplayPlan, { tagline: string; bullets: string[] }> = {
  free: {
    tagline: "Try us out, see what lands",
    bullets: ["10 Actions", "1 AI Employee", "Up to 50 AI employees & agents"],
  },
  co_founder: {
    tagline: "For early-stage founders getting started",
    bullets: [
      "100 Actions",
      "Up to 10 AI employees",
      "Smarter brain",
    ],
  },
  aristotle: {
    tagline: "For growing businesses scaling operations",
    bullets: [
      "Everything in Co Founder, plus:",
      "250 Actions",
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

function CurrentPlanCard({ userId }: { userId?: string }) {
  const { plan } = useSubscription();

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

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Current Plan</p>
          <p className="text-2xl font-bold mt-1">{planName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Actions Remaining</p>
          <p className="text-2xl font-bold mt-1 flex items-center gap-1.5 justify-end">
            <WandSparkles className="h-5 w-5 text-primary" />
            {remaining}
          </p>
        </div>
      </div>
    </div>
  );
}

interface PlanCardProps {
  planKey: DisplayPlan;
  title: string;
  price: string;
  priceSuffix?: string;
  priceSubtitle?: string;
  badge?: { label: string; variant: "popular" | "warning" } | null;
  buttonLabel: string;
  buttonVariant: "primary" | "outline" | "dark";
  buttonGradient?: boolean;
  loading?: boolean;
  onClick: () => void;
}

function PlanCard({
  planKey,
  title,
  price,
  priceSuffix,
  priceSubtitle,
  badge,
  buttonLabel,
  buttonVariant,
  buttonGradient,
  loading,
  onClick,
}: PlanCardProps) {
  const benefits = PLAN_BENEFITS[planKey];

  return (
    <div className="relative rounded-3xl border border-border p-8 flex flex-col shadow-sm bg-white">
      {/* Badge top right */}
      {badge && (
        <div className="absolute top-6 right-6">
          <Badge
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-full",
              badge.variant === "popular" && "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10",
              badge.variant === "warning" && "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/10"
            )}
          >
            {badge.label}
          </Badge>
        </div>
      )}

      {/* Sparkle icon */}
      <Sparkles className="h-6 w-6 text-primary mb-6" strokeWidth={2} />

      {/* Title + tagline */}
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-8 min-h-[40px]">{benefits.tagline}</p>

      {/* Price */}
      <div className="mb-8 flex items-end gap-3">
        <span className="text-5xl font-bold tracking-tight leading-none">{price}</span>
        {priceSuffix && (
          <div className="text-xs text-muted-foreground leading-tight pb-1">
            {priceSuffix.split("\n").map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
      </div>
      {priceSubtitle && (
        <p className="text-xs text-muted-foreground -mt-6 mb-6">{priceSubtitle}</p>
      )}

      {/* CTA Button */}
      <Button
        onClick={onClick}
        disabled={loading}
        className={cn(
          "w-full h-12 rounded-full font-semibold mb-8",
          buttonVariant === "primary" && !buttonGradient && "bg-foreground text-background hover:bg-foreground/90",
          buttonVariant === "outline" && "text-foreground border border-border bg-background",
          buttonVariant === "dark" && "bg-foreground text-background hover:bg-foreground/90",
          buttonGradient && "bg-primary text-primary-foreground hover:opacity-90 border-0 hover:no-underline"
        )}
        variant={buttonGradient ? "link" : "default"}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : buttonLabel}
      </Button>

      {/* Benefits list */}
      <ul className="space-y-3 mt-auto">
        {benefits.bullets.map((bullet, i) => {
          const isHeader = bullet.endsWith(":");
          if (isHeader) {
            return (
              <li key={i} className="text-sm font-semibold text-foreground pt-1">
                {bullet}
              </li>
            );
          }
          return (
            <li key={i} className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-4 w-4 text-primary" strokeWidth={2.5} />
              </div>
              <span className="text-sm text-foreground/80">{bullet}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function PricingPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [purchasingPriceId, setPurchasingPriceId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { plan: currentPlan, hasActivePlan } = useSubscription();
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
    const wsId = localStorage.getItem("preferred_workspace_id");
    if (!wsId) {
      toast({ title: "Select a workspace", description: "Plans are per workspace — open the app and pick one first.", variant: "destructive" });
      return;
    }
    setLoadingPlan(plan);
    try {
      const priceId = STRIPE_PRICES[billing][plan];
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, workspaceId: wsId },
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
    toast({ title: "Manage from Stripe receipt", description: "Use the link in your Stripe receipt email to update or cancel." });
  };

  const handlePurchasePack = async (priceId: string) => {
    if (!isLoggedIn) {
      navigate("/auth?mode=signup");
      return;
    }
    const wsId = localStorage.getItem("preferred_workspace_id");
    if (!wsId) {
      toast({ title: "Select a workspace", description: "Action packs are per workspace — open the app and pick one first.", variant: "destructive" });
      return;
    }
    setPurchasingPriceId(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-action-purchase", {
        body: { priceId, workspaceId: wsId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to create purchase session", variant: "destructive" });
    } finally {
      setPurchasingPriceId(null);
    }
  };

  const isFree = !hasActivePlan;
  const periodSuffix = billing === "monthly" ? "USD / month\nbilled monthly"
    : billing === "quarterly" ? "USD / month\nbilled quarterly"
    : "USD / month\nbilled annually";

  return (
    <div className="min-h-screen bg-background">
      {!embedded && (
        <div className="max-w-6xl mx-auto px-4 pt-8 pb-4">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 pb-20 space-y-12">
        {/* Header */}
        <div className="text-center pt-8">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">Plans & Pricing</h1>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-full p-1.5 gap-1 border border-border bg-[#f3f5f7]">
            {(["monthly", "quarterly", "annually"] as BillingPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setBilling(period)}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all capitalize",
                  billing === period
                    ? "shadow-sm bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {period}
                {period === "annually" && (
                  <span className={cn("ml-1.5 text-xs font-semibold", billing === period ? "text-primary-foreground/90" : "text-primary")}>
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards — Free / Co Founder / Aristotle */}
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          <PlanCard
            planKey="free"
            title="Free"
            price="€0"
            buttonLabel={isFree ? "Manage Plan" : "Downgrade"}
            buttonVariant="outline"
            onClick={() => {
              if (isFree) return;
              handleManageSubscription();
            }}
          />

          <PlanCard
            planKey="co_founder"
            title="Co Founder"
            price={`$${prices.co_founder}`}
            priceSuffix={periodSuffix}
            badge={null}
            buttonLabel={currentPlan === "co_founder" ? "Manage Plan" : "Get Started"}
            buttonVariant="dark"
            loading={loadingPlan === "co_founder"}
            onClick={() => handleGetStarted("co_founder")}
          />

          <PlanCard
            planKey="aristotle"
            title="Aristotle"
            price={`$${prices.aristotle}`}
            priceSuffix={periodSuffix}
            badge={currentPlan === "aristotle" ? { label: "Your Plan", variant: "popular" } : { label: "Most Popular", variant: "popular" }}
            buttonLabel={currentPlan === "aristotle" ? "Manage Plan" : "Get Started"}
            buttonVariant="primary"
            buttonGradient
            loading={loadingPlan === "aristotle"}
            onClick={() => handleGetStarted("aristotle")}
          />
        </div>

        {/* Current plan & Action Packs (only if logged in) */}
        {isLoggedIn && (
          <div className="grid md:grid-cols-2 gap-6">
            <CurrentPlanCard userId={userId} />

            {/* Action Packs */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <h2 className="text-xl font-bold mb-1">Action Packs</h2>
              <p className="text-sm text-muted-foreground mb-5">Buy additional actions instantly — no subscription required.</p>

              <div className="flex gap-3 items-end mt-auto">
                <div className="flex-1 relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background transition-colors",
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
                  className="gap-1.5 shrink-0 rounded-md"
                >
                  {purchasingPriceId ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart className="h-4 w-4" /> Buy</>}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
