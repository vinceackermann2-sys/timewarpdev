import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { task, role, sessionId: existingSessionId, action } = await req.json();
    
    const BROWSERBASE_API_KEY = Deno.env.get("BROWSERBASE_API_KEY");
    const BROWSERBASE_PROJECT_ID = Deno.env.get("BROWSERBASE_PROJECT_ID");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
      throw new Error("Browserbase credentials not configured");
    }

    // ACTION: Create a new session and return live view URL
    if (action === 'create' || !action) {
      console.log(`Creating Browserbase session for task: ${task}, role: ${role}`);

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
        throw new Error(`Failed to create Browserbase session: ${errorText}`);
      }

      const session = await sessionResponse.json();
      console.log("Session created:", session.id);

      // Get the debug URLs for live view
      const debugResponse = await fetch(`https://www.browserbase.com/v1/sessions/${session.id}/debug`, {
        method: "GET",
        headers: { "x-bb-api-key": BROWSERBASE_API_KEY },
      });

      if (!debugResponse.ok) {
        throw new Error(`Failed to get debug URLs`);
      }

      const debugInfo = await debugResponse.json();
      console.log("Live view URL ready");
      
      return new Response(
        JSON.stringify({ 
          sessionId: session.id,
          liveViewUrl: debugInfo.debuggerFullscreenUrl,
          connectUrl: debugInfo.wsUrl,
          task,
          role
        }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: Execute a single step using CDP via Browserbase connect API
    if (action === 'execute') {
      if (!existingSessionId) {
        throw new Error("sessionId required for execute action");
      }
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY not configured");
      }

      console.log(`Executing task on session: ${existingSessionId}`);
      console.log(`Task: ${task}`);

      // For now, use Lovable AI to analyze and plan the task
      // The actual browser control happens client-side via the live view
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a browser automation planner. Given a task, break it down into clear steps that a human or automation can follow.

Format your response as a JSON object with:
- steps: array of step descriptions
- firstUrl: the URL to navigate to first
- summary: brief summary of the plan`
            },
            {
              role: "user",
              content: `Plan the steps to complete this task: ${task}`
            }
          ],
        }),
      });

      if (!aiResponse.ok) {
        throw new Error("AI planning failed");
      }

      const aiResult = await aiResponse.json();
      const content = aiResult.choices?.[0]?.message?.content || '';
      
      // Parse the plan
      let plan;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        plan = jsonMatch ? JSON.parse(jsonMatch[0]) : { steps: [content], summary: content };
      } catch {
        plan = { steps: [content], summary: "Task planned" };
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          plan,
          message: "Task plan ready. Stagehand integration requires Node.js runtime - for full automation, the browser is ready for manual interaction in the live view."
        }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action specified");

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
