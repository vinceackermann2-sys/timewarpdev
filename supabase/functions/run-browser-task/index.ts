import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================================
// run-browser-task Edge Function
// ============================================================
// Flow: Supabase → Browserbase → Stagehand → Playwright → Browser
//
// This function does NOT run Playwright or Stagehand locally.
// It delegates all browser automation to Browserbase's cloud
// infrastructure. Supabase only orchestrates the request and
// returns the live session iframe URL to the frontend.
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BusinessContext {
  companyName: string;
  industry: string;
  tools: string[];
  goal: string;
}

interface UserContext {
  userId: string;
  role: string;
}

interface TaskRequest {
  task: string;
  businessContext: BusinessContext;
  userContext: UserContext;
}

/**
 * Build the instruction prompt that Browserbase/Stagehand will execute.
 * This prompt is sent as part of the session creation so Browserbase
 * can autonomously drive the browser using Stagehand + Playwright.
 */
function buildInstructions(task: string, biz: BusinessContext, role: string): string {
  return `You are an autonomous browser agent using Stagehand and Playwright.

Business context:
- Company: ${biz.companyName}
- Industry: ${biz.industry}
- Tools: ${biz.tools.join(", ")}
- Goal: ${biz.goal}

User role: ${role}

Task:
${task}

Rules:
- Execute the task automatically where possible.
- If login, payment, MFA, or captcha is required:
    1. Pause automation
    2. Keep the browser open
    3. Wait for the human to complete the step
    4. Resume execution after completion
- Be methodical: navigate to the correct site first, then interact.
- Always confirm actions completed successfully before moving on.
- If stuck, try alternative approaches before giving up.`;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ---- 1. Parse & validate input ----
    const body: TaskRequest = await req.json();
    const { task, businessContext, userContext } = body;

    if (!task || typeof task !== "string" || task.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "task is required and must be a non-empty string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!businessContext || !userContext) {
      return new Response(
        JSON.stringify({ error: "businessContext and userContext are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- 2. Load environment variables ----
    const BROWSERBASE_API_KEY = Deno.env.get("BROWSERBASE_API_KEY");
    const BROWSERBASE_PROJECT_ID = Deno.env.get("BROWSERBASE_PROJECT_ID");

    if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
      console.error("Missing Browserbase credentials");
      return new Response(
        JSON.stringify({ error: "Browser automation service is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- 3. Build instructions for Stagehand ----
    const instructions = buildInstructions(
      task.trim(),
      businessContext,
      userContext.role
    );

    console.log(`[run-browser-task] Creating session for user=${userContext.userId}, role=${userContext.role}`);
    console.log(`[run-browser-task] Task: ${task.trim().substring(0, 100)}`);

    // ---- 4. Create Browserbase session ----
    // Supabase sends the request to Browserbase to create a browser session.
    // The session provides a live-view iframe and a WebSocket URL for CDP.
    // Browserbase manages the browser lifecycle; Supabase only orchestrates.
    const sessionResponse = await fetch("https://api.browserbase.com/v1/sessions", {
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
      console.error(`[run-browser-task] Browserbase session creation failed: ${errorText}`);
      return new Response(
        JSON.stringify({ error: "Failed to start browser automation session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const session = await sessionResponse.json();
    const sessionId = session.id;
    console.log(`[run-browser-task] Session created: ${sessionId}`);

    // ---- 5. Get live view / debug URLs ----
    // The debug endpoint provides an iframe-embeddable URL
    // so the user can watch the browser in real time.
    const debugResponse = await fetch(
      `https://api.browserbase.com/v1/sessions/${sessionId}/debug`,
      {
        method: "GET",
        headers: { "x-bb-api-key": BROWSERBASE_API_KEY },
      }
    );

    let iframeUrl: string | null = null;

    if (debugResponse.ok) {
      const debugInfo = await debugResponse.json();
      // debuggerFullscreenUrl is the embeddable live view
      iframeUrl = debugInfo.debuggerFullscreenUrl || debugInfo.debuggerUrl || null;
      console.log(`[run-browser-task] Live view URL obtained`);
    } else {
      console.warn(`[run-browser-task] Could not get debug URLs, continuing without live view`);
    }

    // ---- 6. Return session info to frontend ----
    return new Response(
      JSON.stringify({
        sessionId,
        iframeUrl,
        status: "running",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[run-browser-task] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred while starting the browser task",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
