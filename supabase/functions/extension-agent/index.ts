import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

import {
  shouldSearchConnections,
  extractQueryTopic,
  searchConnectedProviders,
} from "../_shared/run-employee/connections.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STOPWORDS = new Set(["this","that","with","from","have","been","were","they","their","what","about","which","when","where","will","would","could","should","there","these","those","some","other","into","more","also","than","then","just","only","very","much","such","like","over","after","before","between","under","each","every","both","most","same","does","doing","done","make","made","know","think","want","need","help","find","give","tell","show","look","come","back","take","well","still","even","here","many","while"]);

// =====================================================
// MIDDLEWARE GUARDRAILS (Layer 2 + Layer 4)
// Only enforced when user has enabled them in settings
// =====================================================

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+/i,
  /disregard\s+(your|all|the)\s+/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /system\s*:\s*you\s+are/i,
  /forget\s+(everything|all|your\s+instructions)/i,
  /new\s+instructions?\s*:/i,
  /override\s+(your|system|all)\s+/i,
];

const PII_PATTERNS = [
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, label: "credit card number" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, label: "SSN" },
];

const OUTPUT_BLOCKLIST = [
  /here\s+(?:is|are)\s+(?:your|the|my)\s+(?:credit\s+card|ssn|social\s+security|password)/i,
  /\bDROP\s+TABLE\b/i,
  /\bDELETE\s+FROM\s+/i,
  /\bsudo\s+rm\b/i,
];

const BLOCKED_URL_PATTERNS = [
  /checkout/i, /payment/i, /billing/i,
  /signin|sign-in|login|log-in/i,
  /signup|sign-up|register/i,
];

const BLOCKED_SELECTOR_PATTERNS = [
  /sign.?up|register|create.?account/i,
  /log.?in|sign.?in/i,
  /pay|purchase|buy|checkout|place.?order|subscribe/i,
];

async function loadSafetySettings(supabase: any, brandId?: string): Promise<any | null> {
  if (!brandId) return null;
  const { data } = await supabase
    .from("user_business_data")
    .select("content")
    .eq("id", brandId)
    .single();
  if (!data?.content) return null;
  try {
    const parsed = JSON.parse(data.content);
    return parsed?.safetySettings || null;
  } catch { return null; }
}

function runPreflightGuardrails(userMessage: string, safety: any): string | null {
  if (!userMessage || !safety) return null;

  if (safety.promptInjectionEnabled) {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(userMessage)) {
        return "⚠️ Your message was blocked by the **Prompt Injection Defense** guardrail. It contained patterns that could override system instructions. Please rephrase your request.";
      }
    }
  }

  if (safety.integrityEnabled !== false) {
    for (const { pattern, label } of PII_PATTERNS) {
      if (pattern.test(userMessage)) {
        return `⚠️ Your message was blocked by the **Integrity** guardrail. It appears to contain a ${label}. Please remove sensitive data before sending.`;
      }
    }
  }

  return null;
}

function runPostflightGuardrails(content: string, safety: any): string {
  if (!content || !safety) return content;

  if (safety.integrityEnabled !== false) {
    for (const pattern of OUTPUT_BLOCKLIST) {
      if (pattern.test(content)) {
        return "⚠️ The AI response was blocked by the **Integrity** guardrail because it contained potentially unsafe content.";
      }
    }
  }

  return content;
}

