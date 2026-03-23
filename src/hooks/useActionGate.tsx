import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActionsDialog } from "@/components/database/ActionsDialog";
import { useAuth } from "@/hooks/useAuth";

const ACTION_LIMITS: Record<string, number> = {
  co_founder: 100,
  aristotle: 1000,
  timewarp_og: Infinity,
};
const FREE_LIMIT = 0;

interface ActionGateContextType {
  remaining: number;
  checkCanUseAction: () => boolean;
  refreshUsage: () => void;
}

const ActionGateContext = createContext<ActionGateContextType>({
  remaining: 0,
  checkCanUseAction: () => true,
  refreshUsage: () => {},
});

export function ActionGateProvider({ children }: { children: ReactNode }) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();

  const { data: subData } = useQuery({
    queryKey: ["actions-used", user?.id],
    queryFn: async () => {
      if (!user) return { actions_used: 0, bonus_actions: 0, plan: null as string | null };

      const { data } = await supabase
        .from("user_subscriptions")
        .select("actions_used, bonus_actions, plan, status")
        .eq("user_id", user.id)
        .maybeSingle();
      const isActive = data?.status && ["active", "trialing", "past_due"].includes(data.status);
      return {
        actions_used: data?.actions_used ?? 0,
        bonus_actions: (data as any)?.bonus_actions ?? 0,
        plan: isActive ? (data?.plan as string) ?? null : null,
      };
    },
    enabled: !!user && !authLoading,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const actionsUsed = subData?.actions_used ?? 0;
  const bonusActions = subData?.bonus_actions ?? 0;
  const dbPlan = subData?.plan ?? null;
  const limit = dbPlan ? ACTION_LIMITS[dbPlan] ?? FREE_LIMIT : FREE_LIMIT;
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

  return (
    <ActionGateContext.Provider value={{ remaining, checkCanUseAction, refreshUsage }}>
      {children}
      {showUpgrade ? <ActionsDialog open={showUpgrade} onOpenChange={setShowUpgrade} /> : null}
    </ActionGateContext.Provider>
  );
}

export function useActionGate() {
  return useContext(ActionGateContext);
}
