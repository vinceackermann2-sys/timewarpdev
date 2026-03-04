import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlanType = "co_founder" | "aristotle" | "timewarp_og" | null;

interface Subscription {
  plan: PlanType;
  billing_period: string;
  status: string;
  actions_used: number;
  data_used_bytes: number;
}

const PLAN_LIMITS = {
  co_founder: {
    dataBytes: 5 * 1024 * 1024 * 1024, // 5GB
    actionsPerMonth: 100,
    devLine: false,
    scaleAssistance: false,
  },
  aristotle: {
    dataBytes: 10 * 1024 * 1024 * 1024, // 10GB
    actionsPerMonth: 1000,
    devLine: true,
    scaleAssistance: false,
  },
  timewarp_og: {
    dataBytes: Infinity,
    actionsPerMonth: Infinity,
    devLine: true,
    scaleAssistance: true,
  },
} as const;

export function useSubscription() {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["user-subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      return data as Subscription | null;
    },
  });

  const plan = subscription?.plan ?? null;
  const limits = plan ? PLAN_LIMITS[plan] : null;

  return {
    subscription,
    plan,
    isLoading,
    hasActivePlan: !!plan,
    canUseDevLine: limits?.devLine ?? false,
    canUseScaleAssistance: limits?.scaleAssistance ?? false,
    getActionLimit: () => limits?.actionsPerMonth ?? 0,
    getDataLimit: () => limits?.dataBytes ?? 0,
    actionsUsed: subscription?.actions_used ?? 0,
    dataUsed: subscription?.data_used_bytes ?? 0,
    isOverActionLimit: () => {
      if (!limits) return true;
      if (limits.actionsPerMonth === Infinity) return false;
      return (subscription?.actions_used ?? 0) >= limits.actionsPerMonth;
    },
    isOverDataLimit: () => {
      if (!limits) return true;
      if (limits.dataBytes === Infinity) return false;
      return (subscription?.data_used_bytes ?? 0) >= limits.dataBytes;
    },
  };
}
