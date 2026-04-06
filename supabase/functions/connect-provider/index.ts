import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveBrandRowId(supabaseAdmin: any, userId: string, brandId?: string | null) {
  if (!brandId) return null;
  if (UUID_REGEX.test(brandId)) return brandId;

  const { data: brandRows, error } = await supabaseAdmin
    .from("user_business_data")
    .select("id, content")
    .eq("user_id", userId)
    .eq("data_type", "brand")
    .eq("source", "business-dna");

  if (error || !brandRows) return null;

  for (const row of brandRows) {
    try {
      const parsedContent = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
      if (parsedContent?.id === brandId) {
        return row.id;
      }
    } catch {
      continue;
    }
  }

  return null;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { provider, action, brandId } = body;

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

    const requestedBrandId = typeof brandId === "string" && brandId.trim() ? brandId : null;
    const resolvedBrandId = requestedBrandId
      ? await resolveBrandRowId(supabaseAdmin, user.id, requestedBrandId)
      : null;

    // Action: check-status - return which providers are connected (optionally filtered by brandId)
    if (action === "check-status") {
      // User-level: return all connected providers for this user (no brand filtering)
      const { data: connections } = await supabaseAdmin
        .from("user_connections")
        .select("provider, status, brand_id")
        .eq("user_id", user.id)
        .eq("status", "connected");

      const { data: tokens } = await supabaseAdmin
        .from("user_oauth_tokens")
        .select("provider, provider_email")
        .eq("user_id", user.id);

      const tokenProviders = (tokens || []).map((t: any) => t.provider);
      const connected = (connections || [])
        .filter((c: any) => tokenProviders.includes(c.provider))
        .map((c: any) => ({
          provider: c.provider,
          email: tokens?.find((t: any) => t.provider === c.provider)?.provider_email,
        }));

      // Deduplicate by provider
      const deduped = new Map<string, any>();
      for (const c of connected) {
        if (!deduped.has(c.provider)) {
          deduped.set(c.provider, c);
        }
      }

      return new Response(JSON.stringify({ connected: Array.from(deduped.values()) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: get-auth-url - generate OAuth URL for a provider
    if (action === "get-auth-url") {
      if (requestedBrandId && !resolvedBrandId) {
        return new Response(JSON.stringify({ error: "Business not found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const redirectBase = `${SUPABASE_URL}/functions/v1`;
      const returnPath = body.returnPath || "/";
      const origin = body.origin || "";
      let authUrl = "";

      // Generate HMAC nonce to prevent CSRF / state forgery
      const nonce = crypto.randomUUID();
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(SUPABASE_SERVICE_ROLE_KEY),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const signatureBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(nonce + user.id),
      );
      const hmac = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Include brandId in state so callbacks can scope connections
      const stateBase = {
        userId: user.id,
        returnPath,
        nonce,
        hmac,
        brandId: resolvedBrandId,
        logicalBrandId: requestedBrandId,
      };

      switch (provider) {
        case "microsoft": {
          const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
          if (!clientId) throw new Error("MICROSOFT_CLIENT_ID not configured");
          const redirectUri = `${redirectBase}/microsoft-oauth-callback`;
          const scopes = "openid profile email offline_access Mail.Read Calendars.Read Files.Read.All User.Read Contacts.Read Notes.Read Tasks.Read";
          const state = btoa(JSON.stringify({ ...stateBase, origin }));
          authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&response_mode=query`;
          break;
        }
        case "google": {
          const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
          if (!clientId) throw new Error("GOOGLE_CLIENT_ID not configured");
          const redirectUri = `${redirectBase}/google-oauth-callback`;
          const scopes = "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly";
          const state = btoa(JSON.stringify(stateBase));
          authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent`;
          break;
        }
        case "slack": {
          const clientId = Deno.env.get("SLACK_CLIENT_ID");
          if (!clientId) throw new Error("SLACK_CLIENT_ID not configured");
          const redirectUri = `${redirectBase}/slack-oauth-callback`;
          const scopes = "channels:read,channels:history,groups:read,groups:history,files:read,users:read,team:read";
          const state = btoa(JSON.stringify({ ...stateBase, origin }));
          authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
          break;
        }
        case "hubspot": {
          const clientId = Deno.env.get("HUBSPOT_CLIENT_ID");
          if (!clientId) throw new Error("HUBSPOT_CLIENT_ID not configured");
          const redirectUri = `${redirectBase}/hubspot-oauth-callback`;
          const scopes = "crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read crm.objects.owners.read sales-email-read";
          const state = btoa(JSON.stringify({ ...stateBase, origin }));
          authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
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
      if (requestedBrandId && !resolvedBrandId) {
        return new Response(JSON.stringify({ error: "Business not found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
          brand_id: resolvedBrandId,
          metadata: { siteUrl: normalizedUrl, username: body.username, displayName: wpUser.name },
        }, { onConflict: "user_id,provider,brand_id" });

      return new Response(JSON.stringify({ success: true, displayName: wpUser.name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: disconnect
    if (action === "disconnect") {
      // Remove business data sourced from this provider, scoped to brand
      // IMPORTANT: Only delete if we have a brandId to prevent wiping data from other businesses
      if (requestedBrandId) {
        await supabaseAdmin
          .from("user_business_data")
          .delete()
          .eq("user_id", user.id)
          .eq("source", provider)
          .eq("metadata->>brandId", requestedBrandId);
      }

      // Update connection status, scoped to brand
      let connQuery = supabaseAdmin
        .from("user_connections")
        .update({ status: "disconnected" })
        .eq("user_id", user.id)
        .eq("provider", provider);

      if (requestedBrandId) {
        if (resolvedBrandId) {
          connQuery = connQuery.or(`brand_id.eq.${resolvedBrandId},brand_id.is.null`);
        } else {
          connQuery = connQuery.is("brand_id", null);
        }
      }
      await connQuery;

      // Only delete tokens if no other brands use this provider
      const { data: remainingConns } = await supabaseAdmin
        .from("user_connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("provider", provider)
        .eq("status", "connected");

      if (!remainingConns || remainingConns.length === 0) {
        await supabaseAdmin
          .from("user_oauth_tokens")
          .delete()
          .eq("user_id", user.id)
          .eq("provider", provider);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("connect-provider error occurred");
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
