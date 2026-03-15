import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlanType = "co_founder" | "aristotle" | "timewarp_og" | null;

interface SubscriptionData {
  subscribed: boolean;
  plan: PlanType;
  product_id: string | null;
  subscription_end: string | null;
}

const FREE_LIMITS = {
  dataBytes: 1 * 1024 * 1024 * 1024,
  actionsPerMonth: 0,
  devLine: false,
  priority: false,
} as const;

const PLAN_LIMITS = {
  co_founder: {
    dataBytes: 5 * 1024 * 1024 * 1024,
    actionsPerMonth: 100,
    devLine: false,
    priority: false,
  },
  aristotle: {
    dataBytes: 10 * 1024 * 1024 * 1024,
    actionsPerMonth: 1000,
    devLine: true,
    priority: false,
  },
  timewarp_og: {
    dataBytes: Infinity,
    actionsPerMonth: Infinity,
    devLine: true,
    priority: true,
  },
} as const;

export function useSubscription() {
  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ["user-subscription"],
    queryFn: async (): Promise<SubscriptionData | null> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      return data as SubscriptionData;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes — only changes on purchase/cancel
    refetchOnWindowFocus: false,
  });

  const plan = subscription?.plan ?? null;
  const limits = plan ? PLAN_LIMITS[plan] : FREE_LIMITS;

  return {
    subscription,
    plan,
    isLoading,
    refetch,
    hasActivePlan: subscription?.subscribed ?? false,
    subscriptionEnd: subscription?.subscription_end ?? null,
    canUseDevLine: limits.devLine,
    canUseScaleAssistance: limits.scaleAssistance,
    getActionLimit: () => limits.actionsPerMonth,
    getDataLimit: () => limits.dataBytes,
  };
}