function validateBrowserActions(content: string, safety: any): string | null {
  if (!safety || safety.integrityEnabled === false) return null;

  try {
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (!jsonMatch) return null;
    const action = JSON.parse(jsonMatch[1]);

    if (action.action === "navigate" && action.url) {
      for (const pattern of BLOCKED_URL_PATTERNS) {
        if (pattern.test(action.url)) {
          const blocked = JSON.stringify({ action: "respond", message: `⚠️ Navigation to "${action.url}" was blocked by the **Integrity** guardrail. Please handle this manually.`, reasoning: "Blocked by middleware", done: false });
          return "```json\n" + blocked + "\n```";
        }
      }
    }

    if (action.action === "click" && action.selector) {
      for (const pattern of BLOCKED_SELECTOR_PATTERNS) {
        if (pattern.test(action.selector)) {
          const blocked = JSON.stringify({ action: "respond", message: `⚠️ Clicking "${action.selector}" was blocked by the **Integrity** guardrail. Please handle this manually.`, reasoning: "Blocked by middleware", done: false });
          return "```json\n" + blocked + "\n```";
        }
      }
    }

    if (action.action === "type" && /password|passwd|secret|card.?number|cvv|cvc|ssn/i.test(action.selector || "")) {
      const blocked = JSON.stringify({ action: "respond", message: `⚠️ Typing into a sensitive field was blocked by the **Integrity** guardrail. Please handle this manually.`, reasoning: "Blocked by middleware", done: false });
      return "```json\n" + blocked + "\n```";
    }
  } catch {}

  return null;
}

// =====================================================
// MAIN HANDLER
// =====================================================

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

    // Load safety settings from brand (null if no brand or no settings)
    const safetySettings = await loadSafetySettings(supabase, brandId);

    // Load lightweight identity
    const identity = await loadBusinessIdentity(supabase, user.id, brandId);

    // RAG: retrieve relevant context based on user's latest message
    const lastUserMsg = extractLastUserMessage(messages);

    // --- MIDDLEWARE LAYER 2: Pre-flight input validation (only if guardrails enabled) ---
    const preflightBlock = runPreflightGuardrails(lastUserMsg, safetySettings);
    if (preflightBlock) {
      return new Response(JSON.stringify({ content: preflightBlock }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const relevantContext = await retrieveRelevantContext(supabase, user.id, workspaceId, lastUserMsg, brandId, browserMode);

    // --- Connection search (live data from Microsoft/Slack/etc.) ---
    const { connectionContext, searchedProviders, skippedProviders, skippedProviderDetails, connectionDecision, queryTopic } = await searchConnectedProviders(
      supabase,
      user.id,
      lastUserMsg,
    );

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
    const fullContext = relevantContext + connectionContext;

    const systemPrompt = browserMode
      ? buildBrowserActionPrompt(pageSection, identity, fullContext, safetySettings)
      : hasBrowserContext
        ? buildBrowserPrompt(pageSection, identity, fullContext, safetySettings)
        : buildChatPrompt(identity, fullContext);

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
      user_message: typeof userMsg === "string" ? userMsg : JSON.stringify(userMsg),
      page_url: pageContext?.url || null,
    }).then(() => {});

    // In browserMode, return non-streaming JSON with post-flight + action validation
    if (browserMode) {
      const aiResult = await response.json();
      let content = aiResult.choices?.[0]?.message?.content || "";
      content = runPostflightGuardrails(content, safetySettings);
      const actionBlock = validateBrowserActions(content, safetySettings);
      if (actionBlock) content = actionBlock;
      return new Response(JSON.stringify({ content, connectionDecision, searchedProviders, skippedProviderDetails, queryTopic }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Wrap the AI gateway SSE stream in custom events with progress steps
    const encoder = new TextEncoder();
    const topic = queryTopic || "your request";

    const stream = new ReadableStream({
      start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };
        const sendStep = (label: string, status: "running" | "done" | "error", action = "process", detail?: string) => {
          send({ type: "progress", step: { label, status, action, detail } });
        };
        const close = () => {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        };

        (async () => {
          try {
            // Emit context gathering step
            sendStep(`Gathering business data on ${topic}`, "done", "context");

            // Emit connection steps
            if (connectionDecision.shouldSearch) {
              sendStep(`Checking connected sources for ${topic}`, "done", "connections", connectionDecision.reason);
              for (const provider of searchedProviders) {
                const label = provider === "microsoft" ? `Searching Microsoft 365 emails & files for ${topic}` :
                              provider === "slack" ? `Searching Slack messages & channels for ${topic}` :
                              `Searching ${provider} for ${topic}`;
                sendStep(label, "done", "connections");
              }
              for (const skipped of skippedProviderDetails) {
                const label = skipped.provider === "microsoft" ? `Skipped Microsoft — ${skipped.reason}` :
                              skipped.provider === "slack" ? `Skipped Slack — ${skipped.reason}` :
                              `Skipped ${skipped.provider} — ${skipped.reason}`;
                sendStep(label, "done", "connections");
              }
            }

            sendStep(`Crafting your answer on ${topic}`, "running", "response");

            // Consume AI gateway stream and re-emit as content events
            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response body");

            const decoder = new TextDecoder();
            let fullContent = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");
              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") break;
                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content || "";
                  if (delta) {
                    fullContent += delta;
                    send({ type: "content", delta });
                  }
                } catch {}
              }
            }

            sendStep(`Crafting your answer on ${topic}`, "done", "response");
            sendStep("Finished", "done", "complete");

            // Apply post-flight guardrails
            const finalContent = runPostflightGuardrails(fullContent, safetySettings);
            send({ type: "result", content: finalContent, connectionDecision, searchedProviders, skippedProviderDetails, queryTopic });
            close();
          } catch (error: any) {
            console.error("extension-agent stream error:", error?.message || error);
            send({ type: "error", error: error?.message || "An internal error occurred" });
            close();
          }
        })();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    console.error("extension-agent error occurred");
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// --- RAG Helpers ---

function extractKeywords(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !STOPWORDS.has(w));
}

function extractLastUserMessage(messages: any[]): string {
  if (!messages || messages.length === 0) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      const c = messages[i].content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) return c.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ");
    }
  }
  return "";
}

