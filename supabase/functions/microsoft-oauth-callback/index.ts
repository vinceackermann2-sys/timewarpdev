import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID")!;
  const CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;
  const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/microsoft-oauth-callback`;

  // Parse the frontend URL from the referrer or use a default
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://digital-guide-genie.lovable.app";

  if (error || !code || !stateParam) {
    return Response.redirect(`${frontendUrl}/?oauth_error=${error || "missing_code"}`, 302);
  }

  try {
    const state = JSON.parse(atob(stateParam));
    const userId = state.userId;
    const returnPath = state.returnPath || "/";

    if (!userId) throw new Error("No userId in state");

    // Exchange code for tokens
    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Microsoft token exchange failed");
      return Response.redirect(`${frontendUrl}/?oauth_error=token_exchange_failed`, 302);
    }

    // Get user profile
    const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Store tokens
    await supabaseAdmin
      .from("user_oauth_tokens")
      .upsert({
        user_id: userId,
        provider: "microsoft",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expires_at: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
        scopes: tokenData.scope || null,
        provider_user_id: profile.id || null,
        provider_email: profile.mail || profile.userPrincipalName || null,
      }, { onConflict: "user_id,provider" });

    // Update user_connections
    await supabaseAdmin
      .from("user_connections")
      .upsert({
        user_id: userId,
        provider: "microsoft",
        status: "connected",
        metadata: { email: profile.mail || profile.userPrincipalName },
      }, { onConflict: "user_id,provider" });

    return Response.redirect(`${frontendUrl}${returnPath}?oauth_success=microsoft`, 302);
  } catch (e) {
    console.error("Microsoft OAuth callback error occurred");
    return Response.redirect(`${frontendUrl}/?oauth_error=callback_failed`, 302);
  }
});
