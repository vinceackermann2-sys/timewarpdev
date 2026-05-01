import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { upsertOauthToken, upsertConnection } from "../_shared/connector-upsert.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

  const origin = stateParam
    ? (() => { try { return JSON.parse(atob(stateParam)).origin; } catch { return ""; } })()
    : "";
  const frontendUrl = origin || Deno.env.get("FRONTEND_URL") || "https://timewarpdev.lovable.app";

  if (error || !code || !stateParam) {
    return Response.redirect(`${frontendUrl}/?oauth_error=${error || "missing_code"}`, 302);
  }

  try {
    const state = JSON.parse(atob(stateParam));
    const userId = state.userId;
    const returnPath = state.returnPath || "/";
    const brandId = state.brandId || null;
    const workspaceId = state.workspaceId || null;
    if (!userId) throw new Error("No userId in state");

    if (!state.nonce || !state.hmac) throw new Error("Missing CSRF nonce");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(SUPABASE_SERVICE_ROLE_KEY),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(state.nonce + userId));
    const expectedHmac = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (expectedHmac !== state.hmac) throw new Error("Invalid CSRF nonce");

    // Exchange auth code for Stripe Connect access token
    const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_secret: STRIPE_SECRET_KEY,
        code,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error("Stripe token exchange failed:", tokenData.error_description || tokenData.error || "unknown");
      return Response.redirect(`${frontendUrl}/?oauth_error=token_exchange_failed`, 302);
    }

    const stripeUserId = tokenData.stripe_user_id as string;

    // Get account info
    let providerEmail: string | null = null;
    let displayName: string | null = null;
    try {
      const acctRes = await fetch(`https://api.stripe.com/v1/accounts/${stripeUserId}`, {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      });
      if (acctRes.ok) {
        const acct = await acctRes.json();
        providerEmail = acct.email || null;
        displayName = acct.business_profile?.name || acct.settings?.dashboard?.display_name || acct.display_name || null;
      }
    } catch { /* skip */ }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    await supabaseAdmin
      .from("user_oauth_tokens")
      .upsert({
        user_id: userId,
        provider: "stripe",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        scopes: tokenData.scope || null,
        provider_user_id: stripeUserId,
        provider_email: providerEmail,
        token_expires_at: null,
      }, { onConflict: "user_id,provider" });

    await supabaseAdmin
      .from("user_connections")
      .upsert({
        user_id: userId,
        provider: "stripe",
        status: "connected",
        brand_id: brandId,
        metadata: { stripe_user_id: stripeUserId, email: providerEmail, displayName },
      }, { onConflict: "user_id,provider" });

    const brandParam = brandId ? `&brandId=${brandId}` : "";
    return Response.redirect(`${frontendUrl}${returnPath}?oauth_success=stripe${brandParam}`, 302);
  } catch (e) {
    console.error("Stripe OAuth callback error:", e instanceof Error ? e.message : "unknown");
    return Response.redirect(`${frontendUrl}/?oauth_error=callback_failed`, 302);
  }
});