function scoreItem(keywords: string[], title: string, contentSnippet: string): number {
  if (keywords.length === 0) return 0;
  const haystack = (title + " " + contentSnippet).toLowerCase();
  let matches = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw)) matches++;
  }
  return matches / keywords.length;
}

async function loadBusinessIdentity(supabase: any, userId: string, brandId?: string): Promise<string> {
  if (!brandId) return "";
  const { data: brandRow } = await supabase
    .from("user_business_data")
    .select("title, content")
    .eq("id", brandId)
    .single();

  if (!brandRow) return "";
  let identity = `Business: ${brandRow.title}`;
  if (brandRow.content) {
    try {
      const parsed = JSON.parse(brandRow.content);
      if (parsed.name) identity += ` | Brand: ${parsed.name}`;
      if (parsed.category) identity += ` | Category: ${parsed.category}`;
      if (parsed.agentName) identity += ` | Agent: ${parsed.agentName}`;
    } catch {}
  }
  return identity;
}

async function retrieveRelevantContext(supabase: any, userId: string, workspaceId?: string, userQuery?: string, brandId?: string, browserMode?: boolean): Promise<string> {
  const keywords = extractKeywords(userQuery || "");
  // In browser mode, even with no keyword matches, include brand context
  const isContentCreation = /\b(slide|pitch|present|report|document|graphic|chart|spreadsheet|analytics|brand|investor|deck|proposal|summary|overview)\b/i.test(userQuery || "");
  if (keywords.length === 0 && !browserMode && !isContentCreation) return "";

  // If a brandId is provided, resolve the brand's logical ID so we can scope all results
  let brandLogicalId: string | null = null;
  if (brandId) {
    const { data: brandRow } = await supabase
      .from("user_business_data")
      .select("content")
      .eq("id", brandId)
      .single();
    if (brandRow?.content) {
      try { brandLogicalId = JSON.parse(brandRow.content)?.id || null; } catch {}
    }
  }

  let query = supabase
    .from("user_business_data")
    .select("id, title, content, analyzed_content, data_type, source");

  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  else query = query.eq("user_id", userId);

  const { data: items } = await query.limit(200);
  if (!items || items.length === 0) return "";

  // Filter to only items belonging to the selected brand
  let filtered = items;
  if (brandId || brandLogicalId) {
    filtered = items.filter((item: any) => {
      // The brand record itself
      if (item.id === brandId) return true;
      // Products/audiences/data that reference this brand in their content JSON
      if (brandLogicalId && item.content) {
        try {
          const parsed = JSON.parse(item.content);
          if (parsed.brandId === brandLogicalId) return true;
        } catch {}
      }
      // Canvas/manual items tagged with the brand in metadata
      if (item.content?.includes(brandLogicalId || "")) return true;
      return false;
    });
  }

  const scoreThreshold = browserMode ? 0.0 : 0.1;
  const maxResults = browserMode ? 8 : 5;
  const snippetLen = browserMode ? 800 : 500;

  const allScored = filtered.map((item: any) => {
    const snippet = (item.analyzed_content || item.content || "").slice(0, 300);
    return { ...item, score: keywords.length > 0 ? scoreItem(keywords, item.title || "", snippet) : (["brand","product","audience"].includes(item.data_type) ? 1 : 0.05) };
  }).sort((a: any, b: any) => b.score - a.score);

  const top = allScored.filter((i: any) => i.score >= scoreThreshold).slice(0, maxResults);

  // Always ensure brand, product, and audience are represented for fact-checking
  const requiredTypes = ["brand", "product", "audience"];
  for (const dt of requiredTypes) {
    if (!top.some((i: any) => i.data_type === dt)) {
      const candidate = allScored.find((i: any) => i.data_type === dt && !top.includes(i));
      if (candidate) {
        if (top.length >= maxResults) top.pop();
        top.push(candidate);
      }
    }
  }

  if (top.length === 0) return "";

  let context = "\n\n## Reference Material (from your business database)\nUse this knowledge to inform HOW you execute the task. It may contain strategies, preferred tools, platforms, methods, or domain expertise. When the Reference Material includes brand, product, or audience records, always cross-check your response against those records for accuracy.\n";
  for (const item of top) {
    context += `\n### ${item.title} (${item.data_type})\n`;
    const text = item.analyzed_content || item.content || "";
    context += text.slice(0, snippetLen) + "\n";
  }
  return context;
}

