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

    const { employee_id, messages, pageContext } = await req.json();
    if (!employee_id) throw new Error("employee_id required");

    // Load employee
    const { data: employee, error: empError } = await supabase
      .from("ai_employees")
      .select("*")
      .eq("id", employee_id)
      .single();

    if (empError || !employee) throw new Error("Employee not found");

    // Increment action usage
    const { data: usageResult } = await supabase.rpc("increment_actions_used", { _user_id: user.id });
    if (usageResult && !usageResult.allowed) {
      return new Response(JSON.stringify({ error: usageResult.reason || "Action limit reached" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load linked business data for RAG context
    let businessContext = "";
    if (employee.linked_business_id) {
      const { data: bizData } = await supabase
        .from("user_business_data")
        .select("title, content, analyzed_content, data_type, source")
        .eq("id", employee.linked_business_id)
        .single();

      if (bizData) {
        businessContext = `\n\n## Linked Business Data\n- **Title:** ${bizData.title}\n- **Type:** ${bizData.data_type}\n- **Source:** ${bizData.source}`;
        if (bizData.content) businessContext += `\n\n### Content\n${bizData.content.slice(0, 5000)}`;
        if (bizData.analyzed_content) businessContext += `\n\n### Analysis\n${bizData.analyzed_content.slice(0, 3000)}`;
      }

      // Also load sibling data from same workspace
      if (employee.workspace_id) {
        const { data: wsData } = await supabase
          .from("user_business_data")
          .select("title, content, analyzed_content, data_type")
          .eq("workspace_id", employee.workspace_id)
          .neq("id", employee.linked_business_id)
          .limit(20);

        if (wsData && wsData.length > 0) {
          businessContext += "\n\n## Additional Workspace Data\n";
          for (const item of wsData) {
            businessContext += `\n### ${item.title} (${item.data_type})\n`;
            if (item.analyzed_content) businessContext += item.analyzed_content.slice(0, 1000) + "\n";
            else if (item.content) businessContext += item.content.slice(0, 1000) + "\n";
          }
        }
      }
    }

    // Build RAG system prompt from SOP fields
    const procedures = Array.isArray(employee.sop_procedure) ? employee.sop_procedure : [];
    const definitions = Array.isArray(employee.sop_definitions) ? employee.sop_definitions : [];
    const responsibilities = Array.isArray(employee.sop_responsibilities) ? employee.sop_responsibilities : [];

    const sopSection = `
## AI Employee Identity
- **Name:** ${employee.name}
- **Role:** ${employee.role}
${employee.sop_title ? `- **SOP Title:** ${employee.sop_title}` : ""}
${employee.sop_purpose ? `\n## Purpose\n${employee.sop_purpose}` : ""}
${employee.sop_scope ? `\n## Scope\n${employee.sop_scope}` : ""}
${definitions.length > 0 ? `\n## Definitions\n${definitions.map((d: any) => `- **${d.term}:** ${d.meaning}`).join("\n")}` : ""}
${responsibilities.length > 0 ? `\n## Responsibilities\n${responsibilities.map((r: any, i: number) => `${i + 1}. ${r}`).join("\n")}` : ""}
${procedures.length > 0 ? `\n## Standard Operating Procedure (Step-by-Step)\n${procedures.map((p: any, i: number) => `${i + 1}. ${p}`).join("\n")}` : ""}
${employee.sop_safety_notes ? `\n## Safety & Compliance Notes\n${employee.sop_safety_notes}` : ""}
${employee.sop_documentation ? `\n## Documentation Requirements\n${employee.sop_documentation}` : ""}
`;

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
`;
    }

    const systemPrompt = `You are an AI employee executing a Standard Operating Procedure (SOP) through a user's browser. You must follow the SOP steps precisely and use the business context to inform your actions.

${sopSection}
${businessContext}
${pageSection}

## Your Capabilities
You analyze the SOP steps and the current page, then return structured browser actions to execute each step.

## Response Format
Always respond with a JSON object wrapped in a markdown code block.

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
7. **respond** — Reply to the user (no browser action)
   \`{ "action": "respond", "message": "your reply", "reasoning": "why" }\`

### Multi-step tasks
For multi-step tasks, return an array of actions:
\`\`\`json
{
  "steps": [
    { "action": "navigate", "url": "https://...", "reasoning": "Go to the target page per SOP step 1" },
    { "action": "click", "selector": "#btn", "reasoning": "Click per SOP step 2" }
  ],
  "summary": "Brief description of what you're doing"
}
\`\`\`

## Guidelines
- Follow the SOP procedure steps in order
- Use business context data to fill forms, make decisions, and provide accurate information
- Use CSS selectors when possible, fall back to descriptive text
- If you cannot complete a step from the visible page, use "respond" to ask for clarification
- Always include "reasoning" that references the SOP step being executed
- If the task involves sensitive actions (delete, purchase, send), warn the user first with a "respond" action
- For login screens, payment forms, or 2FA prompts, use "respond" to ask the user to handle it manually`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
          ...(messages || []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorBody = await response.text().catch(() => "");
      console.error("AI gateway error:", status, errorBody.slice(0, 200));
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
      throw new Error("AI service unavailable");
    }

    // Log the run
    await supabase.from("ai_employee_logs").insert({
      employee_id,
      user_id: user.id,
      status: "running",
      step_label: "Started",
      message: `Running SOP: ${employee.sop_title || employee.role}`,
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e: any) {
    console.error("run-employee error:", e?.message);
    return new Response(JSON.stringify({ error: e?.message || "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
