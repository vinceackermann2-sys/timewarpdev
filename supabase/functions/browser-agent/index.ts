import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Check and increment action usage
    const { data: actionResult } = await supabase.rpc("increment_actions_used", { _user_id: user.id });
    const actionCheck = actionResult as any;
    if (actionCheck && !actionCheck.allowed) {
      return new Response(JSON.stringify({ error: actionCheck.reason || "Action limit reached. Upgrade your plan." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, pageContext } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build page context section
    let pageSection = "";
    if (pageContext) {
      pageSection = `
## Current Browser Page Context
- **URL:** ${pageContext.url || "unknown"}
- **Title:** ${pageContext.title || "unknown"}
${pageContext.selectedText ? `- **Selected Text:** "${pageContext.selectedText}"` : ""}
${pageContext.pageContent ? `\n### Page Content (extracted)\n${pageContext.pageContent.slice(0, 15000)}` : ""}
${pageContext.formFields ? `\n### Visible Form Fields\n${JSON.stringify(pageContext.formFields, null, 2)}` : ""}
${pageContext.links ? `\n### Key Links\n${JSON.stringify(pageContext.links.slice(0, 30), null, 2)}` : ""}
${pageContext.metadata ? `\n### Page Metadata\n${JSON.stringify(pageContext.metadata, null, 2)}` : ""}
`;
    }

    const systemPrompt = `You are a browser automation AI assistant embedded in a Chrome extension. You can SEE the user's current page and perform actions on it.

${pageSection}

## Your Capabilities
You analyze the user's request and the current page, then return a structured action plan the extension will execute.

## Response Format
Always respond with a JSON object wrapped in a markdown code block. The extension parses this to execute actions.

### Action Types:
1. **click** — Click an element
   \`{ "action": "click", "selector": "CSS selector or description", "reasoning": "why" }\`

2. **type** — Type text into a field  
   \`{ "action": "type", "selector": "CSS selector or description", "value": "text to type", "reasoning": "why" }\`

3. **navigate** — Go to a URL  
   \`{ "action": "navigate", "url": "https://...", "reasoning": "why" }\`

4. **scroll** — Scroll the page  
   \`{ "action": "scroll", "direction": "up|down", "amount": 500, "reasoning": "why" }\`

5. **extract** — Extract data from the page  
   \`{ "action": "extract", "selector": "CSS selector or description", "dataLabel": "what this data is", "reasoning": "why" }\`

6. **wait** — Wait before next action  
   \`{ "action": "wait", "duration": 1000, "reasoning": "why" }\`

7. **select** — Select a dropdown option  
   \`{ "action": "select", "selector": "CSS selector", "value": "option value", "reasoning": "why" }\`

8. **copy** — Copy text to clipboard  
   \`{ "action": "copy", "text": "text to copy", "reasoning": "why" }\`

9. **respond** — Just reply to the user (no browser action needed)  
   \`{ "action": "respond", "message": "your reply", "reasoning": "why" }\`

### Multi-step tasks
For multi-step tasks, return an array of actions:
\`\`\`json
{
  "steps": [
    { "action": "click", "selector": "#login-btn", "reasoning": "Open login form" },
    { "action": "wait", "duration": 500, "reasoning": "Wait for form to appear" },
    { "action": "type", "selector": "#email", "value": "user@example.com", "reasoning": "Enter email" }
  ],
  "summary": "Brief description of what you're doing"
}
\`\`\`

## Guidelines
- Use CSS selectors when possible, fall back to descriptive text (e.g. "the blue Submit button")
- For complex pages, break tasks into small sequential steps
- If you cannot determine how to complete a task from the visible page, use "respond" to ask the user for clarification
- Always include "reasoning" so the user understands each step
- If the task involves sensitive actions (delete, purchase, send), warn the user first with a "respond" action before proceeding
- When extracting data, be specific about what you're pulling and format it cleanly
- You can reference the page content, form fields, and links provided above to make accurate selectors`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error: status", status);
      throw new Error("AI service unavailable");
    }

    // Save chat to timewarp_chats
    const userMsg = messages?.[messages.length - 1]?.content || "";
    supabase.from("timewarp_chats").insert({
      user_id: user.id,
      user_message: userMsg,
      page_url: pageContext?.url || null,
    }).then(() => {});

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("browser-agent error occurred");
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
