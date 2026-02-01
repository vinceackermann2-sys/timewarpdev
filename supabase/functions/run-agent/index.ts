import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CDPMessage {
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface AXNode {
  nodeId: string;
  role: { value: string };
  name?: { value: string };
  description?: { value: string };
  value?: { value: string };
  properties?: Array<{ name: string; value: { value: unknown } }>;
  childIds?: string[];
  backendDOMNodeId?: number;
}

// Send CDP command and wait for response
async function sendCDP(ws: WebSocket, method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const id = Math.floor(Math.random() * 1000000);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`CDP timeout for ${method}`));
    }, 10000);

    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          clearTimeout(timeout);
          ws.removeEventListener('message', handler);
          if (data.error) {
            reject(new Error(data.error.message));
          } else {
            resolve(data.result);
          }
        }
      } catch (e) {
        // Ignore parse errors for other messages
      }
    };

    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

// Format accessibility tree for AI consumption
function formatAXTree(nodes: AXNode[]): string {
  const nodeMap = new Map<string, AXNode>();
  nodes.forEach(node => nodeMap.set(node.nodeId, node));

  const formatNode = (nodeId: string, depth: number = 0): string => {
    const node = nodeMap.get(nodeId);
    if (!node) return '';

    const indent = '  '.repeat(depth);
    const role = node.role?.value || 'unknown';
    const name = node.name?.value || '';
    const value = node.value?.value || '';

    // Skip generic/ignored nodes without meaningful content
    if (['generic', 'none', 'IgnoredRole'].includes(role) && !name) {
      // But still process children
      const childLines = (node.childIds || [])
        .map(childId => formatNode(childId, depth))
        .filter(Boolean)
        .join('\n');
      return childLines;
    }

    let line = `${indent}[${node.backendDOMNodeId || nodeId}] ${role}`;
    if (name) line += `: "${name}"`;
    if (value) line += ` (value: "${value}")`;

    const childLines = (node.childIds || [])
      .map(childId => formatNode(childId, depth + 1))
      .filter(Boolean)
      .join('\n');

    return childLines ? `${line}\n${childLines}` : line;
  };

  // Find root node (usually first one)
  const rootNode = nodes.find(n => !nodes.some(other => other.childIds?.includes(n.nodeId)));
  if (!rootNode) return 'No accessibility tree available';

  return formatNode(rootNode.nodeId);
}

