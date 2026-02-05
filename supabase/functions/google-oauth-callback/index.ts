 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
/**
 * This edge function stores Google OAuth tokens server-side using service role,
 * bypassing the RLS policies that deny client-side access to google_workspace_tokens.
 * 
 * Called from the frontend after Supabase OAuth completes with provider tokens.
 */
 Deno.serve(async (req) => {
   // Handle CORS preflight
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
 
   const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
   const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 
  // Verify authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.error("[store-google-tokens] No authorization header");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
   }
 
  // Create authenticated client to get user
  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
  
  if (userError || !user) {
    console.error("[store-google-tokens] Invalid token:", userError);
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
   }
 
  console.log("[store-google-tokens] Authenticated user:", user.id);

  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
   }
 
  const { access_token, refresh_token, expires_in } = body;

  if (!access_token) {
    console.error("[store-google-tokens] No access token provided");
    return new Response(JSON.stringify({ error: "Missing access_token" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
  }
 
  console.log("[store-google-tokens] Storing tokens", {
    hasAccessToken: !!access_token,
    hasRefreshToken: !!refresh_token,
    expiresIn: expires_in,
  });
 
  // Calculate expiration time
  const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();
 
  // Store tokens using service role (bypasses RLS)
  const { error: tokenError } = await supabaseAuth
    .from("google_workspace_tokens")
    .upsert({
      user_id: user.id,
      access_token,
      refresh_token: refresh_token || "",
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (tokenError) {
    console.error("[store-google-tokens] Failed to store tokens:", tokenError);
    return new Response(JSON.stringify({ error: "Failed to store tokens", details: tokenError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
   }

  console.log("[store-google-tokens] Tokens stored successfully");

  // Update connection status
  const { error: connectionError } = await supabaseAuth
    .from("google_workspace_connections")
    .upsert({
      user_id: user.id,
      connected: true,
      last_connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (connectionError) {
    console.error("[store-google-tokens] Failed to update connection:", connectionError);
    // Don't fail - tokens are stored, connection update is secondary
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
 });