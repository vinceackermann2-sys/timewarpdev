import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { upsertOauthToken, upsertConnection } from "../_shared/connector-upsert.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function expandLegacyProvider(provider: string): string[] {
  if (provider === "google") {
    return ["google_gmail", "google_drive", "google_docs", "google_sheets", "google_slides", "google_calendar"];
  }
  if (provider === "microsoft") {
    return ["microsoft_outlook", "microsoft_onedrive", "microsoft_onenote", "microsoft_teams"];
  }
  return [provider];
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function createAdminClient() {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return {
    supabaseUrl,
    serviceRoleKey,
    client: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    }),
  };
}

async function parseRequestBody(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

// Microsoft sub-service scopes — read + write
const MICROSOFT_SERVICES: Record<string, { scopes: string; label: string }> = {
  microsoft_outlook: { scopes: "openid profile email offline_access User.Read Mail.ReadWrite Mail.Send Calendars.ReadWrite", label: "Outlook" },
  microsoft_onedrive: { scopes: "openid profile email offline_access User.Read Files.ReadWrite.All", label: "OneDrive" },
  microsoft_onenote: { scopes: "openid profile email offline_access User.Read Notes.ReadWrite.All", label: "OneNote" },
  microsoft_teams: { scopes: "openid profile offline_access User.Read Team.ReadBasic.All Channel.ReadBasic.All ChannelMessage.Send OnlineMeetings.ReadWrite", label: "Teams" },
};

// Google sub-service scopes — read + write
const GOOGLE_SERVICES: Record<string, { scopes: string; label: string }> = {
  google_calendar: { scopes: "openid email profile https://www.googleapis.com/auth/calendar", label: "Google Calendar" },
  google_drive: { scopes: "openid email profile https://www.googleapis.com/auth/drive", label: "Google Drive" },
  google_docs: { scopes: "openid email profile https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file", label: "Google Docs" },
  google_sheets: { scopes: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file", label: "Google Sheets" },
  google_slides: { scopes: "openid email profile https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive.file", label: "Google Slides" },
  google_gmail: { scopes: "openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send", label: "Gmail" },
};

function isMicrosoftSubService(provider: string): boolean {
  return provider in MICROSOFT_SERVICES;
}

function isGoogleSubService(provider: string): boolean {
  return provider in GOOGLE_SERVICES;
}

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await parseRequestBody(req);
    const provider = typeof body.provider === "string" ? body.provider : "";
    const action = typeof body.action === "string" ? body.action : "";
    const brandId = typeof body.brandId === "string" ? body.brandId : null;
    const workspaceId = typeof body.workspaceId === "string" && UUID_REGEX.test(body.workspaceId)
      ? body.workspaceId
      : null;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const { supabaseUrl, serviceRoleKey, client: supabaseAdmin } = createAdminClient();

    const token = authHeader.slice("Bearer ".length);
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    const user = { id: claimsData.claims.sub as string, email: (claimsData.claims.email as string) ?? null };

    const requestedBrandId = brandId && brandId.trim() ? brandId.trim() : null;
    const resolvedBrandId = requestedBrandId
      ? await resolveBrandRowId(supabaseAdmin, user.id, requestedBrandId)
      : null;

    if (action === "check-status") {
      // Connectors are workspace-scoped when a workspaceId is provided.
      // During onboarding the workspace may still be loading on the client —
      // in that case fall back to returning all of the user's own connections
      // (scoped by user_id only) so the UI can reflect the just-completed
      // OAuth flow instead of a stale empty list.
      const scopeToWorkspace = !!workspaceId;

      // Self-heal: re-attach orphan connections (rows whose workspace_id is
      // NULL or points to a workspace that no longer exists) to the user's
      // currently active workspace. Without this, deleting the workspace
      // where a provider was connected makes the provider invisible forever
      // even though the OAuth token is still valid.
      const { data: existingWorkspaces } = await supabaseAdmin
        .from("workspaces")
        .select("id")
        .eq("created_by", user.id);
      const validWsIds = new Set((existingWorkspaces ?? []).map((w: any) => w.id));
      // Include workspaces the user is a member of (not just owner).
      const { data: memberRows } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id);
      for (const r of memberRows ?? []) validWsIds.add(r.workspace_id);

      const { data: allUserConnections } = await supabaseAdmin
        .from("user_connections")
        .select("id, workspace_id, status")
        .eq("user_id", user.id)
        .eq("status", "connected");

      const orphanIds = (allUserConnections ?? [])
        .filter((c: any) => !c.workspace_id || !validWsIds.has(c.workspace_id))
        .map((c: any) => c.id);

      if (scopeToWorkspace && orphanIds.length > 0) {
        await supabaseAdmin
          .from("user_connections")
          .update({ workspace_id: workspaceId })
          .in("id", orphanIds);

        // Mirror the same migration on tokens (matched by provider).
        const orphanProviders = (allUserConnections ?? [])
          .filter((c: any) => orphanIds.includes(c.id))
          .map((c: any) => c.provider)
          .filter(Boolean);
        if (orphanProviders.length > 0) {
          const { data: allTokens } = await supabaseAdmin
            .from("user_oauth_tokens")
            .select("id, workspace_id, provider")
            .eq("user_id", user.id)
            .in("provider", orphanProviders);
          const tokenIds = (allTokens ?? [])
            .filter((t: any) => !t.workspace_id || !validWsIds.has(t.workspace_id))
            .map((t: any) => t.id);
          if (tokenIds.length > 0) {
            await supabaseAdmin
              .from("user_oauth_tokens")
              .update({ workspace_id: workspaceId })
              .in("id", tokenIds);
          }
        }
      }

      let connectionsQuery = supabaseAdmin
        .from("user_connections")
        .select("provider, status, brand_id, workspace_id")
        .eq("user_id", user.id)
        .eq("status", "connected");
      let tokensQuery = supabaseAdmin
        .from("user_oauth_tokens")
        .select("provider, provider_email, workspace_id")
        .eq("user_id", user.id);
      if (scopeToWorkspace) {
        connectionsQuery = connectionsQuery.eq("workspace_id", workspaceId);
        tokensQuery = tokensQuery.eq("workspace_id", workspaceId);
      }

      const [connectionsResult, tokensResult] = await Promise.all([connectionsQuery, tokensQuery]);

      if (connectionsResult.error) {
        console.error("connect-provider check-status connections error", connectionsResult.error);
        return jsonResponse({ error: "Failed to load connection status" }, 500);
      }

      if (tokensResult.error) {
        console.error("connect-provider check-status tokens error", tokensResult.error);
        return jsonResponse({ error: "Failed to load token status" }, 500);
      }

      const tokenEmailByProvider = new Map<string, string | null>();
      for (const tokenRow of tokensResult.data ?? []) {
        if (!tokenEmailByProvider.has(tokenRow.provider)) {
          tokenEmailByProvider.set(tokenRow.provider, tokenRow.provider_email ?? null);
        }
      }

      const deduped = new Map<string, { provider: string; email?: string | null }>();
      for (const connection of connectionsResult.data ?? []) {
        const expandedProviders = expandLegacyProvider(connection.provider);
        const fallbackEmail = tokenEmailByProvider.get(connection.provider) ?? undefined;
        for (const expanded of expandedProviders) {
          if (deduped.has(expanded)) continue;
          const email = tokenEmailByProvider.get(expanded) ?? fallbackEmail;
          deduped.set(expanded, {
            provider: expanded,
            email,
          });
        }
      }

      return jsonResponse({ connected: Array.from(deduped.values()) });
    }

    if (action === "get-auth-url") {
      if (!provider) {
        return jsonResponse({ error: "Provider is required" }, 400);
      }

      if (requestedBrandId && !resolvedBrandId) {
        return jsonResponse({ error: "Business not found" }, 400);
      }

      const redirectBase = `${supabaseUrl}/functions/v1`;
      const returnPath = typeof body.returnPath === "string" && body.returnPath ? body.returnPath : "/";
      const origin = typeof body.origin === "string" ? body.origin : "";
      let authUrl = "";

      const nonce = crypto.randomUUID();
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(serviceRoleKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(nonce + user.id));
      const hmac = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const stateBase = {
        userId: user.id,
        returnPath,
        nonce,
        hmac,
        brandId: resolvedBrandId,
        logicalBrandId: requestedBrandId,
        workspaceId,
      };

      if (isMicrosoftSubService(provider)) {
        const clientId = getRequiredEnv("MICROSOFT_CLIENT_ID");
        const redirectUri = `${redirectBase}/microsoft-oauth-callback`;
        const service = MICROSOFT_SERVICES[provider];
        const state = btoa(JSON.stringify({ ...stateBase, origin, subProvider: provider }));
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(service.scopes)}&state=${state}&response_mode=query`;
      } else if (isGoogleSubService(provider)) {
        const clientId = getRequiredEnv("GOOGLE_CLIENT_ID");
        const redirectUri = `${redirectBase}/google-oauth-callback`;
        const service = GOOGLE_SERVICES[provider];
        const state = btoa(JSON.stringify({ ...stateBase, subProvider: provider }));
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(service.scopes)}&state=${state}&access_type=offline&prompt=consent`;
      } else {
        switch (provider) {
          case "microsoft": {
            const clientId = getRequiredEnv("MICROSOFT_CLIENT_ID");
            const redirectUri = `${redirectBase}/microsoft-oauth-callback`;
            const scopes = "openid profile email offline_access Mail.ReadWrite Mail.Send Calendars.ReadWrite Files.ReadWrite.All User.Read Contacts.ReadWrite Notes.ReadWrite.All Tasks.ReadWrite";
            const state = btoa(JSON.stringify({ ...stateBase, origin }));
            authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&response_mode=query`;
            break;
          }
          case "google": {
            const clientId = getRequiredEnv("GOOGLE_CLIENT_ID");
            const redirectUri = `${redirectBase}/google-oauth-callback`;
            const scopes = "openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/presentations";
            const state = btoa(JSON.stringify(stateBase));
            authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent`;
            break;
          }
          case "slack": {
            const clientId = getRequiredEnv("SLACK_CLIENT_ID");
            const redirectUri = `${redirectBase}/slack-oauth-callback`;
            const scopes = "channels:read,channels:history,groups:read,groups:history,files:read,users:read,team:read";
            const state = btoa(JSON.stringify({ ...stateBase, origin }));
            authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
            break;
          }
          case "zoom": {
            const clientId = getRequiredEnv("ZOOM_CLIENT_ID");
            const redirectUri = `${redirectBase}/zoom-oauth-callback`;
            const state = btoa(JSON.stringify({ ...stateBase, origin }));
            authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
            break;
          }
          case "stripe": {
            // Stripe Connect OAuth (Standard accounts). client_id is the Connect platform ID (ca_...).
            const clientId = getRequiredEnv("STRIPE_CLIENT_ID");
            const redirectUri = `${redirectBase}/stripe-oauth-callback`;
            const state = btoa(JSON.stringify({ ...stateBase, origin }));
            authUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
            break;
          }
          case "hubspot": {
            const clientId = getRequiredEnv("HUBSPOT_CLIENT_ID");
            const redirectUri = `${redirectBase}/hubspot-oauth-callback`;
            const requiredScopes = "oauth crm.objects.contacts.read crm.objects.contacts.write";
            const optionalScopes = "crm.objects.companies.read crm.objects.companies.write crm.objects.deals.read crm.objects.deals.write crm.objects.owners.read crm.schemas.contacts.read crm.schemas.companies.read crm.schemas.deals.read sales-email-read";
            const state = btoa(JSON.stringify({ ...stateBase, origin }));
            authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(requiredScopes)}&optional_scope=${encodeURIComponent(optionalScopes)}&state=${state}`;
            break;
          }
          default:
            return jsonResponse({ error: `Unsupported provider: ${provider}` }, 400);
        }
      }

      return jsonResponse({ authUrl });
    }

    if (action === "save-credentials" && provider === "wordpress") {
      if (requestedBrandId && !resolvedBrandId) {
        return jsonResponse({ error: "Business not found" }, 400);
      }

      if (!body.siteUrl || !body.username || !body.appPassword) {
        return jsonResponse({ error: "Missing siteUrl, username, or appPassword" }, 400);
      }

      const normalizedUrl = String(body.siteUrl).replace(/\/+$/, "");
      const basicAuth = btoa(`${body.username}:${body.appPassword}`);
      const testRes = await fetch(`${normalizedUrl}/wp-json/wp/v2/users/me`, {
        headers: { Authorization: `Basic ${basicAuth}` },
      });

      if (!testRes.ok) {
        return jsonResponse({ error: "Invalid WordPress credentials. Check your site URL, username, and application password." }, 400);
      }

      const wpUser = await testRes.json();

      const oauthUpsert = await upsertOauthToken(supabaseAdmin, {
        userId: user.id,
        workspaceId,
        provider: "wordpress",
        access_token: basicAuth,
        refresh_token: null,
        scopes: "posts,pages,media",
        provider_user_id: String(wpUser.id),
        provider_email: wpUser.email || body.username,
      });

      if (oauthUpsert.error) {
        console.error("connect-provider wordpress oauth upsert error", oauthUpsert.error);
        return jsonResponse({ error: "Failed to save WordPress credentials" }, 500);
      }

      const connectionUpsert = await upsertConnection(supabaseAdmin, {
        userId: user.id,
        workspaceId,
        provider: "wordpress",
        status: "connected",
        brand_id: resolvedBrandId,
        metadata: { siteUrl: normalizedUrl, username: body.username, displayName: wpUser.name },
      });

      if (connectionUpsert.error) {
        console.error("connect-provider wordpress connection upsert error", connectionUpsert.error);
        return jsonResponse({ error: "Failed to save WordPress connection" }, 500);
      }

      return jsonResponse({ success: true, displayName: wpUser.name });
    }

    if (action === "disconnect") {
      if (!provider) {
        return jsonResponse({ error: "Provider is required" }, 400);
      }
      if (!workspaceId) {
        return jsonResponse({ error: "Workspace is required" }, 400);
      }

      const connRes = await supabaseAdmin
        .from("user_connections")
        .update({ status: "disconnected" })
        .eq("user_id", user.id)
        .eq("provider", provider)
        .eq("workspace_id", workspaceId);

      if (connRes.error) {
        console.error("connect-provider disconnect connection error", connRes.error);
        return jsonResponse({ error: "Failed to disconnect provider" }, 500);
      }

      const tokRes = await supabaseAdmin
        .from("user_oauth_tokens")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider)
        .eq("workspace_id", workspaceId);

      if (tokRes.error) {
        console.error("connect-provider disconnect token error", tokRes.error);
        return jsonResponse({ error: "Failed to remove stored credentials" }, 500);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("connect-provider error occurred", errorMessage);
    return jsonResponse({ error: errorMessage }, 500);
  }
});
