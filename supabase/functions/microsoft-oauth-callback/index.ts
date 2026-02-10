/**
 * Server-side Microsoft OAuth callback handler.
 * Receives redirect from Microsoft, exchanges code for tokens, stores them.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID")!;
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;

const FALLBACK_APP_URL = "https://digital-guide-genie.lovable.app";

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    console.log("[microsoft-oauth-callback] Received callback", {
      hasCode: !!code,
      hasState: !!state,
      error,
    });

    if (!code || !state) {
      console.error("[microsoft-oauth-callback] Missing code or state");
      return Response.redirect(`${FALLBACK_APP_URL}/ai-ceo?microsoft_error=missing_params`, 302);
    }

    // Decode state
    let stateData: { user_id: string; nonce: string; origin?: string };
    let appUrl = FALLBACK_APP_URL;

    try {
      stateData = JSON.parse(atob(state));
      appUrl = stateData.origin || FALLBACK_APP_URL;
      console.log("[microsoft-oauth-callback] Decoded state:", { user_id: stateData.user_id, origin: appUrl });
    } catch (e) {
      console.error("[microsoft-oauth-callback] Failed to decode state:", e);
      return Response.redirect(`${FALLBACK_APP_URL}/ai-ceo?microsoft_error=invalid_state`, 302);
    }

    if (error) {
      console.error("[microsoft-oauth-callback] OAuth error:", error, errorDescription);
      return Response.redirect(`${appUrl}/ai-ceo?microsoft_error=${encodeURIComponent(error)}`, 302);
    }

    // Verify state nonce
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: connectionData, error: connectionError } = await supabase
      .from("microsoft_workspace_connections")
      .select("oauth_state, oauth_state_expires_at")
      .eq("user_id", stateData.user_id)
      .single();

    if (connectionError || !connectionData) {
      console.error("[microsoft-oauth-callback] Failed to verify state:", connectionError);
      return Response.redirect(`${appUrl}/ai-ceo?microsoft_error=state_verification_failed`, 302);
    }

    if (connectionData.oauth_state !== stateData.nonce) {
      console.error("[microsoft-oauth-callback] State nonce mismatch");
      return Response.redirect(`${appUrl}/ai-ceo?microsoft_error=invalid_nonce`, 302);
    }

    if (new Date(connectionData.oauth_state_expires_at!) < new Date()) {
      console.error("[microsoft-oauth-callback] State expired");
      return Response.redirect(`${appUrl}/ai-ceo?microsoft_error=state_expired`, 302);
    }

    // Exchange code for tokens
    const redirectUri = `${SUPABASE_URL}/functions/v1/microsoft-oauth-callback`;

    console.log("[microsoft-oauth-callback] Exchanging code for tokens");

    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        scope: "offline_access openid email profile User.Read Mail.Read Calendars.Read Files.Read.All",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[microsoft-oauth-callback] Token exchange failed:", errorText);
      return Response.redirect(`${appUrl}/ai-ceo?microsoft_error=token_exchange_failed`, 302);
    }

    const tokenData = await tokenResponse.json();
    console.log("[microsoft-oauth-callback] Token exchange successful", {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
    });

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Store tokens
    const { error: tokenError } = await supabase
      .from("microsoft_workspace_tokens")
      .upsert({
        user_id: stateData.user_id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || "",
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (tokenError) {
      console.error("[microsoft-oauth-callback] Failed to store tokens:", tokenError);
      return Response.redirect(`${appUrl}/ai-ceo?microsoft_error=storage_failed`, 302);
    }

    console.log("[microsoft-oauth-callback] Tokens stored successfully");

    // Update connection status
    await supabase
      .from("microsoft_workspace_connections")
      .upsert({
        user_id: stateData.user_id,
        connected: true,
        last_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        oauth_state: null,
        oauth_state_expires_at: null,
      }, { onConflict: "user_id" });

    console.log("[microsoft-oauth-callback] Redirecting to app:", appUrl);
    return Response.redirect(`${appUrl}/ai-ceo?microsoft_connected=true`, 302);
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
});
