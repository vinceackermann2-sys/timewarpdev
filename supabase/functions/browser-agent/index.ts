import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper to stream SSE events
function streamEvent(controller: ReadableStreamDefaultController, data: any) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { role, task, timeEstimate, googleToken } = await req.json();
    
    const BROWSERLESS_API_KEY = Deno.env.get("BROWSERLESS_API_KEY");
    if (!BROWSERLESS_API_KEY) {
      return new Response(JSON.stringify({ error: "Browser service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          streamEvent(controller, { type: "session", status: "starting" });

          // Get role-specific context
          const roleContext = getRoleContext(role);

          // Step 1: Use AI to plan the task
          streamEvent(controller, { type: "think", content: `${roleContext.label} analyzing task: "${task}"` });

          const planPrompt = `You are an AI ${roleContext.label} assistant that can control a web browser.
Your specialty: ${roleContext.focus}

The user wants you to: ${task}

Time budget: ${timeEstimate}

Create a step-by-step plan to accomplish this task using a web browser. 
For each step, specify:
1. The URL to navigate to (if needed)
2. What elements to click
3. What text to type
4. What to look for to confirm success

Be specific and practical. Only include steps that can be done without payment/credit card.
If the task requires signing up for a service, use the user's Google account for OAuth sign-in when available.

Return your plan as a JSON array of steps:
[
  {"action": "navigate", "url": "https://...", "reason": "..."},
  {"action": "click", "selector": "button text or description", "reason": "..."},
  {"action": "type", "selector": "input field description", "text": "...", "reason": "..."},
  {"action": "screenshot", "reason": "..."}
]`;

          const planResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "You are a browser automation expert. Return only valid JSON." },
                { role: "user", content: planPrompt }
              ],
              temperature: 0.3,
            }),
          });

          if (!planResponse.ok) {
            throw new Error("Failed to generate task plan");
          }

          const planData = await planResponse.json();
          const planText = planData.choices?.[0]?.message?.content || "";
          
          // Extract JSON from response
          let steps: any[] = [];
          try {
            const jsonMatch = planText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              steps = JSON.parse(jsonMatch[0]);
            }
          } catch {
            streamEvent(controller, { type: "error", message: "Failed to parse task plan" });
            controller.close();
            return;
          }

          streamEvent(controller, { type: "think", content: `Plan created with ${steps.length} steps` });

          // Step 2: Connect to Browserless and execute steps
          // Use the /screenshot endpoint for simpler operation
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            await new Promise(resolve => setTimeout(resolve, 1000)); // Pace the actions

            if (step.action === "navigate") {
              streamEvent(controller, { type: "navigate", url: step.url });
              
              // Take a screenshot of the page
              try {
                const screenshotResponse = await fetch(`https://chrome.browserless.io/screenshot?token=${BROWSERLESS_API_KEY}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    url: step.url,
                    options: {
                      type: "png",
                      fullPage: false,
                    },
                    gotoOptions: {
                      waitUntil: "networkidle2",
                      timeout: 30000,
                    },
                  }),
                });

                if (screenshotResponse.ok) {
                  const imageBuffer = await screenshotResponse.arrayBuffer();
                  const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
                  streamEvent(controller, { type: "screenshot", image: base64 });
                }
              } catch (e) {
                console.error("Screenshot error:", e);
              }
            } else if (step.action === "click") {
              streamEvent(controller, { type: "click", element: step.selector, description: step.reason });
            } else if (step.action === "type") {
              streamEvent(controller, { type: "type", text: step.text?.slice(0, 20) + "..." });
            } else if (step.action === "screenshot") {
              streamEvent(controller, { type: "think", content: step.reason });
            }
          }

          // Step 3: Generate summary
          streamEvent(controller, { type: "think", content: "Generating task summary..." });
          
          const summaryPrompt = `You completed this task: "${task}"
          
Steps taken:
${steps.map((s, i) => `${i + 1}. ${s.action}: ${s.reason}`).join("\n")}

Write a brief 2-3 sentence summary of what was accomplished.`;

          const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "user", content: summaryPrompt }
              ],
            }),
          });

          let summary = "Task completed.";
          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            summary = summaryData.choices?.[0]?.message?.content || summary;
          }

          streamEvent(controller, { type: "complete", summary });
          
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

        } catch (error) {
          console.error("Browser agent error:", error);
          streamEvent(controller, { 
            type: "error", 
            message: error instanceof Error ? error.message : "An unexpected error occurred" 
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("Request error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getRoleContext(role: string): { label: string; focus: string } {
  switch (role) {
    case "cmo":
      return {
        label: "CMO",
        focus: "Marketing, branding, campaigns, social media, email marketing, analytics"
      };
    case "cfo":
      return {
        label: "CFO",
        focus: "Finance, accounting, budgets, invoicing, expense tracking, financial reporting"
      };
    default:
      return {
        label: "CEO",
        focus: "Business operations, project management, team collaboration, strategic planning"
      };
  }
}
