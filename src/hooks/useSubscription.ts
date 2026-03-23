import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PlanType = "co_founder" | "aristotle" | "timewarp_og" | null;

interface SubscriptionData {
  subscribed: boolean;
  plan: PlanType;
  product_id: string | null;
  subscription_end: string | null;
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

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
  const { user, isLoading: authLoading } = useAuth();

  // Primary: read from DB table only (no edge function call)
  const { data: subscription, isLoading: queryLoading, refetch } = useQuery({
    queryKey: ["user-subscription", user?.id],
    queryFn: async (): Promise<SubscriptionData | null> => {
      if (!user) return null;

      const { data: storedSubscription, error } = await (supabase as any)
        .from("user_subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("Failed to fetch subscription from DB:", error.message);
        return { subscribed: false, plan: null, product_id: null, subscription_end: null };
      }

      if (storedSubscription && ACTIVE_SUBSCRIPTION_STATUSES.has(storedSubscription.status)) {
        return {
          subscribed: true,
          plan: storedSubscription.plan as PlanType,
          product_id: (storedSubscription as any).product_id ?? null,
          subscription_end: (storedSubscription as any).subscription_end ?? null,
        };
      }

      return { subscribed: false, plan: null, product_id: null, subscription_end: null };
    },
    enabled: !!user && !authLoading,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isLoading = authLoading || queryLoading;

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
    canUsePriority: limits.priority,
    getActionLimit: () => limits.actionsPerMonth,
    getDataLimit: () => limits.dataBytes,
  };
}
