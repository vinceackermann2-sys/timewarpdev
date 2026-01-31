import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AgentAction {
  type: 'navigate' | 'click' | 'type' | 'scroll' | 'wait' | 'complete' | 'error';
  target?: string;
  value?: string;
  x?: number;
  y?: number;
  reasoning: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { task, role, action } = await req.json();
    
    const BROWSERBASE_API_KEY = Deno.env.get("BROWSERBASE_API_KEY");
    const BROWSERBASE_PROJECT_ID = Deno.env.get("BROWSERBASE_PROJECT_ID");
    
    if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
      throw new Error("Browserbase credentials not configured");
    }

    // If action is 'create', create a new session
    if (action === 'create' || !action) {
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

      // Get the debug URLs which include the embeddable live view URL
      const debugResponse = await fetch(`https://www.browserbase.com/v1/sessions/${session.id}/debug`, {
        method: "GET",
        headers: {
          "x-bb-api-key": BROWSERBASE_API_KEY,
        },
      });

      if (!debugResponse.ok) {
        const errorText = await debugResponse.text();
        console.error("Failed to get debug URLs:", errorText);
        throw new Error(`Failed to get debug URLs: ${errorText}`);
      }

      const debugInfo = await debugResponse.json();
      console.log("Debug info received:", JSON.stringify(debugInfo));
      
      // Return session info and live view URL
      return new Response(
        JSON.stringify({ 
          sessionId: session.id,
          liveViewUrl: debugInfo.debuggerFullscreenUrl,
          connectUrl: debugInfo.wsUrl || `wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}&sessionId=${session.id}`,
          task,
          role
        }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If action is 'execute', run the agent on an existing session
    if (action === 'execute') {
      const { sessionId, screenshot } = await req.json();
      
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      // Use Lovable AI to analyze the screenshot and decide the next action
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
              content: `You are a browser automation agent. Your task is to help users complete tasks by analyzing screenshots and deciding what actions to take.

You must respond with a JSON object describing the next action to take. The available actions are:
- navigate: Go to a URL. Use: {"type": "navigate", "value": "https://example.com", "reasoning": "..."}
- click: Click at coordinates. Use: {"type": "click", "x": 100, "y": 200, "target": "button description", "reasoning": "..."}
- type: Type text. Use: {"type": "type", "value": "text to type", "target": "input field description", "reasoning": "..."}
- scroll: Scroll the page. Use: {"type": "scroll", "value": "down" or "up", "reasoning": "..."}
- wait: Wait for page to load. Use: {"type": "wait", "reasoning": "..."}
- complete: Task is done. Use: {"type": "complete", "reasoning": "summary of what was accomplished"}
- error: Cannot proceed. Use: {"type": "error", "reasoning": "explanation of the problem"}

IMPORTANT:
- For click actions, estimate the x,y coordinates based on where elements appear in the screenshot
- Be specific about what you're clicking and why
- If you see a login page, describe what credentials are needed
- Always explain your reasoning`
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Task: ${task}\n\nAnalyze this screenshot and decide the next action to take. Respond with a JSON object.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${screenshot}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI analysis failed:", errorText);
        throw new Error(`AI analysis failed: ${errorText}`);
      }

      const aiResult = await aiResponse.json();
      const content = aiResult.choices?.[0]?.message?.content || '';
      
      console.log("AI response:", content);

      // Parse the JSON from the AI response
      let nextAction: AgentAction;
      try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          nextAction = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        nextAction = {
          type: 'error',
          reasoning: `Failed to parse AI response: ${content}`
        };
      }

      return new Response(
        JSON.stringify({ action: nextAction }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
