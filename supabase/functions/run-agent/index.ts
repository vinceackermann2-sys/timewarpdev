import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const STAGEHAND_API_URL = 'https://api.stagehand.browserbase.com/v1';

// Helper to make Stagehand Cloud API calls
async function stagehandRequest(
  endpoint: string, 
  apiKey: string, 
  projectId: string, 
  body: Record<string, unknown>
): Promise<Response> {
  const response = await fetch(`${STAGEHAND_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Browserbase-API-Key': apiKey,
      'X-Browserbase-Project-Id': projectId,
    },
    body: JSON.stringify(body),
  });
  return response;
}

// Process SSE stream and extract final result
async function processSSEStream(response: Response): Promise<{
  logs: Array<{ type: string; message: string; timestamp: Date }>;
  result: any;
  elements?: any[];
  success: boolean;
}> {
  const logs: Array<{ type: string; message: string; timestamp: Date }> = [];
  let result: any = null;
  let elements: any[] | undefined = undefined;
  let success = false;

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);
          
          if (event.type === 'log') {
            logs.push({
              type: 'log',
              message: event.message || event.data,
              timestamp: new Date()
            });
            console.log('[Stagehand Log]', event.message || event.data);
          } else if (event.type === 'success') {
            success = event.success === true;
          } else if (event.type === 'result_json' || event.type === 'data_json') {
            result = event.data || event;
          } else if (event.type === 'elements_json') {
            elements = event.elements || event.data;
          }
        } catch (e) {
          // Ignore parse errors for malformed events
        }
      }
    }
  }

  return { logs, result, elements, success };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { task, role, sessionId: existingSessionId, action, stepNumber = 0 } = await req.json();
    
    const BROWSERBASE_API_KEY = Deno.env.get("BROWSERBASE_API_KEY");
    const BROWSERBASE_PROJECT_ID = Deno.env.get("BROWSERBASE_PROJECT_ID");
    
    if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
      throw new Error("Browserbase credentials not configured");
    }

    // ACTION: Create a new Stagehand session
    if (action === 'create') {
      console.log(`Creating Stagehand Cloud session for task: ${task}, role: ${role}`);

      // Create session via Stagehand Cloud API
      const startResponse = await stagehandRequest(
        '/sessions/start',
        BROWSERBASE_API_KEY,
        BROWSERBASE_PROJECT_ID,
        {
          model_name: 'google/gemini-2.0-flash'
        }
      );

      if (!startResponse.ok) {
        const errorText = await startResponse.text();
        throw new Error(`Failed to create Stagehand session: ${errorText}`);
      }

      const sessionData = await startResponse.json();
      const stagehandSessionId = sessionData.session_id || sessionData.id;
      console.log("Stagehand session created:", stagehandSessionId);

      // Get the debug URLs for live view from Browserbase
      const debugResponse = await fetch(`https://www.browserbase.com/v1/sessions/${stagehandSessionId}/debug`, {
        method: "GET",
        headers: { "x-bb-api-key": BROWSERBASE_API_KEY },
      });

      let liveViewUrl = null;
      if (debugResponse.ok) {
        const debugInfo = await debugResponse.json();
        liveViewUrl = debugInfo.debuggerFullscreenUrl;
        console.log("Live view URL ready");
      }
      
      return new Response(
        JSON.stringify({ 
          sessionId: stagehandSessionId,
          liveViewUrl,
          task,
          role
        }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: Execute a single step using Stagehand Cloud
    if (action === 'execute') {
      if (!existingSessionId) {
        throw new Error("sessionId required for execute action");
      }

      console.log(`Executing step ${stepNumber} on Stagehand session: ${existingSessionId}`);
      console.log(`Task: ${task}`);

      // First, observe the current page state
      console.log("Observing page state...");
      const observeResponse = await stagehandRequest(
        `/sessions/${existingSessionId}/observe`,
        BROWSERBASE_API_KEY,
        BROWSERBASE_PROJECT_ID,
        {
          instruction: "What interactive elements are visible on this page? Look for login forms, buttons, inputs, and navigation elements."
        }
      );

      let pageElements: any[] = [];
      let currentState = '';
      
      if (observeResponse.ok) {
        const observeResult = await processSSEStream(observeResponse);
        pageElements = observeResult.elements || [];
        console.log("Observed elements:", pageElements.length);
        
        // Build state description from elements
        currentState = pageElements.map((el: any) => 
          `- ${el.description || el.selector || el.text || 'Element'}`
        ).join('\n');
      }

      // Detect login/auth pages from observed elements
      const authKeywords = ['login', 'sign in', 'log in', 'signin', 'signup', 'sign up', 
                           'create account', 'password', 'email', 'username', 
                           'oauth', 'google', 'apple', 'facebook', 'captcha'];
      
      const hasAuthElements = pageElements.some((el: any) => {
        const text = (el.description || el.selector || el.text || '').toLowerCase();
        return authKeywords.some(kw => text.includes(kw));
      });

      if (hasAuthElements && stepNumber > 0) {
        console.log("Login/auth page detected!");
        return new Response(
          JSON.stringify({
            success: true,
            step: stepNumber,
            action: { action: 'login_required', reasoning: 'Authentication page detected. Please log in manually.' },
            result: { success: true, message: 'Login required - manual intervention needed' },
            isComplete: false,
            loginRequired: true,
            loginInstructions: 'Please complete the login in the browser view. Click "Continue After Login" when done.',
            logs: [{ type: 'log', message: 'Login page detected', timestamp: new Date() }]
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Execute the next action using Stagehand act()
      const actionInstruction = stepNumber === 0 
        ? `Navigate to complete this task: ${task}. Start by going to the appropriate website.`
        : `Continue working on this task: ${task}. Current page elements: ${currentState.substring(0, 2000)}. Decide and perform the next logical action.`;

      console.log("Executing act with instruction:", actionInstruction.substring(0, 200));

      const actResponse = await stagehandRequest(
        `/sessions/${existingSessionId}/act`,
        BROWSERBASE_API_KEY,
        BROWSERBASE_PROJECT_ID,
        {
          input: actionInstruction,
          model_name: 'google/gemini-2.0-flash'
        }
      );

      if (!actResponse.ok) {
        const errorText = await actResponse.text();
        console.error("Act failed:", errorText);
        throw new Error(`Stagehand act failed: ${errorText}`);
      }

      const actResult = await processSSEStream(actResponse);
      console.log("Act completed, success:", actResult.success);
      console.log("Act logs:", actResult.logs.length);

      // Determine if task is complete based on act result
      const isTaskComplete = actResult.result?.completed === true || 
                            actResult.logs.some(l => l.message?.toLowerCase().includes('task complete'));

      return new Response(
        JSON.stringify({
          success: actResult.success,
          step: stepNumber,
          action: {
            action: isTaskComplete ? 'complete' : 'act',
            reasoning: actResult.logs.map(l => l.message).join('. ') || 'Action executed'
          },
          result: {
            success: actResult.success,
            message: actResult.logs.slice(-1)[0]?.message || 'Action completed'
          },
          isComplete: isTaskComplete,
          loginRequired: false,
          logs: actResult.logs
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: Execute full task autonomously using Stagehand agent
    if (action === 'execute-agent') {
      if (!existingSessionId) {
        throw new Error("sessionId required for execute-agent action");
      }

      console.log(`Executing full agent task on session: ${existingSessionId}`);
      console.log(`Task: ${task}`);

      const executeResponse = await stagehandRequest(
        `/sessions/${existingSessionId}/execute`,
        BROWSERBASE_API_KEY,
        BROWSERBASE_PROJECT_ID,
        {
          instruction: task,
          model_name: 'google/gemini-2.0-flash',
          agent_config: {
            max_steps: 30,
            auto_screenshot: true
          }
        }
      );

      if (!executeResponse.ok) {
        const errorText = await executeResponse.text();
        throw new Error(`Stagehand execute failed: ${errorText}`);
      }

      const executeResult = await processSSEStream(executeResponse);
      console.log("Agent execution completed");

      return new Response(
        JSON.stringify({
          success: executeResult.success,
          result: executeResult.result,
          logs: executeResult.logs,
          isComplete: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: Navigate to a URL
    if (action === 'navigate') {
      if (!existingSessionId) {
        throw new Error("sessionId required for navigate action");
      }

      const { url } = await req.json();
      console.log(`Navigating session ${existingSessionId} to: ${url}`);

      const navResponse = await stagehandRequest(
        `/sessions/${existingSessionId}/navigate`,
        BROWSERBASE_API_KEY,
        BROWSERBASE_PROJECT_ID,
        { url }
      );

      if (!navResponse.ok) {
        const errorText = await navResponse.text();
        throw new Error(`Navigation failed: ${errorText}`);
      }

      const navResult = await navResponse.json();
      
      return new Response(
        JSON.stringify({
          success: true,
          result: navResult
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: End session
    if (action === 'end') {
      if (!existingSessionId) {
        throw new Error("sessionId required for end action");
      }

      console.log(`Ending Stagehand session: ${existingSessionId}`);

      const endResponse = await stagehandRequest(
        `/sessions/${existingSessionId}/end`,
        BROWSERBASE_API_KEY,
        BROWSERBASE_PROJECT_ID,
        {}
      );

      return new Response(
        JSON.stringify({ success: endResponse.ok }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action specified. Valid actions: create, execute, execute-agent, navigate, end");

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
