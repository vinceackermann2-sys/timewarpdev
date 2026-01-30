import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Your self-hosted browser server
const BROWSER_WS_URL = "ws://46.225.19.131:3000";

function streamEvent(controller: ReadableStreamDefaultController, data: any) {
  const encoder = new TextEncoder();
  try {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  } catch (e) {
    console.warn("SSE enqueue failed (client likely disconnected)", e);
  }
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
        const eventWaiters: Map<string, Array<(payload: any) => void>> = new Map();

        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const escapeForSingleQuote = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

        // Helpers injected into the page context to support selectors
        const selectorHelpers = `
          (function() {
            function firstVisible(elements) {
              for (const el of elements) {
                if (!(el instanceof Element)) continue;
                const style = window.getComputedStyle(el);
                if (style.visibility === 'hidden' || style.display === 'none') continue;
                const r = el.getBoundingClientRect();
                if (r && r.width > 0 && r.height > 0) return el;
              }
              return null;
            }

            function byXPath(xpath) {
              try {
                const res = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                return res.singleNodeValue instanceof Element ? res.singleNodeValue : null;
              } catch {
                return null;
              }
            }

            function byText(text) {
              const t = (text || '').trim();
              if (!t) return null;
              const candidates = Array.from(document.querySelectorAll('button,a,[role="button"],input,textarea,select'));
              const hit = candidates.find((el) => (el.textContent || '').trim().includes(t) || (el.getAttribute('aria-label') || '').includes(t));
              if (hit) return hit;
              const all = Array.from(document.querySelectorAll('*'));
              return all.find((el) => (el.textContent || '').trim().includes(t)) || null;
            }

            function findElement(selector) {
              if (!selector || typeof selector !== 'string') return null;
              const sel = selector.trim();
              if (!sel) return null;

              if (sel.startsWith('xpath=')) return byXPath(sel.slice('xpath='.length));
              if (sel.startsWith('text=')) return byText(sel.slice('text='.length));

              const hasTextMatch = sel.match(/:has-text\\((['"])(.*?)\\1\\)/);
              if (hasTextMatch) {
                const text = hasTextMatch[2];
                const baseSel = sel.replace(hasTextMatch[0], '').trim() || '*';
                const candidates = Array.from(document.querySelectorAll(baseSel));
                const filtered = candidates.filter((el) => (el.textContent || '').includes(text) || (el.getAttribute('aria-label') || '').includes(text));
                return firstVisible(filtered) || firstVisible(candidates);
              }

              try {
                const el = document.querySelector(sel);
                return el instanceof Element ? el : null;
              } catch {
                return null;
              }
            }

            return { findElement };
          })()
        `;

        const findClickablePoint = async (selector: string, timeoutMs = 8000): Promise<{ x: number; y: number } | null> => {
          const deadline = Date.now() + timeoutMs;
          const safeSelector = escapeForSingleQuote(selector || "");
          while (Date.now() < deadline) {
            const pointScript = `
              (function() {
                const helpers = ${selectorHelpers};
                const el = helpers.findElement('${safeSelector}');
                if (!el) return null;
                el.scrollIntoView({ block: 'center', inline: 'center' });
                const r = el.getBoundingClientRect();
                if (!r || !r.width || !r.height) return null;
                return { x: Math.floor(r.left + r.width / 2), y: Math.floor(r.top + r.height / 2) };
              })()
            `;
            const pointResult = await sendCDP("Runtime.evaluate", { expression: pointScript, returnByValue: true });
            const point = pointResult?.result?.value as { x: number; y: number } | null;
            if (point) return point;
            await sleep(500);
          }
          return null;
        };

        const focusAndClear = async (selector: string, timeoutMs = 8000): Promise<boolean> => {
          const deadline = Date.now() + timeoutMs;
          const safeSelector = escapeForSingleQuote(selector || "");
          while (Date.now() < deadline) {
            const focusScript = `
              (function() {
                const helpers = ${selectorHelpers};
                const el = helpers.findElement('${safeSelector}');
                if (!el) return false;
                el.scrollIntoView({ block: 'center', inline: 'center' });
                try { el.focus(); } catch {}
                try {
                  if ('value' in el) { el.value = ''; }
                  if (el.isContentEditable) { el.textContent = ''; }
                } catch {}
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
              })()
            `;
            const focused = await sendCDP("Runtime.evaluate", { expression: focusScript, returnByValue: true });
            if (focused?.result?.value) return true;
            await sleep(500);
          }
          return false;
        };

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

        const waitForEvent = (method: string, timeoutMs = 120000): Promise<any> => {
          return new Promise((resolve, reject) => {
            const arr = eventWaiters.get(method) ?? [];
            arr.push(resolve);
            eventWaiters.set(method, arr);

            setTimeout(() => {
              const current = eventWaiters.get(method);
              if (!current) return;
              const next = current.filter((fn) => fn !== resolve);
              if (next.length) eventWaiters.set(method, next);
              else eventWaiters.delete(method);
              reject(new Error(`Timed out waiting for event: ${method}`));
            }, timeoutMs);
          });
        };

        try {
          streamEvent(controller, { 
            type: "status", 
            icon: "🚀", 
            title: "Starting Session",
            message: `${roleContext.emoji} ${roleContext.label} Agent initializing...` 
          });

          // Connect directly to self-hosted browser server
          console.log("Connecting to self-hosted browser server:", BROWSER_WS_URL);
          
          ws = new WebSocket(BROWSER_WS_URL);

          // Set up message handler
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
                return;
              }

              // CDP events (no id)
              if (data.method) {
                const waiters = eventWaiters.get(data.method);
                if (waiters && waiters.length) {
                  eventWaiters.delete(data.method);
                  for (const fn of waiters) fn(data.params);
                }
              }
            } catch { /* ignore parse errors */ }
          };

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("WebSocket connection timeout")), 20000);
            ws!.onopen = () => { 
              clearTimeout(timeout); 
              console.log("WebSocket connected to self-hosted browser");
              resolve(); 
            };
            ws!.onerror = (e) => { 
              clearTimeout(timeout); 
              console.error("WebSocket error:", e);
              reject(new Error("Could not connect to browser server")); 
            };
          });

          streamEvent(controller, { 
            type: "status", 
            icon: "🌐", 
            title: "Browser Connected",
            message: "Connected to self-hosted browser server" 
          });

          // Get available targets or create a new page
          const targets = await sendCDP("Target.getTargets");
          const existingPageTargetId: string | undefined = targets?.targetInfos?.find((t: any) => t?.type === "page")?.targetId;
          const pageTargetId: string = existingPageTargetId || (await sendCDP("Target.createTarget", { url: "about:blank" }))?.targetId;

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

          // Navigate to a test page first
          await sendCDP("Page.navigate", { url: "https://example.com" });
          await sleep(2500);

          // Take initial screenshot to confirm browser is working
          let screenshotBase64: string | null = null;
          try {
            const screenshot = await sendCDP("Page.captureScreenshot", { format: "jpeg", quality: 70 });
            screenshotBase64 = screenshot?.data || null;
            if (screenshotBase64) {
              console.log("Initial screenshot captured successfully");
              streamEvent(controller, { type: "screenshot", image: screenshotBase64 });
            }
          } catch (e) {
            console.warn("Initial screenshot failed:", e);
          }

          streamEvent(controller, { type: "session", id: sessionId, liveUrl: null });

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
1. Use ONLY standard CSS selectors (querySelector-compatible). Do NOT use Playwright-only selectors like :has-text(), text=, xpath=.
   Prefer [data-testid], [aria-label], input[name], button[type], and stable attributes.
