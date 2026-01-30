import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function streamEvent(controller: ReadableStreamDefaultController, data: any) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

function getRoleContext(role: string): { label: string; focus: string } {
  switch (role) {
    case "cmo":
      return { label: "CMO", focus: "Marketing, branding, campaigns, social media, email marketing, analytics" };
    case "cfo":
      return { label: "CFO", focus: "Finance, accounting, budgets, invoicing, expense tracking, financial reporting" };
    default:
      return { label: "CEO", focus: "Business operations, project management, team collaboration, strategic planning" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized", details: "Missing bearer token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth error:", authError?.message || "No user found");
      return new Response(JSON.stringify({ error: "Invalid session", details: authError?.message || "User not found" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("User authenticated:", user.id);

    const { role, task, timeEstimate } = await req.json();

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
        let ws: WebSocket | null = null;
        let sessionId: string | null = null;
        let pageTargetId: string | null = null;
        let messageId = 1;

        const sendCDP = (method: string, params: any = {}): Promise<any> => {
          return new Promise((resolve, reject) => {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
              reject(new Error("WebSocket not connected"));
              return;
            }
            const id = messageId++;
            const msg = sessionId
              ? { id, sessionId, method, params }
              : { id, method, params };
            
            const handler = (event: MessageEvent) => {
              try {
                const data = JSON.parse(event.data);
                if (data.id === id) {
                  ws!.removeEventListener("message", handler);
                  if (data.error) {
                    reject(new Error(data.error.message));
                  } else {
                    resolve(data.result);
                  }
                }
              } catch { /* ignore parse errors */ }
            };
            ws.addEventListener("message", handler);
            ws.send(JSON.stringify(msg));

            // Timeout after 30s
            setTimeout(() => {
              ws?.removeEventListener("message", handler);
              reject(new Error("CDP command timeout"));
            }, 30000);
          });
        };

        try {
          streamEvent(controller, { type: "think", content: "Connecting to browser..." });

          // Connect to Browserless via WebSocket (CDP)
          const wsUrl = `wss://chrome.browserless.io?token=${BROWSERLESS_API_KEY}`;
          ws = new WebSocket(wsUrl);

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("WebSocket connection timeout")), 15000);
            ws!.onopen = () => { clearTimeout(timeout); resolve(); };
            ws!.onerror = (e) => { clearTimeout(timeout); reject(new Error("WebSocket error")); };
          });

          streamEvent(controller, { type: "think", content: "Browser connected, setting up session..." });

          // Get targets and attach to page
          const targets = await sendCDP("Target.getTargets");
          const pageTarget = targets.targetInfos?.find((t: any) => t.type === "page");
          
          if (!pageTarget) {
            // Create a new page target
            const newTarget = await sendCDP("Target.createTarget", { url: "about:blank" });
            pageTargetId = newTarget.targetId;
          } else {
            pageTargetId = pageTarget.targetId;
          }

          // Attach to target
          const attachResult = await sendCDP("Target.attachToTarget", {
            targetId: pageTargetId,
            flatten: true,
          });
          sessionId = attachResult.sessionId;

          // Get live URL for interactive embedding
          let liveURL: string | null = null;
          try {
            const liveResult = await sendCDP("Browserless.liveURL", { interactive: true });
            liveURL = liveResult.liveURL;
            streamEvent(controller, { type: "liveUrl", url: liveURL });
            console.log("Live URL generated:", liveURL);
          } catch (e) {
            console.warn("Could not get liveURL, falling back to screenshots:", e);
          }

          // Enable page events
          await sendCDP("Page.enable");
          await sendCDP("Runtime.enable");

          // Set viewport
          await sendCDP("Emulation.setDeviceMetricsOverride", {
            width: 1280,
            height: 720,
            deviceScaleFactor: 1,
            mobile: false,
          });

          streamEvent(controller, { type: "session", id: sessionId, liveUrl: liveURL });

          // Get role context and generate plan
          const roleContext = getRoleContext(role);
          streamEvent(controller, { type: "think", content: `${roleContext.label} analyzing task: "${task}"` });

          const planPrompt = `You are an AI ${roleContext.label} assistant controlling a web browser.
Your specialty: ${roleContext.focus}

Task: ${task}
Time budget: ${timeEstimate}

Create a step-by-step plan. For each step specify:
- action: "navigate" | "click" | "type" | "wait" | "screenshot"
- For navigate: include "url"
- For click: include "selector" (CSS selector) and "description"
- For type: include "selector" and "text"
- For wait: include "ms" (milliseconds)

IMPORTANT: 
- If a site requires login and offers "Sign in with Google", use that option.
- Be specific with CSS selectors (e.g., button[type="submit"], input[name="email"]).
- Start by navigating to the main site.

Return ONLY a JSON array:
[{"action": "navigate", "url": "https://...", "reason": "..."}]`;

          const planResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "You are a browser automation expert. Return only valid JSON array." },
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
          
          let steps: any[] = [];
          try {
            const jsonMatch = planText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              steps = JSON.parse(jsonMatch[0]);
            }
          } catch {
            streamEvent(controller, { type: "error", message: "Failed to parse task plan" });
            ws?.close();
            controller.close();
            return;
          }

          streamEvent(controller, { type: "think", content: `Plan created with ${steps.length} steps` });

          // Execute steps
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            streamEvent(controller, { type: "step", index: i + 1, total: steps.length, action: step.action });

            try {
              if (step.action === "navigate") {
                streamEvent(controller, { type: "navigate", url: step.url });
                await sendCDP("Page.navigate", { url: step.url });
                // Wait for page load
                await new Promise(r => setTimeout(r, 3000));
                
              } else if (step.action === "click") {
                streamEvent(controller, { type: "click", element: step.selector, description: step.description || step.reason });
                
                // Execute click via JavaScript
                const clickScript = `
                  (function() {
                    const el = document.querySelector('${step.selector.replace(/'/g, "\\'")}');
                    if (el) { el.click(); return true; }
                    return false;
                  })()
                `;
                const result = await sendCDP("Runtime.evaluate", { expression: clickScript, returnByValue: true });
                if (!result.result?.value) {
                  streamEvent(controller, { type: "warning", message: `Element not found: ${step.selector}` });
                }
                await new Promise(r => setTimeout(r, 1000));
                
              } else if (step.action === "type") {
                streamEvent(controller, { type: "type", selector: step.selector, text: step.text?.slice(0, 20) + "..." });
                
                // Focus and type
                const focusScript = `document.querySelector('${step.selector.replace(/'/g, "\\'")}')?.focus()`;
                await sendCDP("Runtime.evaluate", { expression: focusScript });
                
                // Type text character by character
                for (const char of step.text || "") {
                  await sendCDP("Input.dispatchKeyEvent", { type: "char", text: char });
                }
                await new Promise(r => setTimeout(r, 500));
                
              } else if (step.action === "wait") {
                streamEvent(controller, { type: "think", content: `Waiting ${step.ms}ms...` });
                await new Promise(r => setTimeout(r, step.ms || 1000));
              }

              // Take screenshot after each action (if no liveURL)
              if (!liveURL) {
                try {
                  const screenshot = await sendCDP("Page.captureScreenshot", { format: "png", quality: 80 });
                  if (screenshot.data) {
                    streamEvent(controller, { type: "screenshot", image: screenshot.data });
                  }
                } catch (e) {
                  console.warn("Screenshot failed:", e);
                }
              }

            } catch (stepError) {
              console.error(`Step ${i + 1} error:`, stepError);
              streamEvent(controller, { type: "warning", message: `Step failed: ${step.reason || step.action}` });
            }
          }

          // Generate summary
          streamEvent(controller, { type: "think", content: "Generating task summary..." });
          
          const summaryPrompt = `Task completed: "${task}"
Steps taken:
${steps.map((s, i) => `${i + 1}. ${s.action}: ${s.reason || s.url || s.selector}`).join("\n")}

Write a brief 2-3 sentence summary.`;

          const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "user", content: summaryPrompt }],
            }),
          });

          let summary = "Task completed.";
          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            summary = summaryData.choices?.[0]?.message?.content || summary;
          }

          streamEvent(controller, { type: "complete", summary, liveUrl: liveURL });
          
          // Keep connection open for 30s for user interaction
          if (liveURL) {
            streamEvent(controller, { type: "think", content: "Browser session active. You can interact with the live view." });
            await new Promise(r => setTimeout(r, 30000));
          }

          ws?.close();
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

        } catch (error) {
          console.error("Browser agent error:", error);
          streamEvent(controller, { type: "error", message: error instanceof Error ? error.message : "An unexpected error occurred" });
          ws?.close();
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
