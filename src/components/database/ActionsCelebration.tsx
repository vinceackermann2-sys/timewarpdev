import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WandSparkles, PartyPopper, Sparkles } from "lucide-react";

interface ActionsCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionsGranted?: number;
  reason?: "referral" | "referred" | "purchase";
}

export function ActionsCelebration({
  open,
  onOpenChange,
  actionsGranted = 125,
  reason = "referral",
}: ActionsCelebrationProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number; size: number }[]>([]);

  useEffect(() => {
    if (open) {
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5,
        size: Math.random() * 8 + 4,
      }));
      setParticles(newParticles);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border p-0 gap-0 overflow-hidden">
        {/* Confetti particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full animate-bounce"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                backgroundColor: ["hsl(var(--primary))", "#FFD700", "#FF6B6B", "#4ECDC4", "#A855F7"][p.id % 5],
                animationDelay: `${p.delay}s`,
                animationDuration: `${1 + Math.random()}s`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>

        <div className="relative text-center py-10 px-8">
          {/* Icon */}
          <div className="mx-auto mb-5 h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
            <PartyPopper className="h-10 w-10 text-primary" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Congratulations!
            <Sparkles className="h-5 w-5 text-primary" />
          </h2>

          {/* Message */}
          <p className="text-muted-foreground mb-2">
            {reason === "purchase"
              ? "Your Action Pack purchase was successful!"
              : reason === "referred"
              ? "Welcome to TimeWarp! You've received bonus Actions from a referral."
              : "A friend signed up with your referral link!"}
          </p>

          {/* Actions count */}
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-3 mb-6">
            <WandSparkles className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold text-primary">+{actionsGranted}</span>
            <span className="text-sm font-medium text-primary">Actions</span>
          </div>

          <p className="text-xs text-muted-foreground mb-6">
            These Actions have been added to your personal balance.
          </p>

          <Button onClick={() => onOpenChange(false)} className="w-full">
            Awesome, let's go!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
