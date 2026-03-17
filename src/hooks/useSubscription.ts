import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ["user-subscription"],
    queryFn: async (): Promise<SubscriptionData | null> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const [{ data, error }, { data: storedSubscription, error: storedSubscriptionError }] = await Promise.all([
        supabase.functions.invoke("check-subscription"),
        supabase
          .from("user_subscriptions")
          .select("plan, status")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const remoteSubscription = error ? null : (data as SubscriptionData | null);
      const storedPlan = storedSubscription && ACTIVE_SUBSCRIPTION_STATUSES.has(storedSubscription.status)
        ? (storedSubscription.plan as PlanType)
        : null;

      if (remoteSubscription?.subscribed || remoteSubscription?.plan) {
        return remoteSubscription;
      }

      if (storedPlan) {
        return {
          subscribed: true,
          plan: storedPlan,
          product_id: remoteSubscription?.product_id ?? null,
          subscription_end: remoteSubscription?.subscription_end ?? null,
        };
      }

      if (error || storedSubscriptionError) {
        console.warn("Subscription fallback used", {
          remoteError: error?.message ?? null,
          storedSubscriptionError: storedSubscriptionError?.message ?? null,
        });
      }

      return remoteSubscription ?? {
        subscribed: false,
        plan: null,
        product_id: null,
        subscription_end: null,
      };
    },
    staleTime: 30 * 60 * 1000,
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
    canUsePriority: limits.priority,
    getActionLimit: () => limits.actionsPerMonth,
    getDataLimit: () => limits.dataBytes,
  };
}
