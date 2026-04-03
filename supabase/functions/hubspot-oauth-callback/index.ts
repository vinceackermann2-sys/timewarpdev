import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CLIENT_ID = Deno.env.get("HUBSPOT_CLIENT_ID")!;
  const CLIENT_SECRET = Deno.env.get("HUBSPOT_CLIENT_SECRET")!;
  const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/hubspot-oauth-callback`;

  const origin = stateParam ? (() => { try { return JSON.parse(atob(stateParam)).origin; } catch { return ""; } })() : "";
  const frontendUrl = origin || Deno.env.get("FRONTEND_URL") || "https://timewarpdev.lovable.app";

  if (error || !code || !stateParam) {
    return Response.redirect(`${frontendUrl}/?oauth_error=${error || "missing_code"}`, 302);
  }

  try {
    const state = JSON.parse(atob(stateParam));
    const userId = state.userId;
    const returnPath = state.returnPath || "/";
    const brandId = state.brandId || null;
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
    const tokenResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error("HubSpot token exchange failed:", tokenData.message || "unknown");
      return Response.redirect(`${frontendUrl}/?oauth_error=token_exchange_failed`, 302);
    }

    // Get user info from HubSpot
    let providerEmail: string | null = null;
    let providerUserId: string | null = null;
    try {
      const meRes = await fetch("https://api.hubapi.com/oauth/v1/access-tokens/" + tokenData.access_token);
      if (meRes.ok) {
        const meData = await meRes.json();
        providerEmail = meData.user || null;
        providerUserId = meData.user_id?.toString() || null;
      }
    } catch { /* skip */ }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Calculate token expiry
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Store tokens
    await supabaseAdmin
      .from("user_oauth_tokens")
      .upsert({
        user_id: userId,
        provider: "hubspot",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        scopes: tokenData.scope || null,
        provider_user_id: providerUserId,
        provider_email: providerEmail,
        token_expires_at: expiresAt,
      }, { onConflict: "user_id,provider" });

    // Get hub info
    let hubName = "HubSpot";
    try {
      const hubRes = await fetch("https://api.hubapi.com/integrations/v1/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (hubRes.ok) {
        const hubData = await hubRes.json();
        hubName = hubData.portalId ? `HubSpot (${hubData.portalId})` : "HubSpot";
      }
    } catch { /* skip */ }

    // Update user_connections scoped to brand
    await supabaseAdmin
      .from("user_connections")
      .upsert({
        user_id: userId,
        provider: "hubspot",
        status: "connected",
        brand_id: brandId,
        metadata: { hub: hubName, email: providerEmail },
      }, { onConflict: "user_id,provider,brand_id" });

    const brandParam = brandId ? `&brandId=${brandId}` : "";
    return Response.redirect(`${frontendUrl}${returnPath}?oauth_success=hubspot${brandParam}`, 302);
  } catch (e) {
    console.error("HubSpot OAuth callback error:", e instanceof Error ? e.message : "unknown");
    return Response.redirect(`${frontendUrl}/?oauth_error=callback_failed`, 302);
  }
});