// --- Prompt Builders ---

function buildBrowserActionPrompt(pageSection: string, identity: string, relevantContext: string, safetySettings?: any): string {
  return `You are an AI assistant executing tasks through the user's browser. You follow instructions precisely, one action at a time. Never refer to yourself as "CEO" or "AI CEO". Never mention "RAG", "knowledge files", or "knowledge base".

${identity ? `# Business Context\n${identity}` : ""}
${relevantContext}
${pageSection}

## TASK PLANNING — MANDATORY FIRST STEP
Before executing ANY browser action, you MUST plan your approach:
1. **Analyze the user's request** — What is the actual goal? (e.g., "find a winning ecom product" means researching trending products with high margins, not literally Googling that phrase)
2. **Check your Reference Material above** — Does the business context contain strategies, preferred platforms, tools, methods, or domain knowledge about HOW to accomplish this task? If so, FOLLOW those methods.
3. **Choose the RIGHT platform/website** — Do NOT default to Google. Think about WHERE an expert would go:
   - Product research → AliExpress trending, Amazon Best Sellers, TikTok Creative Center, Minea, etc.
   - Market research → SimilarWeb, Google Trends, industry-specific sites
   - Competitor analysis → The competitor's actual website, social media
   - Content ideas → TikTok, Instagram, YouTube trending
   - Ad research → Facebook Ad Library, TikTok Creative Center
4. **Plan 3-5 concrete steps** — Know what you'll do before you start acting.
5. **IMMEDIATELY START EXECUTING** — Do NOT just output a plan. Your first response must be an actual action (navigate, click, etc.) that begins the task. Combine your plan explanation into the "reasoning" field of your first action.

## CRITICAL RULES
1. **Prefer batched steps** — When you can plan 2-5 sequential actions confidently, return them all at once as a "steps" array. This is MUCH faster.
2. **No page context = navigate first** — If there is no page context, your first action MUST be a "navigate" to the RIGHT platform (not Google unless Google is genuinely the best tool).
3. **Never stop early** — Even if an action fails, try an alternative approach.
4. **ALWAYS respond with JSON** — You MUST respond with a JSON code block every single time.
5. **Be domain-smart** — Translate vague requests into expert-level actions. "Find winning products" → go to product research platforms, filter by trending/bestsellers, extract specific product data.

## Response Format
Prefer returning multiple steps at once when possible. Wrap in a markdown code block:

### Multi-step (PREFERRED — faster execution):
\`\`\`json
{
  "steps": [
    { "action": "navigate", "url": "https://...", "reasoning": "Going to target page", "done": false },
    { "action": "wait", "duration": 1500, "reasoning": "Wait for page load", "done": false },
    { "action": "click", "selector": ".trending-tab", "reasoning": "Switch to trending view", "done": false }
  ]
}
\`\`\`

### Single action (when you need to see the result before deciding next step):
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
8. **done** — \`{ "action": "done", "message": "...", "reasoning": "all steps completed", "done": true }\`

## DONE MESSAGE FORMAT — CRITICAL
When you return "done", the "message" field MUST contain ALL the actual data/results the user asked for, formatted in clean markdown:
- **Product names, prices, links** — list them out
- **URLs found** — include full URLs
- **Images** — include image URLs as markdown images: ![description](url)
- **Text/content** — include the actual text found
- **Analysis** — include your analysis or recommendations
Do NOT just say "Task completed". The message IS the deliverable.

## SAFETY GUARDRAILS — ABSOLUTE RULES
${safetySettings?.integrityEnabled !== false ? `1. **NEVER make payments**
2. **NEVER sign up or create accounts**
3. **NEVER log in**
4. **NEVER enter sensitive data**
5. If you encounter any of the above, STOP and use "respond" to ask the user to handle it manually.` : "- Integrity guardrails are disabled. Still exercise caution with sensitive actions."}

## Guidelines
- Prefer multi-step responses (2-5 steps) when the sequence is predictable
- Return single actions when you need to see the page result first
- Set "done": true ONLY when the full task is completed
- Use CSS selectors when possible, fall back to descriptive text`;
}

