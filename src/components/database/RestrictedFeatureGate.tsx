import { ReactNode, useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeGateDialog } from "./UpgradeGateDialog";
import { useSubscription } from "@/hooks/useSubscription";

interface RestrictedFeatureGateProps {
  featureName: string;
  description: string;
  children: ReactNode;
}

export function RestrictedFeatureGate({ featureName, description, children }: RestrictedFeatureGateProps) {
  const { subscription, isLoading } = useSubscription();
  const [showGate, setShowGate] = useState(false);

  // User is free only if they have no active plan at all (no Stripe AND no DB plan)
  const isFreeUser = !isLoading && !subscription?.subscribed && !subscription?.plan;

  useEffect(() => {
    if (isFreeUser) {
      setShowGate(true);
    }
  }, [isFreeUser]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-8">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking access…
        </div>
      </div>
    );
  }

  if (!isFreeUser) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex h-full items-center justify-center bg-background p-8">
        <div className="max-w-md space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">{featureName} is part of TimeWarp OG</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Button onClick={() => setShowGate(true)}>
            View TimeWarp OG
          </Button>
        </div>
      </div>
      <UpgradeGateDialog open={showGate} onOpenChange={setShowGate} />
    </>
  );
}
