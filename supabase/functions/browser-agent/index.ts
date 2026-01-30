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

function getRoleContext(role: string): { label: string; focus: string; emoji: string } {
  switch (role) {
    case "cmo":
      return { label: "CMO", focus: "Marketing, branding, campaigns, social media, email marketing, analytics", emoji: "📣" };
    case "cfo":
      return { label: "CFO", focus: "Finance, accounting, budgets, invoicing, expense tracking, financial reporting", emoji: "💵" };
    default:
      return { label: "CEO", focus: "Business operations, project management, team collaboration, strategic planning", emoji: "👑" };
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

    const roleContext = getRoleContext(role);

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let ws: WebSocket | null = null;
        let sessionId: string | null = null;
        let messageId = 1;
        const pendingMessages: Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }> = new Map();

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
            
            pendingMessages.set(id, { resolve, reject });
            ws.send(JSON.stringify(msg));

            // Timeout after 30s
            setTimeout(() => {
              if (pendingMessages.has(id)) {
                pendingMessages.delete(id);
                reject(new Error("CDP command timeout"));
              }
            }, 30000);
          });
        };

        try {
          streamEvent(controller, { 
            type: "status", 
            icon: "🚀", 
            title: "Starting Session",
            message: `${roleContext.emoji} ${roleContext.label} Agent initializing...` 
          });

          // Use the production Browserless endpoint
          const wsUrl = `wss://production-sfo.browserless.io/chromium?token=${BROWSERLESS_API_KEY}`;
          console.log("Connecting to Browserless...");
          
          ws = new WebSocket(wsUrl);

          // Set up message handler before waiting for connection
          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.id && pendingMessages.has(data.id)) {
                const { resolve, reject } = pendingMessages.get(data.id)!;
                pendingMessages.delete(data.id);
                if (data.error) {
                  reject(new Error(data.error.message));
                } else {
                  resolve(data.result);
                }
              }
            } catch { /* ignore parse errors */ }
          };

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Connection timeout - check your Browserless API key")), 20000);
            ws!.onopen = () => { 
              clearTimeout(timeout); 
              console.log("WebSocket connected");
              resolve(); 
            };
            ws!.onerror = (e) => { 
              clearTimeout(timeout); 
              console.error("WebSocket error:", e);
              reject(new Error("Could not connect to browser service")); 
            };
          });

          streamEvent(controller, { 
            type: "status", 
            icon: "🌐", 
            title: "Browser Connected",
            message: "Setting up interactive session..." 
          });

          // Get targets and attach to page
          const targets = await sendCDP("Target.getTargets");
          let pageTargetId: string | null = null;
          
          const pageTarget = targets.targetInfos?.find((t: any) => t.type === "page");
          if (!pageTarget) {
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
          console.log("Attached to session:", sessionId);

          // Enable page events
          await sendCDP("Page.enable");
          await sendCDP("Runtime.enable");
          await sendCDP("DOM.enable");

          // Set viewport
          await sendCDP("Emulation.setDeviceMetricsOverride", {
            width: 1280,
            height: 720,
            deviceScaleFactor: 1,
            mobile: false,
          });

          // Try to get live URL for interactive viewing (Enterprise feature)
          let liveURL: string | null = null;
          try {
            const liveResult = await sendCDP("Browserless.liveURL", { 
              quality: 70,
              type: "jpeg"
            });
            liveURL = liveResult.liveURL;
            console.log("Live URL obtained:", liveURL);
            streamEvent(controller, { type: "liveUrl", url: liveURL });
          } catch (e) {
            console.warn("liveURL not available (requires Enterprise plan):", e);
            streamEvent(controller, { 
              type: "status", 
              icon: "📸", 
              title: "Screenshot Mode",
              message: "Live view not available - using screenshots instead" 
            });
          }

          streamEvent(controller, { type: "session", id: sessionId, liveUrl: liveURL });

          // Generate plan with AI
          streamEvent(controller, { 
            type: "status", 
            icon: "🧠", 
            title: "Planning",
            message: `Analyzing task: "${task.slice(0, 50)}${task.length > 50 ? '...' : ''}"` 
          });

          const planPrompt = `You are an AI ${roleContext.label} assistant controlling a web browser to complete tasks autonomously.
Your expertise: ${roleContext.focus}

TASK TO COMPLETE: ${task}
TIME BUDGET: ${timeEstimate}

Create a detailed step-by-step plan. For each step, provide:
{
  "action": "navigate" | "click" | "type" | "wait" | "scroll",
  "url": "full URL for navigate action",
  "selector": "CSS selector for click/type actions (be very specific)",
  "text": "text to type for type action",
  "ms": milliseconds for wait action,
  "reason": "brief human-readable explanation of this step"
}

CRITICAL RULES:
1. If a site requires login and offers "Sign in with Google" - USE THAT OPTION. The user has a connected Google account.
2. Use specific CSS selectors: data-testid, aria-label, button text, or detailed paths
3. Start with navigating to the relevant website
4. After form submissions, add a wait step (2000-3000ms)
5. If creating content (like ads), actually fill in creative content

For Canva specifically:
- Navigate to canva.com
- Look for "Sign in with Google" or similar auth option
- Once signed in, create a new design
- Use their templates or create from scratch

Return ONLY a valid JSON array, no other text:
[{"action": "navigate", "url": "https://...", "reason": "Go to Canva homepage"}]`;

          const planResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "You are a browser automation expert. Return only valid JSON arrays. Be very specific with selectors." },
                { role: "user", content: planPrompt }
              ],
              temperature: 0.2,
            }),
          });

          if (!planResponse.ok) {
            const errorText = await planResponse.text();
            console.error("AI plan error:", errorText);
            throw new Error("Failed to generate task plan");
          }

          const planData = await planResponse.json();
          const planText = planData.choices?.[0]?.message?.content || "";
          console.log("AI plan response:", planText.slice(0, 500));
          
          let steps: any[] = [];
          try {
            const jsonMatch = planText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              steps = JSON.parse(jsonMatch[0]);
            }
          } catch (parseError) {
            console.error("Plan parse error:", parseError);
            streamEvent(controller, { 
              type: "error", 
              icon: "❌",
              title: "Plan Error",
              message: "Could not understand the task plan" 
            });
            ws?.close();
            controller.close();
            return;
          }

          streamEvent(controller, { 
            type: "status", 
            icon: "📋", 
            title: "Plan Ready",
            message: `${steps.length} steps to complete` 
          });

          // Execute each step
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const stepNum = `[${i + 1}/${steps.length}]`;
            
            streamEvent(controller, { 
              type: "step", 
              index: i + 1, 
              total: steps.length, 
              action: step.action,
              reason: step.reason
            });

            try {
              switch (step.action) {
                case "navigate": {
                  streamEvent(controller, { 
                    type: "action", 
                    icon: "🌐", 
                    title: `${stepNum} Navigating`,
                    message: step.reason || `Opening ${new URL(step.url).hostname}`,
                    details: step.url
                  });
                  
                  await sendCDP("Page.navigate", { url: step.url });
                  // Wait for page to load
                  await new Promise(r => setTimeout(r, 4000));
                  break;
                }

                case "click": {
                  streamEvent(controller, { 
                    type: "action", 
                    icon: "👆", 
                    title: `${stepNum} Clicking`,
                    message: step.reason || `Clicking element`,
                    details: step.selector
                  });
                  
                  // Try multiple click strategies
                  const clickScript = `
                    (function() {
                      // Try direct selector
                      let el = document.querySelector('${step.selector.replace(/'/g, "\\'")}');
                      
                      // If not found, try finding by text content
                      if (!el) {
                        const buttons = [...document.querySelectorAll('button, a, [role="button"]')];
                        const textMatch = buttons.find(b => 
                          b.textContent?.toLowerCase().includes('${(step.reason || '').toLowerCase().replace(/'/g, "\\'")}')
                        );
                        if (textMatch) el = textMatch;
                      }
                      
                      if (el) {
                        el.scrollIntoView({ block: 'center' });
                        el.click();
                        return { success: true, found: el.tagName };
                      }
                      return { success: false };
                    })()
                  `;
                  
                  const clickResult = await sendCDP("Runtime.evaluate", { 
                    expression: clickScript, 
                    returnByValue: true 
                  });
                  
                  if (!clickResult.result?.value?.success) {
                    streamEvent(controller, { 
                      type: "warning", 
                      icon: "⚠️", 
                      title: "Element Not Found",
                      message: `Could not find: ${step.selector}`
                    });
                  }
                  await new Promise(r => setTimeout(r, 1500));
                  break;
                }

                case "type": {
                  streamEvent(controller, { 
                    type: "action", 
                    icon: "⌨️", 
                    title: `${stepNum} Typing`,
                    message: step.reason || "Entering text",
                    details: step.text?.slice(0, 30) + (step.text?.length > 30 ? '...' : '')
                  });
                  
                  // Focus the element first
                  const focusScript = `
                    (function() {
                      const el = document.querySelector('${step.selector.replace(/'/g, "\\'")}');
                      if (el) {
                        el.focus();
                        el.value = '';
                        return true;
                      }
                      return false;
                    })()
                  `;
                  await sendCDP("Runtime.evaluate", { expression: focusScript });
                  
                  // Type text
                  await sendCDP("Input.insertText", { text: step.text || "" });
                  await new Promise(r => setTimeout(r, 500));
                  break;
                }

                case "scroll": {
                  streamEvent(controller, { 
                    type: "action", 
                    icon: "📜", 
                    title: `${stepNum} Scrolling`,
                    message: step.reason || "Scrolling page"
                  });
                  
                  await sendCDP("Runtime.evaluate", { 
                    expression: "window.scrollBy(0, 400)" 
                  });
                  await new Promise(r => setTimeout(r, 500));
                  break;
                }

                case "wait": {
                  const waitMs = step.ms || 2000;
                  streamEvent(controller, { 
                    type: "action", 
                    icon: "⏳", 
                    title: `${stepNum} Waiting`,
                    message: step.reason || `Pausing for ${waitMs}ms`
                  });
                  await new Promise(r => setTimeout(r, waitMs));
                  break;
                }
              }

              // Take screenshot after each action if no live URL
              if (!liveURL) {
                try {
                  const screenshot = await sendCDP("Page.captureScreenshot", { 
                    format: "jpeg", 
                    quality: 70 
                  });
                  if (screenshot.data) {
                    streamEvent(controller, { type: "screenshot", image: screenshot.data });
                  }
                } catch (e) {
                  console.warn("Screenshot failed:", e);
                }
              }

            } catch (stepError) {
              console.error(`Step ${i + 1} error:`, stepError);
              streamEvent(controller, { 
                type: "warning", 
                icon: "⚠️", 
                title: "Step Issue",
                message: `${step.reason || step.action}: ${stepError instanceof Error ? stepError.message : 'Failed'}`
              });
            }
          }

          // Final screenshot
          try {
            const finalScreenshot = await sendCDP("Page.captureScreenshot", { 
              format: "jpeg", 
              quality: 85 
            });
            if (finalScreenshot.data) {
              streamEvent(controller, { type: "screenshot", image: finalScreenshot.data });
            }
          } catch (e) {
            console.warn("Final screenshot failed:", e);
          }

          // Generate summary
          streamEvent(controller, { 
            type: "status", 
            icon: "📝", 
            title: "Summarizing",
            message: "Generating task summary..." 
          });
          
          const summaryPrompt = `Task: "${task}"
Steps completed:
${steps.map((s, i) => `${i + 1}. ${s.action}: ${s.reason || s.url || s.selector}`).join("\n")}

Write a brief 2-3 sentence summary of what was accomplished. Be specific about any content created or actions taken.`;

          try {
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

            streamEvent(controller, { 
              type: "complete", 
              icon: "✅",
              title: "Task Complete",
              summary,
              liveUrl: liveURL 
            });
          } catch {
            streamEvent(controller, { 
              type: "complete", 
              icon: "✅",
              title: "Task Complete",
              summary: "Task execution finished.",
              liveUrl: liveURL 
            });
          }

          // Keep connection open briefly for final screenshots
          await new Promise(r => setTimeout(r, 5000));

          ws?.close();
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

        } catch (error) {
          console.error("Browser agent error:", error);
          streamEvent(controller, { 
            type: "error", 
            icon: "❌",
            title: "Error",
            message: error instanceof Error ? error.message : "An unexpected error occurred" 
          });
          ws?.close();
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
