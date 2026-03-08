import { useState, useCallback } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ACTION_LIMITS: Record<string, number> = {
  co_founder: 100,
  aristotle: 1000,
  timewarp_og: Infinity,
};
const FREE_LIMIT = 20;

export function useActionGate() {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { plan } = useSubscription();
  const queryClient = useQueryClient();

  const { data: subData } = useQuery({
    queryKey: ["actions-used"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { actions_used: 0, bonus_actions: 0 };
      const { data } = await supabase
        .from("user_subscriptions")
        .select("actions_used, bonus_actions")
        .eq("user_id", session.user.id)
        .maybeSingle();
      return { actions_used: data?.actions_used ?? 0, bonus_actions: (data as any)?.bonus_actions ?? 0 };
    },
    refetchInterval: 30000,
  });

  const actionsUsed = subData?.actions_used ?? 0;
  const bonusActions = subData?.bonus_actions ?? 0;
  const limit = plan ? ACTION_LIMITS[plan] ?? FREE_LIMIT : FREE_LIMIT;
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit + bonusActions - actionsUsed);

  const checkCanUseAction = useCallback((): boolean => {
    if (remaining <= 0) {
      setShowUpgrade(true);
      return false;
    }
    return true;
  }, [remaining]);

  const refreshUsage = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["actions-used"] });
  }, [queryClient]);

  return {
    remaining,
    checkCanUseAction,
    showUpgrade,
    setShowUpgrade,
    refreshUsage,
  };
}
