/** Structured JSON logs for Edge Functions (grep-friendly in Supabase logs). */

export function edgeLog(
  scope: string,
  phase: string,
  meta?: Record<string, unknown>,
): void {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    scope,
    phase,
    ...meta,
  };
  console.log(JSON.stringify(entry));
}

/** Non-reversible fingerprint for correlating logs without storing full user id in analytics. */
export function userIdShort(userId: string): string {
  return userId.length >= 8 ? userId.slice(0, 8) : userId;
}
