import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { provider, action } = body;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user's auth token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: check-status - return which providers are connected
    if (action === "check-status") {
      const { data: connections } = await supabaseAdmin
        .from("user_connections")
        .select("provider, status")
        .eq("user_id", user.id);

      const { data: tokens } = await supabaseAdmin
        .from("user_oauth_tokens")
        .select("provider, provider_email")
        .eq("user_id", user.id);

      const tokenProviders = (tokens || []).map((t: any) => t.provider);
      const connected = (connections || [])
        .filter((c: any) => c.status === "connected" && tokenProviders.includes(c.provider))
        .map((c: any) => ({
          provider: c.provider,
          email: tokens?.find((t: any) => t.provider === c.provider)?.provider_email,
        }));

      return new Response(JSON.stringify({ connected }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: get-auth-url - generate OAuth URL for a provider
    if (action === "get-auth-url") {
      const redirectBase = `${SUPABASE_URL}/functions/v1`;
      let authUrl = "";

      switch (provider) {
        case "microsoft": {
          const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
          if (!clientId) throw new Error("MICROSOFT_CLIENT_ID not configured");
          const redirectUri = `${redirectBase}/microsoft-oauth-callback`;
          const scopes = "openid profile email offline_access Mail.Read Calendars.Read Files.Read.All User.Read";
          const state = btoa(JSON.stringify({ userId: user.id }));
          authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&response_mode=query`;
          break;
        }
        case "google": {
          const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
          if (!clientId) throw new Error("GOOGLE_CLIENT_ID not configured");
          const redirectUri = `${redirectBase}/google-oauth-callback`;
          const scopes = "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly";
          const state = btoa(JSON.stringify({ userId: user.id }));
          authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent`;
          break;
        }
        case "slack": {
          const clientId = Deno.env.get("SLACK_CLIENT_ID");
          if (!clientId) throw new Error("SLACK_CLIENT_ID not configured");
          const redirectUri = `${redirectBase}/slack-oauth-callback`;
          const scopes = "channels:read,channels:history,files:read,users:read,team:read";
          const state = btoa(JSON.stringify({ userId: user.id }));
          authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
          break;
        }
        default:
          return new Response(JSON.stringify({ error: `Unsupported provider: ${provider}` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: save-credentials (for WordPress Application Passwords)
    if (action === "save-credentials" && provider === "wordpress") {
      if (!body.siteUrl || !body.username || !body.appPassword) {
        return new Response(JSON.stringify({ error: "Missing siteUrl, username, or appPassword" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate credentials by testing WP REST API
      const normalizedUrl = body.siteUrl.replace(/\/+$/, "");
      const basicAuth = btoa(`${body.username}:${body.appPassword}`);
      const testRes = await fetch(`${normalizedUrl}/wp-json/wp/v2/users/me`, {
        headers: { Authorization: `Basic ${basicAuth}` },
      });

      if (!testRes.ok) {
        return new Response(JSON.stringify({ error: "Invalid WordPress credentials. Check your site URL, username, and application password." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const wpUser = await testRes.json();

      await supabaseAdmin
        .from("user_oauth_tokens")
        .upsert({
          user_id: user.id,
          provider: "wordpress",
          access_token: basicAuth,
          refresh_token: null,
          scopes: "posts,pages,media",
          provider_user_id: String(wpUser.id),
          provider_email: wpUser.email || body.username,
        }, { onConflict: "user_id,provider" });

      await supabaseAdmin
        .from("user_connections")
        .upsert({
          user_id: user.id,
          provider: "wordpress",
          status: "connected",
          metadata: { siteUrl: normalizedUrl, username: body.username, displayName: wpUser.name },
        }, { onConflict: "user_id,provider" });

      return new Response(JSON.stringify({ success: true, displayName: wpUser.name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: disconnect
    if (action === "disconnect") {
      await supabaseAdmin
        .from("user_connections")
        .update({ status: "disconnected" })
        .eq("user_id", user.id)
        .eq("provider", provider);

      await supabaseAdmin
        .from("user_oauth_tokens")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("connect-provider error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
