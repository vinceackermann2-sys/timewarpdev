 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 /**
  * Server-side Google OAuth callback handler.
  * 
  * This edge function receives the OAuth redirect from Google directly,
  * exchanges the authorization code for tokens, and stores them server-side.
  * This eliminates race conditions with client-side token capture.
  * 
  * Flow:
  * 1. User initiates OAuth in Auth.tsx with state containing user_id
  * 2. Google redirects here with code and state
  * 3. We exchange code for tokens
  * 4. Store tokens with service role (bypasses RLS)
  * 5. Redirect user to app
  */
 
 const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
 const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
 const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
 
 // App URL for redirects - use preview/production URL
 const APP_URL = "https://id-preview--d89e6779-3499-4f43-b442-f1bfad461bb0.lovable.app";
 
 Deno.serve(async (req) => {
   const url = new URL(req.url);
   
   // Handle GET request (OAuth callback from Google)
   if (req.method === "GET") {
     const code = url.searchParams.get("code");
     const state = url.searchParams.get("state");
     const error = url.searchParams.get("error");
     
     console.log("[google-oauth-callback] Received callback", { 
       hasCode: !!code, 
       hasState: !!state,
       error 
     });
     
     // Handle OAuth errors from Google
     if (error) {
       console.error("[google-oauth-callback] OAuth error:", error);
       return Response.redirect(`${APP_URL}/?google_error=${encodeURIComponent(error)}`, 302);
     }
     
     if (!code || !state) {
       console.error("[google-oauth-callback] Missing code or state");
       return Response.redirect(`${APP_URL}/?google_error=missing_params`, 302);
     }
     
     // Decode state to get user_id
     let stateData: { user_id: string; nonce: string };
     try {
       stateData = JSON.parse(atob(state));
       console.log("[google-oauth-callback] Decoded state:", { user_id: stateData.user_id });
     } catch (e) {
       console.error("[google-oauth-callback] Failed to decode state:", e);
       return Response.redirect(`${APP_URL}/?google_error=invalid_state`, 302);
     }
     
     // Verify state nonce against stored value
     const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
       auth: { persistSession: false },
     });
     
     const { data: connectionData, error: connectionError } = await supabase
       .from("google_workspace_connections")
       .select("oauth_state, oauth_state_expires_at")
       .eq("user_id", stateData.user_id)
       .single();
     
     if (connectionError || !connectionData) {
       console.error("[google-oauth-callback] Failed to verify state:", connectionError);
       return Response.redirect(`${APP_URL}/?google_error=state_verification_failed`, 302);
     }
     
     // Check if state matches and hasn't expired
     if (connectionData.oauth_state !== stateData.nonce) {
       console.error("[google-oauth-callback] State nonce mismatch");
       return Response.redirect(`${APP_URL}/?google_error=invalid_nonce`, 302);
     }
     
     if (new Date(connectionData.oauth_state_expires_at!) < new Date()) {
       console.error("[google-oauth-callback] State expired");
       return Response.redirect(`${APP_URL}/?google_error=state_expired`, 302);
     }
     
     // Exchange authorization code for tokens
     const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;
     
     console.log("[google-oauth-callback] Exchanging code for tokens");
     
     const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
       method: "POST",
       headers: { "Content-Type": "application/x-www-form-urlencoded" },
       body: new URLSearchParams({
         client_id: GOOGLE_CLIENT_ID,
         client_secret: GOOGLE_CLIENT_SECRET,
         code,
         grant_type: "authorization_code",
         redirect_uri: redirectUri,
       }),
     });
     
     if (!tokenResponse.ok) {
       const errorText = await tokenResponse.text();
       console.error("[google-oauth-callback] Token exchange failed:", errorText);
       return Response.redirect(`${APP_URL}/?google_error=token_exchange_failed`, 302);
     }
     
     const tokenData = await tokenResponse.json();
     console.log("[google-oauth-callback] Token exchange successful", {
       hasAccessToken: !!tokenData.access_token,
       hasRefreshToken: !!tokenData.refresh_token,
       expiresIn: tokenData.expires_in,
     });
     
     // Calculate expiration time
     const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
     
     // Store tokens using service role (bypasses RLS)
     const { error: tokenError } = await supabase
       .from("google_workspace_tokens")
       .upsert({
         user_id: stateData.user_id,
         access_token: tokenData.access_token,
         refresh_token: tokenData.refresh_token || "",
         expires_at: expiresAt,
         updated_at: new Date().toISOString(),
       }, { onConflict: "user_id" });
     
     if (tokenError) {
       console.error("[google-oauth-callback] Failed to store tokens:", tokenError);
       return Response.redirect(`${APP_URL}/?google_error=storage_failed`, 302);
     }
     
     console.log("[google-oauth-callback] Tokens stored successfully");
     
     // Update connection status and clear OAuth state
     await supabase
       .from("google_workspace_connections")
       .upsert({
         user_id: stateData.user_id,
         connected: true,
         last_connected_at: new Date().toISOString(),
         updated_at: new Date().toISOString(),
         oauth_state: null,
         oauth_state_expires_at: null,
       }, { onConflict: "user_id" });
     
     console.log("[google-oauth-callback] Redirecting to app");
     
     // Redirect to app with success indicator
     // Redirect to root - Index.tsx will detect google_connected and trigger research mode
     return Response.redirect(`${APP_URL}/?google_connected=true`, 302);
   }
   
   // Return 405 for other methods
   return new Response(JSON.stringify({ error: "Method not allowed" }), {
     status: 405,
     headers: { "Content-Type": "application/json" },
   });
 });