/**
 * Initiates Microsoft OAuth flow by returning the OAuth URL.
 * Keeps client credentials server-side.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { scopes, user_id, origin } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate nonce for CSRF protection
    const nonce = crypto.randomUUID();

    // Store OAuth state
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { error: stateError } = await supabase
      .from("microsoft_workspace_connections")
      .upsert({
        user_id,
        oauth_state: nonce,
        oauth_state_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (stateError) {
      console.error("[initiate-microsoft-oauth] Failed to store state:", stateError);
      return new Response(JSON.stringify({ error: "Failed to initiate OAuth" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create state parameter
    const stateParam = btoa(JSON.stringify({ user_id, nonce, origin: origin || "" }));

    // Build Microsoft OAuth URL
    const redirectUri = `${SUPABASE_URL}/functions/v1/microsoft-oauth-callback`;
    const defaultScopes = scopes || "openid email profile User.Read Mail.Read Calendars.Read Files.Read.All";
    
    const msAuthUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    msAuthUrl.searchParams.set("client_id", MICROSOFT_CLIENT_ID);
    msAuthUrl.searchParams.set("redirect_uri", redirectUri);
    msAuthUrl.searchParams.set("response_type", "code");
    msAuthUrl.searchParams.set("scope", defaultScopes);
    msAuthUrl.searchParams.set("state", stateParam);
    msAuthUrl.searchParams.set("response_mode", "query");
    msAuthUrl.searchParams.set("prompt", "consent");

    console.log("[initiate-microsoft-oauth] Generated OAuth URL for user:", user_id);

    return new Response(JSON.stringify({ url: msAuthUrl.toString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[initiate-microsoft-oauth] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