function buildChatPrompt(identity: string, relevantContext: string): string {
  return `You are an intelligent AI assistant. You help with strategy, marketing, content creation, analysis, operations, and decision-making.

${identity ? `# Business Context\n${identity}\n\n**IMPORTANT: You are currently representing ONLY this business. All your answers must be about this specific business. Do NOT reference or provide information about any other business the user may own.**` : ""}
${relevantContext}

## CRITICAL CHAT BEHAVIOR
1. **ALWAYS answer the user's actual question first.** This is your #1 priority.
2. If the user attached files, analyze that specific content and answer their question about it.
3. Reference material above contains verified business data. When creating any pitch, presentation, report, slide, document, graph, chart, analytics output, spreadsheet, or visual deliverable, you MUST use this data to personalize the content. For general questions, reference it when relevant.
4. Do NOT summarize business context unprompted. Do NOT start responses with business overviews.
5. Be decisive, data-informed, and forward-thinking.
6. Never refer to yourself as "CEO" or "AI CEO".
7. Never mention "RAG", "knowledge files", or "knowledge base".
8. **NEVER fabricate or invent business data.** If the Reference Material does not contain specific numbers, do NOT make them up. Ask the user to provide them.
9. When the Reference Material includes brand, product, or audience records, always cross-check your response against those records for accuracy before answering.
10. When the user asks for a pitch, presentation, report, document, graph, chart, analytics output, spreadsheet, or any creative deliverable, ALWAYS base the content on the business's brand, product, and audience data from the Reference Material. Treat every request as being about THIS business unless the user explicitly says otherwise. Never create generic content.

## FORMATTING
- Use ## and ### headings for structure
- Use **bold** for key terms and important takeaways
- Use bullet lists and numbered lists for clarity
- Use tables when comparing data, options, or metrics
- Use > blockquotes for key insights
- Add blank lines between sections
- Keep paragraphs short (2-3 sentences max)
- Use --- to separate major sections in longer responses

## SLIDES & DOCUMENTS
When the user asks for a pitch, presentation, slide, report, or document, you MUST output the appropriate fenced code block:

For slides use a \`\`\`slide code block:
\`\`\`slide
{"title":"Title","subtitle":"Context","layout":"stat-callout","icon":"🚀","stats":[{"value":"$2.4M","label":"ARR"}],"bullets":["Point 1"],"takeaway":"Key insight","accent_color":"#3399ff"}
\`\`\`

For documents use a \`\`\`document code block:
\`\`\`document
{"title":"Title","sections":[{"heading":"Section","content":"Content"}],"date":"..."}
\`\`\`

For spreadsheets use a \`\`\`spreadsheet code block:
\`\`\`spreadsheet
{"title":"Title","headers":["Col1","Col2"],"rows":[["A","B"]],"footer":["Total","100"]}
\`\`\`

For analytics dashboards use a \`\`\`analytics code block:
\`\`\`analytics
{"title":"Title","metrics":[{"label":"Metric","value":"100","change":5.2}],"insights":["Insight"]}
\`\`\``;
}

