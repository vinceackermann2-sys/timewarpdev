import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CLIENT_ID = "V6FwCE1HRAuBgiP6eE_V0A";
  const CLIENT_SECRET = Deno.env.get("ZOOM_CLIENT_SECRET")!;
  const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/zoom-oauth-callback`;

  if (error || !code || !stateParam) {
    const fallbackUrl = Deno.env.get("FRONTEND_URL") || "https://timewarpdev.lovable.app";
    return Response.redirect(`${fallbackUrl}/?oauth_error=${error || "missing_code"}`, 302);
  }

  let frontendUrl = Deno.env.get("FRONTEND_URL") || "https://timewarpdev.lovable.app";

  try {
    const state = JSON.parse(atob(stateParam));
    const userId = state.userId;
    const returnPath = state.returnPath || "/";
    const brandId = state.brandId || null;
    const logicalBrandId = state.logicalBrandId || state.brandId || null;
    frontendUrl = state.origin || frontendUrl;

    if (!userId) throw new Error("No userId in state");

    // Verify HMAC nonce
    if (!state.nonce || !state.hmac) throw new Error("Missing CSRF nonce");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(SUPABASE_SERVICE_ROLE_KEY),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(state.nonce + userId));
    const expectedHmac = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (expectedHmac !== state.hmac) throw new Error("Invalid CSRF nonce");

    // Exchange code for tokens using Basic auth (Zoom requires this)
    const basicAuth = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const tokenResponse = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Zoom token exchange failed", JSON.stringify(tokenData), "status:", tokenResponse.status, "redirect_uri:", REDIRECT_URI, "code_length:", code?.length);
      return Response.redirect(`${frontendUrl}/?oauth_error=token_exchange_failed`, 302);
    }

    // Get user profile
    const profileRes = await fetch("https://api.zoom.us/v2/users/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    await supabaseAdmin
      .from("user_oauth_tokens")
      .upsert({
        user_id: userId,
        provider: "zoom",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expires_at: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
        scopes: tokenData.scope || null,
        provider_user_id: profile.id || null,
        provider_email: profile.email || null,
      }, { onConflict: "user_id,provider" });

    await supabaseAdmin
      .from("user_connections")
      .upsert({
        user_id: userId,
        provider: "zoom",
        status: "connected",
        brand_id: brandId,
        metadata: { email: profile.email, displayName: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() },
      }, { onConflict: "user_id,provider" });

    const brandParam = logicalBrandId ? `&brandId=${encodeURIComponent(logicalBrandId)}` : "";
    return Response.redirect(`${frontendUrl}${returnPath}?oauth_success=zoom${brandParam}`, 302);
  } catch (e) {
    console.error("Zoom OAuth callback error occurred");
    return Response.redirect(`${frontendUrl}/?oauth_error=callback_failed`, 302);
  }
});
