// Shared helper for workspace-scoped action consumption.
// All AI runners should call this with the active workspace id from the client.
// Falls back to the first workspace the user owns/edits if none was passed.

export type SupabaseClient = any;

export interface ConsumeActionResult {
  allowed: boolean;
  workspaceId: string | null;
  reason?: string;
  actionsUsed?: number;
  consumed?: number;
  costUsd?: number;
}

/**
 * Cost-per-action constant. 1 action = $0.08 of AI/API cost.
 * A small chat message that costs $0.005 of AI = 0.0625 actions.
 * A heavy multi-step browser run that costs $0.30 of AI = 3.75 actions.
 */
export const ACTION_COST_USD = 0.08;

/**
 * Resolve the workspace to charge an action against.
 * Order:
 *   1. explicit `workspaceId` (validated as a member)
 *   2. first workspace the user is owner/editor of
 */
export async function resolveWorkspaceId(
  supabase: SupabaseClient,
  userId: string,
  requested?: string | null,
): Promise<string | null> {
  if (requested) {
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", requested)
      .eq("user_id", userId)
      .maybeSingle();
    if (member) return requested;
  }

  const { data: anyMember } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return anyMember?.workspace_id ?? null;
}

/**
 * Consume actions from the workspace's shared pool, priced at $0.08 per action.
 *
 * Pass `costUsd` with the actual AI/API cost of the request (sum of token cost
 * + Browserbase minutes + Firecrawl pages + image-gen, etc.) to charge fairly.
 * Omit it to fall back to the legacy 1-action-per-call default.
 *
 * Returns { allowed: false, reason } only when the workspace is already out of
 * actions BEFORE the call. The current call is always allowed to complete (it
 * may push the balance slightly negative) so streaming responses never fail
 * mid-message.
 */
export async function consumeWorkspaceAction(
  supabase: SupabaseClient,
  userId: string,
  requestedWorkspaceId?: string | null,
  costUsd?: number,
): Promise<ConsumeActionResult> {
  const workspaceId = await resolveWorkspaceId(supabase, userId, requestedWorkspaceId);
  if (!workspaceId) {
    return { allowed: false, workspaceId: null, reason: "No workspace available." };
  }

  const { data, error } = await supabase.rpc("increment_workspace_actions", {
    _workspace_id: workspaceId,
    _cost_usd: typeof costUsd === "number" && isFinite(costUsd) && costUsd >= 0
      ? costUsd
      : ACTION_COST_USD,
  });

  if (error) {
    console.error("[workspace-actions] RPC error:", error.message);
    return { allowed: false, workspaceId, reason: error.message };
  }

  const result = data as {
    allowed?: boolean;
    reason?: string;
    actions_used?: number;
    consumed?: number;
    cost_usd?: number;
  };
  return {
    allowed: !!result?.allowed,
    workspaceId,
    reason: result?.reason,
    actionsUsed: result?.actions_used,
    consumed: result?.consumed,
    costUsd: result?.cost_usd,
  };
}

/**
 * Read-only check: does this workspace currently have any actions left?
 * Use BEFORE running the AI to early-exit when the user is already out.
 * Does NOT deduct anything. Pair with `consumeWorkspaceAction(..., costUsd)`
 * after the AI call completes so we can charge based on real measured cost.
 */
export async function checkWorkspaceActionsAvailable(
  supabase: SupabaseClient,
  userId: string,
  requestedWorkspaceId?: string | null,
): Promise<{ allowed: boolean; workspaceId: string | null; reason?: string }> {
  const workspaceId = await resolveWorkspaceId(supabase, userId, requestedWorkspaceId);
  if (!workspaceId) return { allowed: false, workspaceId: null, reason: "No workspace available." };

  const { data, error } = await supabase
    .from("workspace_subscriptions")
    .select("plan, status, actions_used, bonus_actions")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("[workspace-actions] check error:", error.message);
    // Fail open: don't block users on a transient read error.
    return { allowed: true, workspaceId };
  }

  const PLAN_LIMITS: Record<string, number> = {
    co_founder: 100,
    aristotle: 500,
    timewarp_og: Number.POSITIVE_INFINITY,
  };
  const FREE = 100;

  const isActive = data?.status && ["active", "trialing", "past_due"].includes(String(data.status));
  const limit = isActive && data?.plan ? PLAN_LIMITS[String(data.plan)] ?? FREE : FREE;
  const used = Number(data?.actions_used ?? 0);
  const bonus = Number(data?.bonus_actions ?? 0);

  if (limit === Number.POSITIVE_INFINITY) return { allowed: true, workspaceId };

  const remaining = (limit + bonus) - used;
  if (remaining <= 0) {
    return {
      allowed: false,
      workspaceId,
      reason: "Workspace action limit reached. Purchase more actions or upgrade the plan.",
    };
  }
  return { allowed: true, workspaceId };
}

