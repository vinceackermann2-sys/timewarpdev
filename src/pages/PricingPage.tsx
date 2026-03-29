import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";

type BillingPeriod = "monthly" | "quarterly" | "annually";
type PlanKey = "co_founder" | "aristotle" | "timewarp_og";

const STRIPE_PRICES: Record<BillingPeriod, Record<PlanKey, string>> = {
  monthly: {
    co_founder: "price_1T7WhZGKbzbe9CQL2XgsQJ1i",
    aristotle: "price_1T7WjHGKbzbe9CQLopjmOrkg",
    timewarp_og: "price_1TGKOzGKbzbe9CQL8pj9zYEf",
  },
  quarterly: {
    co_founder: "price_1T7WicGKbzbe9CQLJc2YAgFa",
    aristotle: "price_1T7WjhGKbzbe9CQLt570pbGz",
    timewarp_og: "price_1T7WkqGKbzbe9CQLtJEqLbQv",
  },
  annually: {
    co_founder: "price_1T7WirGKbzbe9CQLlNxy4zyK",
    aristotle: "price_1T7Wk6GKbzbe9CQLzECMgYMt",
    timewarp_og: "price_1T7WltGKbzbe9CQLhNXfJ2Tf",
  },
};

const PRICES: Record<BillingPeriod, Record<PlanKey, number>> = {
  monthly: { co_founder: 69, aristotle: 109, timewarp_og: 499 },
  quarterly: { co_founder: 62, aristotle: 98, timewarp_og: 499 },
  annually: { co_founder: 55, aristotle: 87, timewarp_og: 499 },
};

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
  { name: "AI CEO", co_founder: true, aristotle: true, timewarp_og: true },
  { name: "Business Brain", co_founder: true, aristotle: true, timewarp_og: true },
  { name: "Developer Line", co_founder: false, aristotle: true, timewarp_og: true },
  { name: "Priority Support", co_founder: false, aristotle: false, timewarp_og: true },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === "string") {
    return <span className="text-sm font-medium text-foreground">{value}</span>;
  }
  return value ? (
    <Check className="h-5 w-5 text-blue-500" />
  ) : (
    <X className="h-5 w-5 text-muted-foreground/40" />
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { plan: currentPlan } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const prices = PRICES[billing];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  const handleGetStarted = async (plan: PlanKey) => {
    if (!isLoggedIn) {
      navigate("/auth?mode=signup");
      return;
    }

    if (currentPlan === plan) {
      // Already on this plan, open customer portal
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
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to open subscription management",
        variant: "destructive",
      });
    }
  };

  const getPlanButtonLabel = (plan: PlanKey) => {
    if (currentPlan === plan) return "Manage Plan";
    return "Get Started";
  };

  return (
    <div className="min-h-screen b bg-background">
      <div className="max-w-[1900px] mx-auto px-4 pt-8 pb-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>

      <div className="max-w-[1900px] mx-auto px-4 pb-20">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select the perfect plan for your needs. All plans include full access to our platform.
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center rounded-full bg-muted p-1 gap-1">
            {(["monthly", "quarterly", "annually"] as BillingPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setBilling(period)}
                className={`p3 sm:px-x-5 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                  billing === period
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {period}
                {period === "annually" && (
                  <span className="ml-1.5 text-xs text-blue-500 font-semibold">-20%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Co Founder */}
          <div className={`relative rounded-2xl border-2 ${currentPlan === "co_founder" ? "border-green-500" : "border-border/60"} bg-card p-7 flex flex-col`}>
            {currentPlan === "co_founder" && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="bg-green-500 text-white border-green-500 px-4 py-1 text-xs">Your Plan</Badge>
              </div>
            )}
            <div className="mb-4" />
            <h3 className="text-xl font-bold mb-1">Co Founder</h3>
            <p className="text-muted-foreground text-sm mb-5">For early-stage founders getting started</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">${prices.co_founder}</span>
              <span className="text-muted-foreground text-sm"> / mo</span>
            </div>
            <div className="space-y-3.5 flex-1 mb-6">
              {features.map((f) => (
                <div key={f.name} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{f.name}</span>
                  <FeatureValue value={f.co_founder} />
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleGetStarted("co_founder")}
              disabled={loadingPlan === "co_founder"}
            >
              {loadingPlan === "co_founder" ? <Loader2 className="h-4 w-4 animate-spin" /> : getPlanButtonLabel("co_founder")}
            </Button>
          </div>

          {/* Aristotle */}
          <div className={`relative rounded-2xl border-2 ${currentPlan === "aristotle" ? "border-green-500" : "border-blue-500"} bg-card p-7 flex flex-col scmd:ale-[1.02] z-10`}>
            {currentPlan === "aristotle" ? (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="bg-green-500 text-white border-green-500 px-4 py-1 text-xs">Your Plan</Badge>
              </div>
            ) : (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-500 text-white border-blue-500 px-4 py-1 text-xs">Most Popular</Badge>
              </div>
            )}
            <div className="mb-4" />
            <h3 className="text-xl font-bold mb-1">Aristotle</h3>
            <p className="text-muted-foreground text-sm mb-5">For growing businesses scaling operations</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">${prices.aristotle}</span>
              <span className="text-muted-foreground text-sm"> / mo</span>
            </div>
            <div className="space-y-3.5 flex-1 mb-6">
              {features.map((f) => (
                <div key={f.name} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{f.name}</span>
                  <FeatureValue value={f.aristotle} />
                </div>
              ))}
            </div>
            <Button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => handleGetStarted("aristotle")}
              disabled={loadingPlan === "aristotle"}
            >
              {loadingPlan === "aristotle" ? <Loader2 className="h-4 w-4 animate-spin" /> : getPlanButtonLabel("aristotle")}
            </Button>
          </div>

          {/* TimeWarp OG */}
          <div className={`relative rounded-2xl border-2 ${currentPlan === "timewarp_og" ? "border-green-500" : "border-border/60"} bg-card p-7 flex flex-col`}>
            {currentPlan === "timewarp_og" && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="bg-green-500 text-white border-green-500 px-4 py-1 text-xs">Your Plan</Badge>
              </div>
            )}
            <div className="mb-4 flex gap-2">
              <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200 text-xs">
                Ends April 1st
              </Badge>
            </div>
            <h3 className="text-xl font-bold mb-1">TimeWarp OG</h3>
            <p className="text-muted-foreground text-sm mb-5">Unlimited power for serious operators</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$499</span>
              <span className="text-muted-foreground text-sm"> / 3 months</span>
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
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleGetStarted("timewarp_og")}
              disabled={loadingPlan === "timewarp_og"}
            >
              {loadingPlan === "timewarp_og" ? <Loader2 className="h-4 w-4 animate-spin" /> : getPlanButtonLabel("timewarp_og")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
