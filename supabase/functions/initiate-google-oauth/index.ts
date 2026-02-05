 /**
  * Initiates Google OAuth flow by returning the OAuth URL.
  * This keeps the client ID server-side while allowing the frontend to start the flow.
  */
 
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
 const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
 
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
    
    // Store OAuth state for verification
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    
    const { error: stateError } = await supabase
      .from("google_workspace_connections")
      .upsert({
        user_id,
        oauth_state: nonce,
        oauth_state_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    
    if (stateError) {
      console.error("[initiate-google-oauth] Failed to store state:", stateError);
      return new Response(JSON.stringify({ error: "Failed to initiate OAuth" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Create state parameter with origin for redirect
    const stateParam = btoa(JSON.stringify({ user_id, nonce, origin: origin || "" }));
     
     // Build OAuth URL
     const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;
     const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
     googleAuthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
     googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
     googleAuthUrl.searchParams.set("response_type", "code");
     googleAuthUrl.searchParams.set("scope", scopes || "openid email profile");
     googleAuthUrl.searchParams.set("state", stateParam);
     googleAuthUrl.searchParams.set("access_type", "offline");
     googleAuthUrl.searchParams.set("prompt", "consent");
     
     console.log("[initiate-google-oauth] Generated OAuth URL for user:", user_id);
     
     return new Response(JSON.stringify({ url: googleAuthUrl.toString() }), {
       status: 200,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     console.error("[initiate-google-oauth] Error:", error);
     return new Response(JSON.stringify({ error: "Internal error" }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });