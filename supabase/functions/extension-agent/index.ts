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
    const result = actionResult as any;
    if (result && !result.allowed) {
      return new Response(JSON.stringify({ error: result.reason || "Action limit reached. Upgrade your plan." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, pageContext, brandId, workspaceId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Load business DNA context
    const businessContext = await loadBusinessDNA(supabase, user.id, brandId, workspaceId);

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

    const hasBrowserContext = !!pageContext;

    const systemPrompt = hasBrowserContext
      ? buildBrowserPrompt(pageSection, businessContext)
      : buildChatPrompt(businessContext);

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
      const errorBody = await response.text().catch(() => "");
      console.error("AI gateway error: status", status, "body:", errorBody.slice(0, 200));
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
    console.error("extension-agent error occurred");
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function loadBusinessDNA(supabase: any, userId: string, brandId?: string, workspaceId?: string): Promise<string> {
  if (!brandId && !workspaceId) return "";

  let context = "";

  // Load the specific brand
  if (brandId) {
    const { data: brandRow } = await supabase
      .from("user_business_data")
      .select("title, content, analyzed_content, data_type")
      .eq("id", brandId)
      .single();

    if (brandRow) {
      context += `\n## Your Business: ${brandRow.title}\n`;
      if (brandRow.content) {
        try {
          const parsed = JSON.parse(brandRow.content);
          // Extract key brand info
          if (parsed.name) context += `- **Brand Name:** ${parsed.name}\n`;
          if (parsed.category) context += `- **Category:** ${parsed.category}\n`;
          if (parsed.colors) context += `- **Brand Colors:** ${JSON.stringify(parsed.colors)}\n`;
          if (parsed.typography) context += `- **Typography:** ${JSON.stringify(parsed.typography)}\n`;
          if (parsed.agentName) context += `- **Agent Name:** ${parsed.agentName}\n`;
        } catch {
          context += brandRow.content.slice(0, 3000) + "\n";
        }
      }
      if (brandRow.analyzed_content) context += `\n### Brand Analysis\n${brandRow.analyzed_content.slice(0, 3000)}\n`;
    }
  }

  // Load products and audiences for this brand
  const wsFilter = workspaceId || null;
  let query = supabase
    .from("user_business_data")
    .select("title, content, analyzed_content, data_type, source")
    .eq("source", "business-dna")
    .in("data_type", ["product", "audience"]);

  if (wsFilter) {
    query = query.eq("workspace_id", wsFilter);
  } else {
    query = query.eq("user_id", userId);
  }

  const { data: relatedData } = await query.limit(50);

  if (relatedData && relatedData.length > 0) {
    // Filter by brandId in content
    const products: any[] = [];
    const audiences: any[] = [];

    for (const item of relatedData) {
      try {
        const parsed = item.content ? JSON.parse(item.content) : {};
        if (brandId && parsed.brandId && parsed.brandId !== brandId) continue;
        if (item.data_type === "product") products.push({ ...parsed, _title: item.title, _analyzed: item.analyzed_content });
        if (item.data_type === "audience") audiences.push({ ...parsed, _title: item.title, _analyzed: item.analyzed_content });
      } catch {
        // skip malformed
      }
    }

    if (products.length > 0) {
      context += `\n## Products (${products.length})\n`;
      for (const p of products.slice(0, 10)) {
        context += `\n### ${p.name || p._title || "Product"}\n`;
        if (p.description) context += `${p.description}\n`;
        if (p.features?.length) context += `- **Features:** ${(Array.isArray(p.features) ? p.features : []).slice(0, 5).join(", ")}\n`;
        if (p.benefits?.length) context += `- **Benefits:** ${(Array.isArray(p.benefits) ? p.benefits : []).slice(0, 5).join(", ")}\n`;
        if (p.pricing) context += `- **Pricing:** ${typeof p.pricing === "string" ? p.pricing : JSON.stringify(p.pricing)}\n`;
        if (p._analyzed) context += `${p._analyzed.slice(0, 800)}\n`;
      }
    }

    if (audiences.length > 0) {
      context += `\n## Target Audiences (${audiences.length})\n`;
      for (const a of audiences.slice(0, 10)) {
        context += `\n### ${a.name || a._title || "Audience"}\n`;
        if (a.demographics) context += `- **Demographics:** ${typeof a.demographics === "string" ? a.demographics : JSON.stringify(a.demographics)}\n`;
        if (a.painPoints?.length) context += `- **Pain Points:** ${(Array.isArray(a.painPoints) ? a.painPoints : []).slice(0, 5).join(", ")}\n`;
        if (a.goals?.length) context += `- **Goals:** ${(Array.isArray(a.goals) ? a.goals : []).slice(0, 5).join(", ")}\n`;
        if (a._analyzed) context += `${a._analyzed.slice(0, 800)}\n`;
      }
    }
  }

  // Also load other workspace business data (documents, etc.)
  if (wsFilter) {
    const { data: wsData } = await supabase
      .from("user_business_data")
      .select("title, content, analyzed_content, data_type")
      .eq("workspace_id", wsFilter)
      .not("source", "eq", "business-dna")
      .limit(20);

    if (wsData && wsData.length > 0) {
      context += `\n## Additional Business Data\n`;
      for (const item of wsData) {
        context += `\n### ${item.title} (${item.data_type})\n`;
        if (item.analyzed_content) context += item.analyzed_content.slice(0, 800) + "\n";
        else if (item.content) context += item.content.slice(0, 800) + "\n";
      }
    }
  }

  return context;
}

function buildChatPrompt(businessContext: string): string {
  return `You are an intelligent AI business assistant. You help users with their business strategy, marketing, content creation, analysis, and day-to-day operations.

${businessContext ? `# YOUR BUSINESS CONTEXT\nYou have deep knowledge of the user's business. Use this information to provide personalized, specific advice — not generic responses.\n${businessContext}` : ""}

## Guidelines
- Give actionable, specific advice grounded in the user's actual business data
- Reference their products, audiences, and brand when relevant
- Be concise but thorough — use markdown formatting for readability
- If you don't have enough context, ask clarifying questions
- Help with strategy, copywriting, brainstorming, analysis, planning, and problem-solving
- When suggesting content, match the brand's tone, colors, and style`;
}

function buildBrowserPrompt(pageSection: string, businessContext: string): string {
  return `You are a browser automation AI assistant embedded in a Chrome extension. You can SEE the user's current page and perform actions on it.

${businessContext ? `# YOUR BUSINESS CONTEXT\nUse this business knowledge to inform your actions and provide relevant help.\n${businessContext}` : ""}

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
- Use CSS selectors when possible, fall back to descriptive text
- For complex pages, break tasks into small sequential steps
- If you cannot determine how to complete a task, use "respond" to ask for clarification
- Always include "reasoning" so the user understands each step
- If the task involves sensitive actions (delete, purchase, send), warn the user first
- When extracting data, be specific about what you're pulling`;
}
