// Helpers to upsert connector rows scoped by (user_id, workspace_id, provider).
// We can't rely on PostgREST onConflict with our partial unique indexes, so we
// emulate upsert via delete-then-insert within the (user, workspace, provider)
// scope.

export async function upsertOauthToken(
  supabaseAdmin: any,
  args: {
    userId: string;
    workspaceId: string | null;
    provider: string;
    access_token: string;
    refresh_token?: string | null;
    token_expires_at?: string | null;
    scopes?: string | null;
    provider_user_id?: string | null;
    provider_email?: string | null;
  },
) {
  const { userId, workspaceId, provider } = args;

  const del = supabaseAdmin
    .from("user_oauth_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (workspaceId) del.eq("workspace_id", workspaceId);
  else del.is("workspace_id", null);
  await del;

  return supabaseAdmin.from("user_oauth_tokens").insert({
    user_id: userId,
    workspace_id: workspaceId,
    provider,
    access_token: args.access_token,
    refresh_token: args.refresh_token ?? null,
    token_expires_at: args.token_expires_at ?? null,
    scopes: args.scopes ?? null,
    provider_user_id: args.provider_user_id ?? null,
    provider_email: args.provider_email ?? null,
  });
}

export async function upsertConnection(
  supabaseAdmin: any,
  args: {
    userId: string;
    workspaceId: string | null;
    provider: string;
    status?: string;
    brand_id?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const { userId, workspaceId, provider } = args;

  const del = supabaseAdmin
    .from("user_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (workspaceId) del.eq("workspace_id", workspaceId);
  else del.is("workspace_id", null);
  await del;

  return supabaseAdmin.from("user_connections").insert({
    user_id: userId,
    workspace_id: workspaceId,
    provider,
    status: args.status ?? "connected",
    brand_id: args.brand_id ?? null,
    metadata: args.metadata ?? null,
  });
}
