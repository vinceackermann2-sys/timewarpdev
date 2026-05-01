// Unified OAuth token refresh helper.
// Goal: users connect once, never have to reconnect unless they manually revoke.
//
// Supports all providers:
//   - Microsoft (microsoft, microsoft_outlook, microsoft_calendar, microsoft_onedrive, microsoft_onenote, microsoft_teams)
//   - Google (google, google_gmail, google_calendar, google_drive, google_sheets, google_docs, google_slides)
//   - HubSpot (hubspot)
//   - Zoom (zoom) — refresh tokens are SINGLE-USE, must always persist new refresh_token
//   - Slack (slack) — handles token rotation when enabled (xoxe.* refresh tokens)
//
// On refresh failure (e.g. revoked grant), the connection is marked status='expired'
// in user_connections so the UI can show a "Reconnect" prompt for that specific provider.

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry

type ProviderFamily = "microsoft" | "google" | "hubspot" | "zoom" | "slack" | "stripe" | "unknown";

function getProviderFamily(provider: string): ProviderFamily {
  if (provider === "microsoft" || provider.startsWith("microsoft_")) return "microsoft";
  if (provider === "google" || provider.startsWith("google_")) return "google";
  if (provider === "hubspot") return "hubspot";
  if (provider === "zoom") return "zoom";
  if (provider === "slack") return "slack";
  if (provider === "stripe") return "stripe";
  return "unknown";
}