function buildBrowserPrompt(pageSection: string, identity: string, relevantContext: string, safetySettings?: any): string {
  return `You are an intelligent browser automation AI assistant embedded in a browser extension. You can SEE the user's current page and perform actions on it.

${identity ? `# Business Context\n${identity}` : ""}
${relevantContext}
${pageSection}

## Your Capabilities
You analyze the user's request and the current page, then return a structured action plan the extension will execute.

## Response Format
Always respond with a JSON object wrapped in a markdown code block.

### Action Types:
1. **click** — \`{ "action": "click", "selector": "CSS selector or description", "reasoning": "why" }\`
2. **type** — \`{ "action": "type", "selector": "CSS selector or description", "value": "text to type", "reasoning": "why" }\`
3. **navigate** — \`{ "action": "navigate", "url": "https://...", "reasoning": "why" }\`
4. **scroll** — \`{ "action": "scroll", "direction": "up|down", "amount": 500, "reasoning": "why" }\`
5. **extract** — \`{ "action": "extract", "selector": "CSS selector or description", "dataLabel": "what this data is", "reasoning": "why" }\`
6. **wait** — \`{ "action": "wait", "duration": 1000, "reasoning": "why" }\`
7. **select** — \`{ "action": "select", "selector": "CSS selector", "value": "option value", "reasoning": "why" }\`
8. **copy** — \`{ "action": "copy", "text": "text to copy", "reasoning": "why" }\`
9. **respond** — \`{ "action": "respond", "message": "your reply", "reasoning": "why" }\`

### Multi-step tasks
\`\`\`json
{
  "steps": [
    { "action": "click", "selector": "#login-btn", "reasoning": "Open login form" },
    { "action": "wait", "duration": 500, "reasoning": "Wait for form" }
  ],
  "summary": "Brief description"
}
\`\`\`

## SAFETY GUARDRAILS
${safetySettings?.integrityEnabled !== false ? `- **NEVER** make payments, sign up, log in, or enter sensitive data.
- If you encounter any of the above, warn the user.` : "- Integrity guardrails are disabled. Still exercise caution."}

## Guidelines
- Use CSS selectors when possible
- Break complex tasks into small sequential steps
- If you cannot complete a task, use "respond" to ask for clarification
- Always include "reasoning"
- Warn before sensitive actions (delete, purchase, send)`;
}
