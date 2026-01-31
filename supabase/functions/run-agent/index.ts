import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { task, role } = await req.json();
    
    const BROWSERBASE_API_KEY = Deno.env.get("BROWSERBASE_API_KEY");
    const BROWSERBASE_PROJECT_ID = Deno.env.get("BROWSERBASE_PROJECT_ID");
    
    if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
      throw new Error("Browserbase credentials not configured");
    }

    console.log(`Creating Browserbase session for task: ${task}, role: ${role}`);

    // Create a session using the Browserbase REST API
    const sessionResponse = await fetch("https://www.browserbase.com/v1/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bb-api-key": BROWSERBASE_API_KEY,
      },
      body: JSON.stringify({
        projectId: BROWSERBASE_PROJECT_ID,
      }),
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error("Browserbase session creation failed:", errorText);
      throw new Error(`Failed to create Browserbase session: ${errorText}`);
    }

    const session = await sessionResponse.json();
    console.log("Session created:", session.id);

    // Get the connect URL for live viewing - Browserbase returns this in the session
    // The live view URL should be the one designed for iframe embedding
    const connectUrl = session.connectUrl || `wss://connect.browserbase.com?sessionId=${session.id}`;
    
    // Use Browserbase's iframe-friendly live view URL
    const liveViewUrl = `https://www.browserbase.com/sessions/${session.id}/live-view`;
    
    // Return the session info and live view URL
    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        liveViewUrl,
        task,
        role
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in run-agent:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
