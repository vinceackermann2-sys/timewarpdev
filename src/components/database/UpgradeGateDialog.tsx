import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Clock, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface UpgradeGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeGateDialog({ open, onOpenChange }: UpgradeGateDialogProps) {
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    supabase
      .from("platform_config")
      .select("value")
      .eq("key", "og_spots_remaining")
      .single()
      .then(({ data }) => {
        if (data?.value) setSpotsLeft(parseInt(data.value, 10));
      });
  }, [open]);

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
              Unlock unlimited actions, employees, data conversion, and priority support.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-4 space-y-4">
          {/* Spots badge */}
          {spotsLeft !== null && (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold" style={{ color: spotsLeft <= 5 ? "#ef4444" : "#fbbf24" }}>
              <Flame className="h-4 w-4" />
              Only {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
            </div>
          )}

          {/* Price */}
          <div className="text-center">
            <div className="text-3xl font-black text-foreground">$799<span className="text-base font-normal text-muted-foreground">/mo</span></div>
            <p className="text-xs text-muted-foreground mt-1">Billed annually · Locked in forever</p>
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
            onClick={() => {
              onOpenChange(false);
              navigate("/timewarp-og");
            }}
          >
            Apply Now — No Credit Card Required
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            Free users can analyze one Business DNA. Upgrade for full access.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
