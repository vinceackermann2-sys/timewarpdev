/**
 * Initiates Slack OAuth flow by returning the OAuth URL.
 * Keeps client credentials server-side.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SLACK_CLIENT_ID = Deno.env.get("SLACK_CLIENT_ID")!;

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
    if (!SLACK_CLIENT_ID) {
      console.error("[initiate-slack-oauth] SLACK_CLIENT_ID not configured");
      return new Response(JSON.stringify({ error: "Slack not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const origin = body.origin || "";

    const redirectUri = `${SUPABASE_URL}/functions/v1/slack-oauth`;
    const scopes = "channels:history,channels:read,chat:write,users:read";

    // Encode origin in state so callback can redirect back correctly
    const state = btoa(JSON.stringify({ origin }));

    const slackUrl = new URL("https://slack.com/oauth/v2/authorize");
    slackUrl.searchParams.set("client_id", SLACK_CLIENT_ID);
    slackUrl.searchParams.set("scope", scopes);
    slackUrl.searchParams.set("redirect_uri", redirectUri);
    slackUrl.searchParams.set("state", state);

    console.log("[initiate-slack-oauth] Generated Slack OAuth URL");

    return new Response(JSON.stringify({ url: slackUrl.toString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[initiate-slack-oauth] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
