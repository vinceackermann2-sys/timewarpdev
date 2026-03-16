import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Clock, Flame, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpgradeGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TW_OG_MONTHLY_PRICE_ID = "price_1T7WkLGKbzbe9CQLd7zjQtl7";

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
      <DialogContent className="max-w-md p-0 overflow-hidden border-0">
        {/* Header with gradient */}
        <div className="relative px-6 pt-8 pb-6 text-center"
          style={{
            background: "linear-gradient(135deg, #05070f 0%, #0d1528 50%, #0a1020 100%)",
          }}
        >
          {/* Glow */}
          <div className="absolute inset-0 opacity-30" style={{
            background: "radial-gradient(circle at 50% 0%, rgba(251,191,36,0.2) 0%, transparent 70%)",
          }} />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
              style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1))",
                border: "1px solid rgba(251,191,36,0.3)",
                color: "#fbbf24",
              }}
            >
              <Crown className="h-3.5 w-3.5" />
              Exclusive Early Access
            </div>

            <h2 className="text-2xl font-black text-white mb-2" style={{ letterSpacing: "-0.03em" }}>
              TimeWarp <span style={{ color: "#fbbf24" }}>OG</span>
            </h2>
            <p className="text-sm text-slate-400 max-w-xs mx-auto">
              Get unlimited actions, employees, data conversion, and priority support.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-4 space-y-4">
          {/* Spots badge */}
          <div className="flex items-center justify-center gap-2 text-sm font-semibold" style={{ color: "#ef4444" }}>
            <Flame className="h-4 w-4" />
            Only 23 spots left
          </div>

          {/* Price */}
          <div className="text-center">
            <div className="text-3xl font-black text-foreground">$799<span className="text-base font-normal text-muted-foreground">/mo</span></div>
            <p className="text-xs text-muted-foreground mt-1">Billed monthly · Locked in forever</p>
          </div>

          {/* Deadline */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Offer ends April 1st, 2026
          </div>

          {/* CTA */}
          <Button
            className="w-full h-11 text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#000",
            }}
            onClick={handlePurchase}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get TimeWarp OG — $799/mo"}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            Free users can analyze one Business DNA. Subscribe for full access.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
