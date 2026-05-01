// Shared helper for workspace-scoped action consumption.
// All AI runners should call this with the active workspace id from the client.
// Falls back to the first workspace the user owns/edits if none was passed.

export type SupabaseClient = any;

export interface ConsumeActionResult {
  allowed: boolean;
  workspaceId: string | null;
  reason?: string;
  actionsUsed?: number;
}

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
 * Consume one action from the workspace's shared pool.
 * Returns { allowed: false, reason } when the workspace is out of actions.
 */
export async function consumeWorkspaceAction(
  supabase: SupabaseClient,
  userId: string,
  requestedWorkspaceId?: string | null,
): Promise<ConsumeActionResult> {
  const workspaceId = await resolveWorkspaceId(supabase, userId, requestedWorkspaceId);
  if (!workspaceId) {
    return { allowed: false, workspaceId: null, reason: "No workspace available." };
  }

  const { data, error } = await supabase.rpc("increment_workspace_actions", {
    _workspace_id: workspaceId,
  });

  if (error) {
    console.error("[workspace-actions] RPC error:", error.message);
    return { allowed: false, workspaceId, reason: error.message };
  }

  const result = data as { allowed?: boolean; reason?: string; actions_used?: number };
  return {
    allowed: !!result?.allowed,
    workspaceId,
    reason: result?.reason,
    actionsUsed: result?.actions_used,
  };
}
