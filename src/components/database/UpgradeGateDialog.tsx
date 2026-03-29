import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Star, Infinity as InfinityIcon, Check, Zap, Shield, Rocket, Target, Layers, Cpu, Loader2, X, Users, HardDrive, WandSparkles, Bot, Code, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpgradeGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TW_OG_PRICE_ID = "price_1TGKOzGKbzbe9CQL8pj9zYEf";

const features = [
  { name: "Team members", icon: Users, type: "unlimited" as const },
  { name: "Connected data", icon: HardDrive, type: "unlimited" as const },
  { name: "Actions / month", icon: WandSparkles, type: "unlimited" as const },
  { name: "AI Employees", icon: Bot, type: "unlimited" as const },
  { name: "Developer Line", icon: Code, type: "priority" as const },
  { name: "Support", icon: Headphones, type: "included" as const },
];

function useCountdown(targetDate: Date) {
  const calc = () => {
    const diff = Math.max(0, targetDate.getTime() - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };
  const [timeLeft, setTimeLeft] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calc), 1000);
    return () => clearInterval(id);
  }, []);
  return timeLeft;
}

export function UpgradeGateDialog({ open, onOpenChange }: UpgradeGateDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const timeLeft = useCountdown(new Date("2026-04-01T00:00:00"));
  const fmt = (v: number) => v.toString().padStart(2, "0");

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: TW_OG_PRICE_ID },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to start checkout", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border border-border rounded-[2rem] shadow-xl [&>button]:hidden" style={{ boxShadow: "0 25px 50px -12px rgba(51,153,255,0.1)" }} aria-describedby={undefined}>
        <VisuallyHidden.Root><DialogTitle>Upgrade to TimeWarp OG</DialogTitle></VisuallyHidden.Root>

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={18} />
        </button>

        {/* Background image + overlay */}
        <div
          className="absolute inset-0 z-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 z-0 bg-background/90 backdrop-blur-md" />

        <div className="relative z-10 p-8 sm:p-10">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-4">
              TimeWarp <span className="text-primary">OG</span>
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-500/20 shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                Only 23 spots left
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-foreground text-[10px] sm:text-sm lg:text-base font-bold bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-sm whitespace-nowrap">
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-yellow-400 fill-yellow-400 shrink-0" />
                <span>
                  <span className="hidden md:inline">Offer ends in: </span>
                  <span className="hidden sm:inline md:hidden">Ends in: </span>
                  <span className="text-foreground tabular-nums">{timeLeft.days}d {fmt(timeLeft.hours)}h {fmt(timeLeft.minutes)}m {fmt(timeLeft.seconds)}s</span>
                </span>
              </div>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
            {features.map((f, i) => (
              <div
                key={i}
                className="relative flex flex-col items-center justify-center p-4 min-h-[140px] sm:min-h-[160px] bg-card rounded-2xl border border-border text-center transition-all hover:-translate-y-1 shadow-md overflow-hidden group"
                style={{ boxShadow: "0 4px 14px -4px rgba(51,153,255,0.05)" }}
              >
                {/* Subtle glow */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary/20 blur-2xl rounded-full pointer-events-none transition-all group-hover:bg-primary/40" />
                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-primary/10 blur-2xl rounded-full pointer-events-none" />
                {/* Grain */}
                <div
                  className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
                />

                <div className="mb-3 text-primary relative z-10 transition-transform group-hover:scale-110 duration-300">
                  <f.icon size={28} strokeWidth={2} />
                </div>
                <span className="text-foreground font-bold text-sm mb-3 leading-tight relative z-10">{f.name}</span>
                <div className="mt-auto relative z-10">
                  {f.type === "unlimited" ? (
                    <div className="flex items-center justify-center gap-1.5 text-foreground font-bold text-xs bg-background/80 border border-border shadow-sm px-2.5 py-1 rounded-full backdrop-blur-sm">
                      <InfinityIcon size={14} strokeWidth={3} /> Unlimited
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 text-foreground font-bold text-xs bg-background/80 border border-border shadow-sm px-2.5 py-1 rounded-full backdrop-blur-sm">
                      <Check size={14} strokeWidth={3} /> Included
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Price */}
          <div className="flex items-end gap-2 mb-8">
            <span className="text-6xl font-extrabold text-foreground tracking-tighter">$499</span>
            <span className="text-muted-foreground font-semibold mb-2">for 3 months</span>
          </div>

          {/* CTA */}
          <Button
            className="w-full h-14 text-lg font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            style={{
              background: "#3399ff",
              color: "#fff",
              boxShadow: "0 10px 30px -5px rgba(51,153,255,0.25)",
            }}
            onClick={handlePurchase}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Become an OG"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
