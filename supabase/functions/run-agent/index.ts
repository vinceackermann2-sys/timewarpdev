import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const REPLIT_STAGEHAND_URL = "https://time-warp-ai--vinceackermann2.replit.app";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { task, role, timeEstimate } = await req.json();
    
    console.log(`Sending task to Replit Stagehand: ${task}, role: ${role}`);

    // Call Replit Stagehand server to start the browser session and execute task
    const response = await fetch(`${REPLIT_STAGEHAND_URL}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task,
        role,
        timeEstimate,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Replit Stagehand error:", response.status, errorText);
      throw new Error(`Stagehand server error: ${errorText}`);
    }

    const data = await response.json();
    console.log("Replit Stagehand response:", data);

    // Return the live view URL and session info to the client
    return new Response(
      JSON.stringify({
        sessionId: data.sessionId,
        liveViewUrl: data.liveUrl || data.liveViewUrl,
        status: data.status || 'running',
        task,
        role
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
