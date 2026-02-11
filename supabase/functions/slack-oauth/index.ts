/**
 * Slack OAuth callback handler.
 * Exchanges code for tokens, stores bot installation, auto-creates user if needed,
 * links Slack user to Supabase user, and generates a magic link session.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SLACK_CLIENT_ID = Deno.env.get("SLACK_CLIENT_ID")!;
const SLACK_CLIENT_SECRET = Deno.env.get("SLACK_CLIENT_SECRET")!;

const FALLBACK_APP_URL = "https://digital-guide-genie.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const stateParam = url.searchParams.get("state");

    // Decode origin from state
    let appUrl = FALLBACK_APP_URL;
    if (stateParam) {
      try {
        const stateData = JSON.parse(atob(stateParam));
        if (stateData.origin) appUrl = stateData.origin;
      } catch (_) { /* ignore parse errors */ }
    }

    // Handle OAuth errors
    if (error) {
      console.error("[slack-oauth] OAuth error:", error);
      return Response.redirect(`${appUrl}/?slack_error=${error}`, 302);
    }

    if (!code) {
      console.error("[slack-oauth] Missing authorization code");
      return Response.redirect(`${appUrl}/?slack_error=missing_code`, 302);
    }

    if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
      console.error("[slack-oauth] Missing Slack OAuth credentials");
      return Response.redirect(`${appUrl}/?slack_error=config_error`, 302);
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("[slack-oauth] Token exchange result:", JSON.stringify({ ok: tokenData.ok, team: tokenData.team?.name }));

    if (!tokenData.ok) {
      console.error("[slack-oauth] Token exchange failed:", tokenData.error);
      return Response.redirect(`${appUrl}/?slack_error=${tokenData.error}`, 302);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Store bot installation
    const { error: dbError } = await supabase
      .from("slack_installations")
      .upsert({
        team_id: tokenData.team.id,
        team_name: tokenData.team.name,
        bot_token: tokenData.access_token,
        bot_user_id: tokenData.bot_user_id,
        installed_by_user_id: tokenData.authed_user?.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "team_id" });

    if (dbError) {
      console.error("[slack-oauth] Failed to store installation:", dbError);
      return Response.redirect(`${appUrl}/?slack_error=db_error`, 302);
    }

    console.log("[slack-oauth] Bot installed for team:", tokenData.team.name);

    // Resolve user: get email from Slack profile, then create/find Supabase user
    let userId: string | null = null;
    let userEmail: string | null = null;
    const slackUserId = tokenData.authed_user?.id;

    if (slackUserId && tokenData.authed_user?.access_token) {
      // Use the user token to get their profile
      const profileRes = await fetch(`https://slack.com/api/users.info?user=${slackUserId}`, {
        headers: { Authorization: `Bearer ${tokenData.authed_user.access_token}` },
      });
      const profileData = await profileRes.json();

      if (profileData.ok && profileData.user?.profile?.email) {
        userEmail = profileData.user.profile.email;
        console.log("[slack-oauth] Slack user email:", userEmail);
      }
    }

    // Fallback: try using the bot token to get user info
    if (!userEmail && slackUserId) {
      try {
        const profileRes = await fetch(`https://slack.com/api/users.info?user=${slackUserId}`, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profileData = await profileRes.json();
        if (profileData.ok && profileData.user?.profile?.email) {
          userEmail = profileData.user.profile.email;
          console.log("[slack-oauth] Slack user email (via bot):", userEmail);
        }
      } catch (e) {
        console.warn("[slack-oauth] Could not fetch user email via bot:", e);
      }
    }

    if (userEmail) {
      // Find or create Supabase user
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u: any) => u.email === userEmail);

      if (existingUser) {
        userId = existingUser.id;
        console.log("[slack-oauth] Found existing user:", userId);
      } else {
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: userEmail!,
          email_confirm: true,
          user_metadata: { full_name: tokenData.authed_user?.id || "Slack User" },
        });

        if (createError) {
          console.error("[slack-oauth] Failed to create user:", createError);
        } else {
          userId = newUser.user.id;
          console.log("[slack-oauth] Auto-created user:", userId);
        }
      }

      // Create slack_user_links entry
      if (userId && slackUserId) {
        const { error: linkError } = await supabase
          .from("slack_user_links")
          .upsert({
            user_id: userId,
            slack_user_id: slackUserId,
            slack_team_id: tokenData.team.id,
            linked_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (linkError) {
          console.warn("[slack-oauth] Failed to create user link:", linkError);
        } else {
          console.log("[slack-oauth] User link created for:", userId);
        }
      }

      // Generate magic link for auto-session
      if (userId && userEmail) {
        try {
          const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: userEmail,
          });
          if (!linkError && linkData?.properties?.hashed_token) {
            const redirectTo = `${appUrl}/?slack_installed=true&team=${encodeURIComponent(tokenData.team.name)}`;
            const verifyUrl = `${SUPABASE_URL}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=magiclink&redirect_to=${encodeURIComponent(redirectTo)}`;
            console.log("[slack-oauth] Redirecting through magic link verify");
            return Response.redirect(verifyUrl, 302);
          }
          console.warn("[slack-oauth] Magic link generation failed:", linkError);
        } catch (e) {
          console.warn("[slack-oauth] Magic link error:", e);
        }
      }
    }

    // Fallback redirect (no session)
    console.log("[slack-oauth] Redirecting to app (no session)");
    return Response.redirect(`${appUrl}/?slack_installed=true&team=${encodeURIComponent(tokenData.team.name)}`, 302);
  } catch (error) {
    console.error("[slack-oauth] Error:", error);
    return Response.redirect(`${FALLBACK_APP_URL}/?slack_error=unknown`, 302);
  }
});
