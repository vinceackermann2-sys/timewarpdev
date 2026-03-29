import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Crown, Clock, Flame, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpgradeGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TW_OG_MONTHLY_PRICE_ID = "price_1T7WkLGKbzbe9CQLd7zjQtl7";

const BENEFITS = [
  { label: "Team members", value: "infinite" },
  { label: "Connected data", value: "infinite" },
  { label: "Actions / month", value: "infinite" },
  { label: "AI employees", value: "infinite" },
  { label: "AI CEO", value: "check" },
  { label: "Business Brain", value: "check" },
  { label: "Developer Line", value: "check" },
  { label: "Priority support", value: "check" },
] as const;

export function UpgradeGateDialog({ open, onOpenChange }: UpgradeGateDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: TW_OG_MONTHLY_PRICE_ID },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-0" aria-describedby={undefined}>
        <VisuallyHidden.Root><DialogTitle>Upgrade to TimeWarp OG</DialogTitle></VisuallyHidden.Root>
        <div
          className="relative px-10 pt-12 pb-10 text-center"
          style={{
            background: "linear-gradient(135deg, #05070f 0%, #0d1528 50%, #0a1020 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: "radial-gradient(circle at 50% 0%, rgba(251,191,36,0.2) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
              style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1))",
                border: "1px solid rgba(251,191,36,0.3)",
                color: "#fbbf24",
              }}
            >
              <Crown className="h-3.5 w-3.5" />
              Exclusive Early Access
            </div>

            <h2 className="text-4xl font-black text-white" style={{ letterSpacing: "-0.03em" }}>
              TimeWarp <span style={{ color: "#fbbf24" }}>OG</span>
            </h2>
          </div>
        </div>

        <div className="px-10 pb-10 pt-6 space-y-6">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold" style={{ color: "#ef4444" }}>
            <Flame className="h-4 w-4" />
            Only 23 spots left
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/80 px-5 py-3">
            {BENEFITS.map((benefit, index) => (
              <div
                key={benefit.label}
                className={`grid grid-cols-[1fr_auto] items-center gap-4 py-3 ${
                  index < BENEFITS.length - 1 ? "border-b border-border/50" : ""
                }`}
              >
                <span className="text-base text-muted-foreground">{benefit.label}</span>
                {benefit.value === "infinite" ? (
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-lg font-semibold text-primary"
                    aria-label="Infinite"
                  >
                    ∞
                  </span>
                ) : (
                  <Check className="h-5 w-5 text-primary" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

          <div className="text-center pt-1">
            <div className="text-3xl font-black text-foreground">
              $499<span className="text-base font-normal text-muted-foreground"> / 3 months</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">One-time payment · Access for 3 months</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Offer ends April 1st, 2026
          </div>

          <Button
            className="w-full h-12 text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#000",
            }}
            onClick={handlePurchase}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get TimeWarp OG — $999/mo"}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            Free users can analyze one Business DNA. Subscribe for full access.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