interface RefreshResult {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

async function refreshMicrosoft(refreshToken: string): Promise<RefreshResult> {
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");
  if (!clientId || !clientSecret) return { error: "missing_credentials" };
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

async function refreshGoogle(refreshToken: string): Promise<RefreshResult> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return { error: "missing_credentials" };
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  // Google does NOT return refresh_token on refresh — keep the existing one.
  return res.json();
}

async function refreshHubSpot(refreshToken: string): Promise<RefreshResult> {
  const clientId = Deno.env.get("HUBSPOT_CLIENT_ID");
  const clientSecret = Deno.env.get("HUBSPOT_CLIENT_SECRET");
  if (!clientId || !clientSecret) return { error: "missing_credentials" };
  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

async function refreshZoom(refreshToken: string): Promise<RefreshResult> {
  // Zoom refresh tokens are SINGLE-USE — every refresh returns a new refresh_token
  // that MUST replace the old one, otherwise the next refresh will fail.
  const clientId = Deno.env.get("ZOOM_CLIENT_ID");
  const clientSecret = Deno.env.get("ZOOM_CLIENT_SECRET");
  if (!clientId || !clientSecret) return { error: "missing_credentials" };
  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  return res.json();
}

async function refreshSlack(refreshToken: string): Promise<RefreshResult> {
  // Slack token rotation: only applies if rotation is enabled on the app.
  // Refresh tokens start with `xoxe-` (user) or `xoxe.xoxp-` (bot rotated).
  // If rotation is disabled, refresh_token is null and the access token never expires.
  const clientId = Deno.env.get("SLACK_CLIENT_ID");
  const clientSecret = Deno.env.get("SLACK_CLIENT_SECRET");
  if (!clientId || !clientSecret) return { error: "missing_credentials" };
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  // Slack returns { ok: false, error: "..." } on failure.
  if (data.ok === false) return { error: data.error || "slack_refresh_failed" };
  return data;
}

async function markConnectionExpired(supabaseAdmin: any, userId: string, provider: string, reason: string) {
  try {
    // Mark the user_connections row so the UI can show a reconnect prompt.
    await supabaseAdmin
      .from("user_connections")
      .update({ status: "expired", metadata: { expired_at: new Date().toISOString(), reason } })
      .eq("user_id", userId)
      .eq("provider", provider);
    console.warn(`[oauth-refresh] Marked ${provider} as expired for user ${userId}: ${reason}`);
  } catch (e) {
    console.error(`[oauth-refresh] Failed to mark connection expired:`, e);
  }
}

/**
 * Returns a guaranteed-fresh access token for the given provider, refreshing if needed.
 * Returns null if no token row exists, or if refresh fails (e.g. revoked grant).
 * On hard failure, marks the connection as `expired` so UI can prompt reconnect.
 */
export async function getValidAccessToken(
  supabaseAdmin: any,
  userId: string,
  provider: string,
  workspaceId?: string | null,
): Promise<string | null> {
  const query = supabaseAdmin
    .from("user_oauth_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider);
  if (workspaceId) query.eq("workspace_id", workspaceId);
  const { data: rows, error } = await query.order("updated_at", { ascending: false }).limit(1);
  const tokenRow = rows?.[0];

  if (error || !tokenRow) return null;

  const expiresAt = tokenRow.token_expires_at ? new Date(tokenRow.token_expires_at).getTime() : null;
  const needsRefresh = expiresAt !== null && expiresAt < Date.now() + REFRESH_BUFFER_MS;

  // Token is still fresh — return as-is.
  if (!needsRefresh) return tokenRow.access_token;

  // Need to refresh — but no refresh_token means we can't.
  if (!tokenRow.refresh_token) {
    // For Slack without rotation, access_token may simply not expire — return it.
    if (provider === "slack" && !expiresAt) return tokenRow.access_token;
    // Stripe Connect access tokens do not expire — return as-is even if expiresAt is set unexpectedly.
    if (provider === "stripe") return tokenRow.access_token;
    await markConnectionExpired(supabaseAdmin, userId, provider, "no refresh token stored");
    return null;
  }

  const family = getProviderFamily(provider);
  let refreshed: RefreshResult;
  try {
    switch (family) {
      case "microsoft": refreshed = await refreshMicrosoft(tokenRow.refresh_token); break;
      case "google":    refreshed = await refreshGoogle(tokenRow.refresh_token); break;
      case "hubspot":   refreshed = await refreshHubSpot(tokenRow.refresh_token); break;
      case "zoom":      refreshed = await refreshZoom(tokenRow.refresh_token); break;
      case "slack":     refreshed = await refreshSlack(tokenRow.refresh_token); break;
      case "stripe":    return tokenRow.access_token; // Stripe Connect tokens do not expire
      default:          return tokenRow.access_token; // unknown provider — return whatever we have
    }
  } catch (e) {
    console.error(`[oauth-refresh] Network error refreshing ${provider}:`, e);
    // Network error — don't mark expired, return current token and hope it works.
    return tokenRow.access_token;
  }

  if (!refreshed.access_token) {
    // Refresh genuinely failed (revoked, invalid_grant, etc.) — mark expired.
    const reason = refreshed.error || refreshed.error_description || "refresh_failed";
    await markConnectionExpired(supabaseAdmin, userId, provider, reason);
    return null;
  }

  // Persist the new access token + (possibly new) refresh token + expiry.
  const newRefreshToken = refreshed.refresh_token || tokenRow.refresh_token;
  const newExpiresAt = refreshed.expires_in
    ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    : tokenRow.token_expires_at;

  try {
    await supabaseAdmin
      .from("user_oauth_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: newRefreshToken,
        token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", provider);
  } catch (e) {
    console.error(`[oauth-refresh] Failed to persist refreshed token for ${provider}:`, e);
    // We still have a valid token — return it even if persistence failed.
  }

  return refreshed.access_token;
}

/**
 * Get a Microsoft token from any connected sub-service (they all share one Microsoft account).
 */
export async function getAnyMicrosoftToken(
  supabaseAdmin: any,
  userId: string,
): Promise<string | null> {
  const subs = ["microsoft", "microsoft_outlook", "microsoft_calendar", "microsoft_onedrive", "microsoft_onenote", "microsoft_teams"];
  for (const p of subs) {
    const token = await getValidAccessToken(supabaseAdmin, userId, p);
    if (token) return token;
  }
  return null;
}
