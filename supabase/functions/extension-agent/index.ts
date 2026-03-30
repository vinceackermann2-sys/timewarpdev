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

    const { messages, pageContext, brandId, workspaceId, browserMode } = await req.json();

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

    const hasBrowserContext = !!pageContext || browserMode;

    const systemPrompt = browserMode
      ? buildBrowserActionPrompt(pageSection, businessContext)
      : hasBrowserContext
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
        stream: !browserMode,
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

    // In browserMode, return non-streaming JSON
    if (browserMode) {
      const aiResult = await response.json();
      const content = aiResult.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

  // Also load other business data (documents, files, URLs uploaded to database)
  {
    let dbQuery = supabase
      .from("user_business_data")
      .select("title, content, analyzed_content, data_type, source")
      .not("source", "eq", "business-dna");

    if (wsFilter) {
      dbQuery = dbQuery.eq("workspace_id", wsFilter);
    } else {
      dbQuery = dbQuery.eq("user_id", userId);
    }

    const { data: dbData } = await dbQuery.limit(30);

    if (dbData && dbData.length > 0) {
      context += `\n## Business Database Files & Documents\n`;
      for (const item of dbData) {
        context += `\n### ${item.title} (${item.data_type})\n`;
        if (item.analyzed_content) context += item.analyzed_content.slice(0, 1500) + "\n";
        else if (item.content) context += item.content.slice(0, 1500) + "\n";
      }
    }
  }

  return context;
}

function buildBrowserActionPrompt(pageSection: string, businessContext: string): string {
  return `You are an AI CEO executing tasks through the user's browser. You follow instructions precisely, one action at a time. Never refer to yourself as "CEO" or "AI CEO". Never mention "RAG", "knowledge files", or "knowledge base" — just naturally use any business context you have.

${businessContext ? `# YOUR BUSINESS CONTEXT\n${businessContext}` : ""}
${pageSection}

## CRITICAL RULES
1. **One action at a time** — Each call you return EXACTLY ONE action as a JSON code block. After the action executes, you'll receive the updated page context and result, then decide the next action.
2. **No page context = navigate first** — If there is no page context or the URL is blank/about:blank, your first action MUST be a "navigate" to the appropriate URL. Do NOT return "done" just because there is no page context yet.
3. **Never stop early** — Even if an action fails, try an alternative approach. Only return "done" after all required steps are completed or you truly cannot proceed after multiple attempts.
4. **ALWAYS respond with JSON** — You MUST respond with a JSON code block every single time. Never respond with plain text.

## Response Format
Always respond with a single JSON object wrapped in a markdown code block:

\`\`\`json
{ "action": "navigate", "url": "https://...", "reasoning": "Going to target page", "done": false }
\`\`\`

### Action Types:
1. **click** — \`{ "action": "click", "selector": "CSS selector or description", "reasoning": "why", "done": false }\`
2. **type** — \`{ "action": "type", "selector": "CSS selector or description", "value": "text", "reasoning": "why", "done": false }\`
3. **navigate** — \`{ "action": "navigate", "url": "https://...", "reasoning": "why", "done": false }\`
4. **scroll** — \`{ "action": "scroll", "direction": "up|down", "amount": 500, "reasoning": "why", "done": false }\`
5. **extract** — \`{ "action": "extract", "selector": "CSS selector or description", "dataLabel": "what", "reasoning": "why", "done": false }\`
6. **wait** — \`{ "action": "wait", "duration": 1000, "reasoning": "why", "done": false }\`
7. **respond** — \`{ "action": "respond", "message": "your reply", "reasoning": "why", "done": false }\`
8. **done** — \`{ "action": "done", "message": "summary of what was accomplished", "reasoning": "all steps completed", "done": true }\`

## SAFETY GUARDRAILS — ABSOLUTE RULES
1. **NEVER make payments** — Do not click "Buy", "Pay", "Purchase", "Checkout", etc.
2. **NEVER sign up or create accounts** — Do not click "Sign Up", "Register", etc.
3. **NEVER log in** — Do not enter passwords or interact with auth forms.
4. **NEVER enter sensitive data** — No credit cards, SSNs, passwords, or PII.
5. If you encounter any of the above, STOP and use "respond" to ask the user to handle it manually.

## Guidelines
- Return ONE action per response
- Set "done": true ONLY when the full task is completed
- Use CSS selectors when possible, fall back to descriptive text
- If you cannot complete a step, use "respond" to ask for clarification`;
}

function buildChatPrompt(businessContext: string): string {
  return `You are an intelligent executive AI assistant. You have comprehensive knowledge of the user's business and help with strategy, marketing, content creation, analysis, operations, and decision-making.

${businessContext ? `# YOUR BUSINESS CONTEXT\nThis is your deep knowledge of the user's business — their brand, products, and target audiences. ALWAYS use this information to provide personalized, specific advice — never give generic responses. Reference specific products, audiences, brand details, and data points.\n${businessContext}` : ""}

## Your Role
- You know the user's business inside and out
- Give actionable, specific advice grounded in the user's actual business data
- Proactively reference their products, audiences, brand identity, and market positioning
- Think strategically — connect dots between their brand, products, audiences, and market opportunities
- Be concise but thorough — use markdown formatting for readability
- If you don't have enough context, ask clarifying questions
- Help with strategy, copywriting, brainstorming, analysis, planning, and problem-solving
- When suggesting content, match the brand's tone, colors, and style
- Be decisive, data-informed, and forward-thinking
- Never refer to yourself as "CEO" or "AI CEO" — you are simply their AI assistant
- Never mention "RAG", "knowledge files", or "knowledge base" — just naturally use the business context you have`;
}

function buildBrowserPrompt(pageSection: string, businessContext: string): string {
  return `You are an intelligent browser automation AI assistant embedded in a browser extension. You can SEE the user's current page and perform actions on it, informed by your deep knowledge of their business.

${businessContext ? `# YOUR BUSINESS CONTEXT\nUse this business context (brand, products, audiences) to inform your actions, generate relevant content, and provide contextual help.\n${businessContext}` : ""}

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
