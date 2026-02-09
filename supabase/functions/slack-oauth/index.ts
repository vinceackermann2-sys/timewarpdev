 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.1";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const url = new URL(req.url);
     const code = url.searchParams.get("code");
     const error = url.searchParams.get("error");
 
     // Get redirect URL from env or use default
     const appUrl = Deno.env.get("APP_URL") || "https://digital-guide-genie.lovable.app";
 
     // Handle OAuth errors
     if (error) {
       console.error("Slack OAuth error:", error);
       return Response.redirect(`${appUrl}/ai-ceo?slack_error=${error}`, 302);
     }
 
     if (!code) {
       return new Response("Missing authorization code", { status: 400 });
     }
 
     const clientId = Deno.env.get("SLACK_CLIENT_ID");
     const clientSecret = Deno.env.get("SLACK_CLIENT_SECRET");
 
     if (!clientId || !clientSecret) {
       console.error("Missing Slack OAuth credentials");
       return Response.redirect(`${appUrl}/ai-ceo?slack_error=config_error`, 302);
     }
 
     // Exchange code for access token
     const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
       method: "POST",
       headers: { "Content-Type": "application/x-www-form-urlencoded" },
       body: new URLSearchParams({
         client_id: clientId,
         client_secret: clientSecret,
         code: code,
       }),
     });
 
     const tokenData = await tokenResponse.json();
     console.log("Slack OAuth response:", JSON.stringify({ ok: tokenData.ok, team: tokenData.team?.name }));
 
     if (!tokenData.ok) {
       console.error("Slack token exchange failed:", tokenData.error);
       return Response.redirect(`${appUrl}/ai-ceo?slack_error=${tokenData.error}`, 302);
     }
 
     // Store installation in database
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseKey);
 
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
       console.error("Database error storing installation:", dbError);
       return Response.redirect(`${appUrl}/ai-ceo?slack_error=db_error`, 302);
     }
 
     console.log("Slack app installed successfully for team:", tokenData.team.name);
 
     // Redirect to success page
     return Response.redirect(`${appUrl}/ai-ceo?slack_installed=true&team=${encodeURIComponent(tokenData.team.name)}`, 302);
   } catch (error) {
     console.error("Slack OAuth error:", error);
     const appUrl = Deno.env.get("APP_URL") || "https://digital-guide-genie.lovable.app";
     return Response.redirect(`${appUrl}/ai-ceo?slack_error=unknown`, 302);
   }
 });