// Get element center coordinates by backend node ID
async function getElementCenter(ws: WebSocket, backendNodeId: number): Promise<{ x: number; y: number } | null> {
  try {
    const boxModel = await sendCDP(ws, 'DOM.getBoxModel', { backendNodeId }) as { model: { content: number[] } };
    if (boxModel?.model?.content) {
      const [x1, y1, x2, y2, x3, y3, x4, y4] = boxModel.model.content;
      return {
        x: (x1 + x2 + x3 + x4) / 4,
        y: (y1 + y2 + y3 + y4) / 4
      };
    }
  } catch (e) {
    console.error('Failed to get element box:', e);
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { task, role, sessionId: existingSessionId, action, connectUrl, stepNumber = 0 } = await req.json();
    
    const BROWSERBASE_API_KEY = Deno.env.get("BROWSERBASE_API_KEY");
    const BROWSERBASE_PROJECT_ID = Deno.env.get("BROWSERBASE_PROJECT_ID");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
      throw new Error("Browserbase credentials not configured");
    }

    // ACTION: Create a new session and return live view URL
    if (action === 'create') {
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
      console.log("Live view URL ready, WebSocket URL:", debugInfo.wsUrl);
      
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

    // ACTION: Execute a single step using CDP
    if (action === 'execute') {
      if (!existingSessionId || !connectUrl) {
        throw new Error("sessionId and connectUrl required for execute action");
      }
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY not configured");
      }

      console.log(`Executing step ${stepNumber} on session: ${existingSessionId}`);
      console.log(`Task: ${task}`);

      // Connect to CDP WebSocket
      const ws = new WebSocket(connectUrl);
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("WebSocket connection timeout")), 10000);
        ws.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };
        ws.onerror = (e) => {
          clearTimeout(timeout);
          reject(new Error("WebSocket connection failed"));
        };
      });

      console.log("CDP WebSocket connected");

      try {
        // First, get available targets (browser-level command)
        const targetsResult = await sendCDP(ws, 'Target.getTargets') as { targetInfos: Array<{ targetId: string; type: string; url: string }> };
        console.log("Available targets:", targetsResult?.targetInfos?.length);

        // Find a page target
        const pageTarget = targetsResult?.targetInfos?.find(t => t.type === 'page');
        if (!pageTarget) {
          throw new Error("No page target found in browser");
        }
        console.log("Found page target:", pageTarget.targetId, "URL:", pageTarget.url);

        // Attach to the page target to get a session
        const attachResult = await sendCDP(ws, 'Target.attachToTarget', { 
          targetId: pageTarget.targetId,
          flatten: true 
        }) as { sessionId: string };
        const cdpSessionId = attachResult?.sessionId;
        console.log("Attached to target, session:", cdpSessionId);

        // Helper to send commands to the page session
        const sendPageCDP = async (method: string, params: Record<string, unknown> = {}): Promise<unknown> => {
          const id = Math.floor(Math.random() * 1000000);
          
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`CDP timeout for ${method}`));
            }, 10000);

            const handler = (event: MessageEvent) => {
              try {
                const data = JSON.parse(event.data);
                if (data.id === id) {
                  clearTimeout(timeout);
                  ws.removeEventListener('message', handler);
                  if (data.error) {
                    reject(new Error(data.error.message));
                  } else {
                    resolve(data.result);
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            };

            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ 
              id, 
              method, 
              params,
              sessionId: cdpSessionId 
            }));
          });
        };

        // Enable required CDP domains on the page session
        await sendPageCDP('Page.enable');
        await sendPageCDP('DOM.enable');
        await sendPageCDP('Accessibility.enable');
        await sendPageCDP('Runtime.enable');
        console.log("CDP domains enabled");

        // Get current URL
        const currentUrl = pageTarget.url || 'about:blank';
        console.log("Current URL:", currentUrl);

        // Get accessibility tree
        const axTree = await sendPageCDP('Accessibility.getFullAXTree') as { nodes: AXNode[] };
        const formattedTree = formatAXTree(axTree?.nodes || []);
        console.log("Accessibility tree extracted, length:", formattedTree.length);

        // Ask AI what to do next
        const systemPrompt = `You are a browser automation agent. You control a web browser to complete tasks.

Current URL: ${currentUrl}
Step number: ${stepNumber}
Task: ${task}

Below is the accessibility tree of the current page. Each element has an ID in brackets [ID] that you can use to interact with it.

ACCESSIBILITY TREE:
${formattedTree.substring(0, 15000)}

Based on the current page state and task, decide the next action. Return a JSON object with:
- "action": one of "navigate", "click", "type", "scroll", "wait", "login_required", "complete", "error"
- "target": the element ID [number] to interact with (for click/type)
- "value": the URL (for navigate) or text (for type)
- "reasoning": brief explanation of why this action
- "instructions": (only for login_required) step-by-step instructions for the user to complete login

CRITICAL - LOGIN DETECTION:
If you detect a login page, signup page, authentication wall, CAPTCHA, 2FA prompt, or any page that requires user credentials:
- Use action "login_required"
- In "reasoning", explain what login is needed (e.g., "This page requires logging into Canva")
- In "instructions", provide clear step-by-step instructions for the user, like:
  1. Click "Sign in with Google" or enter your email/password
  2. Complete any 2FA if prompted
  3. Click "Continue" in the agent panel when done

Signs of login/auth pages:
- Forms with email/password fields
- "Sign in", "Log in", "Sign up", "Create account" buttons
- OAuth buttons like "Sign in with Google/Apple/Facebook"
- CAPTCHAs or "I'm not a robot" checkboxes
- 2FA/verification code inputs
- "Access denied" or "Please log in to continue" messages

If the task appears complete, use action "complete" with a summary in "reasoning".
If stuck or unable to proceed, use action "error" with explanation.

IMPORTANT: 
- ALWAYS detect login pages and use "login_required" - never try to automate login forms
- For Google searches, navigate to google.com first, then click the search box and type
- Always click input fields before typing
- Return ONLY valid JSON, no markdown.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `What is the next action to complete this task: "${task}"?` }
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          throw new Error(`AI request failed: ${errText}`);
        }

        const aiResult = await aiResponse.json();
        const content = aiResult.choices?.[0]?.message?.content || '';
        console.log("AI response:", content);

        // Parse AI response
        let agentAction;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          agentAction = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch (e) {
          agentAction = { action: 'error', reasoning: 'Failed to parse AI response' };
        }

        if (!agentAction) {
          throw new Error("No valid action from AI");
        }

        console.log("Agent action:", agentAction);

        // Execute the action
        let actionResult = { success: true, message: '' };

        // Helper to get element center coordinates
        const getElementCenterFromPage = async (backendNodeId: number): Promise<{ x: number; y: number } | null> => {
          try {
            const boxModel = await sendPageCDP('DOM.getBoxModel', { backendNodeId }) as { model: { content: number[] } };
            if (boxModel?.model?.content) {
              const [x1, y1, x2, y2, x3, y3, x4, y4] = boxModel.model.content;
              return {
                x: (x1 + x2 + x3 + x4) / 4,
                y: (y1 + y2 + y3 + y4) / 4
              };
            }
          } catch (e) {
            console.error('Failed to get element box:', e);
          }
          return null;
        };

        switch (agentAction.action) {
          case 'navigate':
            if (agentAction.value) {
              await sendPageCDP('Page.navigate', { url: agentAction.value });
              // Wait for page load
              await new Promise(resolve => setTimeout(resolve, 2000));
              actionResult.message = `Navigated to ${agentAction.value}`;
            }
            break;

          case 'click':
            if (agentAction.target) {
              const backendNodeId = parseInt(agentAction.target);
              const coords = await getElementCenterFromPage(backendNodeId);
              if (coords) {
                await sendPageCDP('Input.dispatchMouseEvent', {
                  type: 'mousePressed',
                  x: coords.x,
                  y: coords.y,
                  button: 'left',
                  clickCount: 1
                });
                await sendPageCDP('Input.dispatchMouseEvent', {
                  type: 'mouseReleased',
                  x: coords.x,
                  y: coords.y,
                  button: 'left',
                  clickCount: 1
                });
                actionResult.message = `Clicked element ${agentAction.target}`;
              } else {
                // Try focus instead
                await sendPageCDP('DOM.focus', { backendNodeId });
                actionResult.message = `Focused element ${agentAction.target}`;
              }
            }
            break;

          case 'type':
            if (agentAction.value) {
              await sendPageCDP('Input.insertText', { text: agentAction.value });
              actionResult.message = `Typed: "${agentAction.value}"`;
            }
            break;

          case 'scroll':
            await sendPageCDP('Runtime.evaluate', {
              expression: 'window.scrollBy(0, 500)'
            });
            actionResult.message = 'Scrolled down';
            break;

          case 'wait':
            await new Promise(resolve => setTimeout(resolve, 1000));
            actionResult.message = 'Waited 1 second';
            break;

          case 'login_required':
            actionResult.message = agentAction.reasoning || 'Login required';
            break;

          case 'complete':
            actionResult.message = agentAction.reasoning || 'Task completed';
            break;

          case 'error':
            actionResult.success = false;
            actionResult.message = agentAction.reasoning || 'Unknown error';
            break;

          default:
            actionResult.message = `Unknown action: ${agentAction.action}`;
        }

        ws.close();

        return new Response(
          JSON.stringify({
            success: true,
            step: stepNumber,
            action: agentAction,
            result: actionResult,
            isComplete: agentAction.action === 'complete' || agentAction.action === 'error',
            loginRequired: agentAction.action === 'login_required',
            loginInstructions: agentAction.instructions || null,
            currentUrl
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (cdpError) {
        ws.close();
        throw cdpError;
      }
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
