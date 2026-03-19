import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CLIENT_ID = Deno.env.get("SLACK_CLIENT_ID")!;
  const CLIENT_SECRET = Deno.env.get("SLACK_CLIENT_SECRET")!;
  const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/slack-oauth-callback`;

  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://digital-guide-genie.lovable.app";

  if (error || !code || !stateParam) {
    return Response.redirect(`${frontendUrl}/?oauth_error=${error || "missing_code"}`, 302);
  }

  try {
    const state = JSON.parse(atob(stateParam));
    const userId = state.userId;
    const returnPath = state.returnPath || "/";
    if (!userId) throw new Error("No userId in state");

    // Verify HMAC nonce to prevent state forgery
    if (!state.nonce || !state.hmac) throw new Error("Missing CSRF nonce");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(SUPABASE_SERVICE_ROLE_KEY),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(state.nonce + userId));
    const expectedHmac = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (expectedHmac !== state.hmac) throw new Error("Invalid CSRF nonce");

    // Exchange code for tokens
    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok || !tokenData.access_token) {
      console.error("Slack token exchange failed");
      return Response.redirect(`${frontendUrl}/?oauth_error=token_exchange_failed`, 302);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Store tokens
    await supabaseAdmin
      .from("user_oauth_tokens")
      .upsert({
        user_id: userId,
        provider: "slack",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        scopes: tokenData.scope || null,
        provider_user_id: tokenData.authed_user?.id || null,
        provider_email: null, // Slack doesn't provide email in OAuth response
      }, { onConflict: "user_id,provider" });

    // Get team info for metadata
    const teamName = tokenData.team?.name || "Slack Workspace";

    // Update user_connections
    await supabaseAdmin
      .from("user_connections")
      .upsert({
        user_id: userId,
        provider: "slack",
        status: "connected",
        metadata: { team: teamName, team_id: tokenData.team?.id },
      }, { onConflict: "user_id,provider" });

    return Response.redirect(`${frontendUrl}${returnPath}?oauth_success=slack`, 302);
  } catch (e) {
    console.error("Slack OAuth callback error occurred");
    return Response.redirect(`${frontendUrl}/?oauth_error=callback_failed`, 302);
  }
});
