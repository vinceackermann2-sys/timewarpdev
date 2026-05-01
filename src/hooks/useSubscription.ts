import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useEffect, useRef } from "react";

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
  actionsPerMonth: 100,
  devLine: false,
  priority: false,
  maxEmployees: 1,
  maxBusinesses: 1,
  maxTeamMembers: Infinity,
} as const;

const PLAN_LIMITS = {
  co_founder: {
    dataBytes: 5 * 1024 * 1024 * 1024,
    actionsPerMonth: 100,
    devLine: false,
    priority: false,
    maxEmployees: 10,
    maxBusinesses: 3,
  },
  aristotle: {
    dataBytes: 10 * 1024 * 1024 * 1024,
    actionsPerMonth: 500,
    devLine: true,
    priority: false,
    maxEmployees: 50,
    maxBusinesses: 10,
  },
  timewarp_og: {
    dataBytes: Infinity,
    actionsPerMonth: Infinity,
    devLine: true,
    priority: true,
    maxEmployees: Infinity,
    maxBusinesses: Infinity,
  },
} as const;

/**
 * Plans are scoped per WORKSPACE — not per user.
 * Every member of the active workspace sees the same plan and shares its action pool.
 */
export function useSubscription() {
  const { user, isLoading: authLoading } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const stripeSyncDone = useRef<string | null>(null);

  const { data: subscription, isLoading: queryLoading, refetch } = useQuery({
    queryKey: ["workspace-subscription", activeWorkspaceId],
    queryFn: async (): Promise<SubscriptionData | null> => {
      if (!activeWorkspaceId) return { subscribed: false, plan: null, product_id: null, subscription_end: null };

      const { data, error } = await (supabase as any)
        .from("workspace_subscriptions")
        .select("plan, status, subscription_end")
        .eq("workspace_id", activeWorkspaceId)
        .maybeSingle();

      if (error) {
        console.warn("Failed to fetch workspace subscription:", error.message);
        return { subscribed: false, plan: null, product_id: null, subscription_end: null };
      }

      if (data && ACTIVE_SUBSCRIPTION_STATUSES.has(data.status)) {
        return {
          subscribed: true,
          plan: data.plan as PlanType,
          product_id: null,
          subscription_end: (data as any)?.subscription_end ?? null,
        };
      }

      return { subscribed: false, plan: null, product_id: null, subscription_end: null };
    },
    enabled: !!user && !authLoading && !!activeWorkspaceId,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Sync Stripe → workspace_subscriptions for the active workspace, at most once per 30 minutes
  useEffect(() => {
    if (!user || authLoading || !activeWorkspaceId) return;
    if (stripeSyncDone.current === activeWorkspaceId) return;
    stripeSyncDone.current = activeWorkspaceId;

    const lastSync = sessionStorage.getItem(`stripe_sync_ts_${activeWorkspaceId}`);
    if (lastSync && Date.now() - Number(lastSync) < 30 * 60 * 1000) return;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-subscription", {
          body: { workspaceId: activeWorkspaceId },
        });
        if (error) {
          console.warn("Stripe sync failed:", error.message);
          return;
        }
        sessionStorage.setItem(`stripe_sync_ts_${activeWorkspaceId}`, String(Date.now()));
        if (data?.plan) refetch();
      } catch (err) {
        console.warn("Stripe sync error:", err);
      }
    })();
  }, [user, authLoading, activeWorkspaceId, refetch]);

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
    getEmployeeLimit: () => limits.maxEmployees,
    getBusinessLimit: () => limits.maxBusinesses,
  };
}