2. Start with navigating to the relevant website
3. After form submissions, add a wait step (2000-3000ms)
4. If creating content (like ads), actually fill in creative content
5. Be very specific with selectors - use multiple attributes if needed

Return ONLY a valid JSON array, no other text:
[{"action": "navigate", "url": "https://...", "reason": "Go to website"}]`;

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
                  await sleep(4500);
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

                  const point = await findClickablePoint(step.selector);
                  if (!point) {
                    streamEvent(controller, {
                      type: "warning",
                      icon: "⚠️",
                      title: "Element Not Found",
                      message: `Could not find: ${step.selector}`,
                    });
                  } else {
                    await sendCDP("Input.dispatchMouseEvent", {
                      type: "mouseMoved",
                      x: point.x,
                      y: point.y,
                      button: "none",
                    });
                    await sendCDP("Input.dispatchMouseEvent", {
                      type: "mousePressed",
                      x: point.x,
                      y: point.y,
                      button: "left",
                      clickCount: 1,
                    });
                    await sendCDP("Input.dispatchMouseEvent", {
                      type: "mouseReleased",
                      x: point.x,
                      y: point.y,
                      button: "left",
                      clickCount: 1,
                    });
                  }

                  await sleep(1800);
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
                  
                  const focused = await focusAndClear(step.selector);
                  if (!focused) {
                    streamEvent(controller, {
                      type: "warning",
                      icon: "⚠️",
                      title: "Input Not Found",
                      message: `Could not focus: ${step.selector}`,
                    });
                  } else {
                    await sendCDP("Input.insertText", { text: step.text || "" });
                  }
                  await sleep(500);
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
                  await sleep(500);
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
                  await sleep(waitMs);
                  break;
                }
              }

              // Take screenshot after each action
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
              liveUrl: null 
            });
          } catch {
            streamEvent(controller, { 
              type: "complete", 
              icon: "✅",
              title: "Task Complete",
              summary: "Task execution finished.",
              liveUrl: null 
            });
          }

          // Keep connection open briefly for final screenshots
          await sleep(3000);

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

