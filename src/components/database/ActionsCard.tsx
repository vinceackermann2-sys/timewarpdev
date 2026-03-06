import { Link } from "react-router-dom";
import { WandSparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ACTION_LIMITS: Record<string, number> = {
  co_founder: 100,
  aristotle: 1000,
  timewarp_og: Infinity,
};

const FREE_LIMIT = 20;

export function ActionsCard({ isCollapsed }: { isCollapsed: boolean }) {
  const { plan } = useSubscription();

  const { data: actionsUsed = 0 } = useQuery({
    queryKey: ["actions-used"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return 0;
      const { data } = await supabase
        .from("user_subscriptions")
        .select("actions_used")
        .eq("user_id", session.user.id)
        .maybeSingle();
      return data?.actions_used ?? 0;
    },
    refetchInterval: 30000,
  });

  const limit = plan ? ACTION_LIMITS[plan] ?? FREE_LIMIT : FREE_LIMIT;
  const isUnlimited = limit === Infinity;
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - actionsUsed);
  const percentage = isUnlimited ? 100 : limit > 0 ? Math.min(100, (actionsUsed / limit) * 100) : 100;
  const isLow = !isUnlimited && remaining <= Math.ceil(limit * 0.2);

  if (isCollapsed) {
    return (
      <Link
        to="/pricing"
        className="flex justify-center p-2 rounded-md hover:bg-accent transition-colors"
        title={isUnlimited ? "Unlimited actions" : `${remaining} actions remaining`}
      >
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <WandSparkles className="h-4 w-4 text-primary-foreground" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/pricing"
      className="block rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Get more Actions</p>
          <p className="text-xs text-muted-foreground">
            {isUnlimited
              ? "Unlimited actions"
              : `${remaining} actions remaining`}
          </p>
        </div>
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <WandSparkles className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
      </div>
    </Link>
  );
}
