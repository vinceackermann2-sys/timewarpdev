import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { searchConnectedProviders } from "../_shared/run-employee/connections.ts";
import { classifyAssistantReplyContract } from "../_shared/assistant-reply-contract.ts";
import { buildAssistantGroundingBlock } from "../_shared/assistant-grounding.ts";
import { encodeLiveSourceRegistryHeader, type LiveSourceRegistry } from "../_shared/live-source-citations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-tw-live-sources",
};

async function fetchUserBusinessContext(userId: string, workspaceId?: string): Promise<string> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // If workspaceId provided, verify membership first
  if (workspaceId) {
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!member) {
      // Not a member — fall back to user-only data
      workspaceId = undefined;
    }
  }

  // NOTE: We intentionally bypass the legacy `context.json` storage cache —
  // it can be stale and miss the new 9-pillar Business DNA rows. Always query DB.

  // Fallback: query DB directly
  let query = supabase
    .from("user_business_data")
    .select("data_type, source, title, content, analyzed_content, metadata, is_analyzed");

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else {
    query = query.eq("user_id", userId);
  }

  const { data: bizData } = await query
    .order("created_at", { ascending: false })
    .limit(200);

  if (bizData && bizData.length > 0) {
    return formatContextItems(bizData);
  }

  return "";
}

function truncate(text: string, max: number): string {
  if (!text || text.length <= max) return text;
  return text.slice(0, max) + "... [truncated]";
}

function formatContextItems(items: any[]): string {
  // Surface the full 9-pillar Business DNA first (brand, product, audience, market,
  // financial, operations, people, growth, strategy) so the AI always grounds in it.
  const DNA_TYPES = ["brand", "product", "audience", "market", "financial", "operations", "people", "growth", "strategy"];
  items = [...items].sort((a, b) => {
    const ai = DNA_TYPES.indexOf(a?.data_type); const bi = DNA_TYPES.indexOf(b?.data_type);
    const ar = ai === -1 ? 99 : ai; const br = bi === -1 ? 99 : bi;
    return ar - br;
  });
  const MAX_CONTEXT_CHARS = 200000;
  const MAX_ITEM_CHARS = 2000;
  let context = "\n\n## User's Business Data\n\n";
  let totalChars = 0;

  const bySource: Record<string, any[]> = {};
  for (const item of items) {
    const src = item.source || "unknown";
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(item);
  }

  for (const [source, sourceItems] of Object.entries(bySource)) {
    const header = `### Source: ${source} (${sourceItems.length} items)\n`;
    if (totalChars + header.length > MAX_CONTEXT_CHARS) break;
    context += header;
    totalChars += header.length;

    for (const item of sourceItems) {
      let itemText = `- **${item.title}** (${item.data_type})\n`;
      if (item.analyzed_content) {
        itemText += `  **Full Analysis:**\n${truncate(item.analyzed_content, MAX_ITEM_CHARS)}\n\n`;
      }
      if (item.content) {
        itemText += `  **Full Content:**\n${truncate(item.content, MAX_ITEM_CHARS)}\n\n`;
      }
      if (item.metadata) {
        const meta = typeof item.metadata === "string" ? item.metadata : JSON.stringify(item.metadata);
        itemText += `  Metadata: ${meta.slice(0, 500)}\n`;
      }
      if (totalChars + itemText.length > MAX_CONTEXT_CHARS) break;
      context += itemText;
      totalChars += itemText.length;
    }
    context += "\n";
    totalChars += 1;
  }

  return context;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    const { messages, connectedContexts, workspaceId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Get user ID from auth token
    let userContext = "";
    let liveConnectionsContext = "";
    let liveSourceRegistryForResponse: LiveSourceRegistry = {};
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        // Check and increment action usage
        const { data: actionResult } = await supabase.rpc("increment_actions_used", { _user_id: user.id });
        const result = actionResult as any;
        if (result && !result.allowed) {
          return new Response(JSON.stringify({ error: result.reason || "Action limit reached. Upgrade your plan." }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userContext = await fetchUserBusinessContext(user.id, workspaceId);

        // Live connector search — Gmail/Drive/Calendar/Outlook/OneDrive/OneNote/Slack/HubSpot.
        // Triggers only on live-data intent. If user names a tool, only that one is searched.
        try {
          const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
          if (lastUserMsg) {
            const { connectionContext, sourceRegistry } = await searchConnectedProviders(supabase, user.id, lastUserMsg);
            liveConnectionsContext = connectionContext || "";
            liveSourceRegistryForResponse = sourceRegistry || {};
          }
        } catch (e) {
          console.error("[research-chat] live connector search failed:", e);
        }
      }
    }

    // Also include any frontend-passed contexts
    let frontendContext = "";
    if (connectedContexts && connectedContexts.length > 0) {
      // Check for unanalyzed sources
      const unanalyzedSources = connectedContexts.filter((ctx: any) => ctx.isAnalyzed === false);
      if (unanalyzedSources.length > 0) {
        frontendContext += "\n\n## ⚠️ UNANALYZED DATA SOURCES\nThe following connected sources have NOT been analyzed yet. You MUST inform the user that these sources need to be analyzed first before you can provide insights from them. Tell them to click the 'Analyze' button on the node.\n";
        for (const ctx of unanalyzedSources) {
          frontendContext += `- **${ctx.label}** (${ctx.type}) — NOT YET ANALYZED\n`;
        }
        frontendContext += "\n";
      }

      const analyzedContexts = connectedContexts.filter((ctx: any) => ctx.isAnalyzed !== false);
      if (analyzedContexts.length > 0) {
        frontendContext += "\n\n## Additional Connected Data\n\n";
        for (const ctx of analyzedContexts) {
          frontendContext += `### ${ctx.label} (${ctx.type})\n`;
          if (ctx.content?.analysis) frontendContext += `**AI Analysis:**\n${ctx.content.analysis}\n\n`;
          if (ctx.content?.text) frontendContext += `**Raw Text:**\n${ctx.content.text}\n\n`;
          if (ctx.content?.extractedText) frontendContext += `**Extracted Content:**\n${ctx.content.extractedText}\n\n`;
          if (ctx.content?.url) frontendContext += `**Source URL:** ${ctx.content.url}\n\n`;
          if (ctx.content?.name) frontendContext += `**Document:** ${ctx.content.name}\n\n`;
          if (ctx.content?.items) frontendContext += `**Data:** ${JSON.stringify(ctx.content.items?.slice(0, 20))}\n\n`;
        }
      }
    }

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    const replyContract = classifyAssistantReplyContract(lastUserMsg);
    const grounding = buildAssistantGroundingBlock(replyContract);
    const responseShape = replyContract === "strategic_plan"
      ? `## Response shape (advanced strategic plan)
- For heavy strategy questions, produce a first-principles plan with clear evidence sources.
- Include 30/60/90 execution, KPI tree, risks, and confidence.
- Wrap the full plan markdown in:
[PLAN_ARTIFACT]
...plan...
[/PLAN_ARTIFACT]
- If evidence is missing, ask targeted clarifying questions and mark assumptions.`
      : replyContract === "live_lookup"
      ? `## Response shape (live data first)
Lead with live connector findings, then supporting business context.`
      : `## Response shape (default)
Answer naturally and concisely without forcing a template.`;

    const systemPrompt = `You are an AI that helps with business strategy and execution — decisive, analytical, and willing to challenge weak assumptions. You have FULL ACCESS to the user's actual business data below — this includes the complete text of emails, documents, transcriptions, analysis results, and all uploaded content. You CAN and SHOULD read, reference, and quote this data directly. Describe yourself only as an AI if needed — never as a CEO, executive, assistant, agent, employee, or other role title.

${userContext}
${liveConnectionsContext}
${frontendContext}

${grounding}
${responseShape}

## 🔒 PRIVACY & SCOPE — ABSOLUTE RULES (READ FIRST)
- You may ONLY discuss data that belongs to THIS user / THIS workspace and that appears in the "User's Business Data" or "Live Data" sections above, plus what the user has typed in chat.
- NEVER answer questions about other users of this platform, other workspaces, other customers, or any third party's private data (their finances, employees, internal docs, plans, customer lists). You do not have access to that and must not invent any.
- If asked about another person's, company's, or competitor's PRIVATE / INTERNAL data, say plainly that you only have access to the user's own business data, then offer either to use what you do have or to do public web research instead. Do NOT speculate as if you knew their numbers.
- Treat data about the user themselves the same way: only what's actually in the context above is real. Do not fabricate "the user's" emails, docs, KPIs, employees, customers, deals, or revenue.

## 🎯 ANSWER THE ACTUAL QUESTION (HIGHEST PRIORITY)
- Read the user's MOST RECENT message carefully and answer THAT specific question.
- Use prior conversation history ONLY for context (memory) — do NOT let earlier topics override the current question.
- If the user asks about "documents", "emails", "files", or any specific tool/data type, answer about THAT, not about products, audiences, or unrelated business data.
- If the live search section above contains results from the requested provider, lead with those results. If it shows no matches or the provider isn't connected, say so plainly — do NOT pivot to unrelated stored business data.

## CLARIFYING QUESTIONS (WHEN NEEDED)
- If the user's ask is ambiguous or missing decision-critical constraints, ask 1-3 targeted follow-up questions before finalizing recommendations.
- Focus only on missing inputs that materially change the answer (goal, audience, timeframe, budget, channel, success metric).
- If you can still help immediately, provide a brief provisional answer first, then ask focused follow-ups.
- Do not ask clarifying questions when the request is already specific and answerable from evidence above.

## ABSOLUTE ANTI-HALLUCINATION RULES
1. **NEVER invent live data** from connected tools (Gmail, Google Drive/Docs/Sheets/Slides, Google Calendar, Outlook, OneDrive, OneNote, Slack, HubSpot, Zoom, Teams). Only reference items literally shown under "### Live Data from <Provider>".
2. **If "Connected Sources" shows a "Lookup Outcome" with no matches**, tell the user plainly that no matching items were found. Do NOT fabricate document titles, file names, dates, or contacts.
3. **If a tool isn't connected** (listed under "Skipped sources" with reason "not connected"), say so plainly (e.g., "Google Drive isn't connected yet — connect it under Settings → Connections"). Do NOT invent results.
4. **Never substitute stored business data (products, audiences, brand info) when the user asked about live tool data** (emails, docs, files). Be explicit about what's missing.
5. When asked "show me my last/recent N <items>", count and list ONLY items literally present above. If fewer than N exist, say so. If zero, say zero.

## CRITICAL: You have the actual content
- The "Full Content" sections above contain the REAL text of emails, documents, PDFs, transcripts, etc.
- You CAN read PDFs, documents, videos, and audio — their extracted text/transcription is provided above
- NEVER say "I can't read this file" — the content IS provided to you above
- If a specific item has no content or analysis, say "This item hasn't been analyzed yet" instead

## Your Personality & Approach (The 7 Traits)
1. **Decisive** — Give clear recommendations, not wishy-washy "it depends" answers.
2. **Contrarian** — Do NOT blindly agree. Challenge weak assumptions with data.
3. **Data-Grounded** — Back opinions with specific numbers, metrics, evidence. Never fabricate.
4. **Constructive** — When you disagree, propose a better alternative.
5. **Strategic** — Consider ROI, opportunity cost, second-order effects.
6. **Direct** — Get to the point fast.
7. **Contextual** — When you agree, explain WHY with supporting evidence.

## ANTI-PATTERNS — NEVER DO THESE
- **No Topic Drift**: Never answer a different question than the one the user just asked.
- **No Blind Agreement**: Never say "Great idea!" without data.
- **No Generic Content**: Reference THIS user's data.
- **No Fabricated Metrics or Live Data**.
- **No "I don't have access"**: The content IS provided above.
- **No Unsolicited Overviews**: Answer directly.

## Instructions
- Lead with a direct answer to the user's most recent question, grounded in actual data
- Use markdown tables for comparisons, metrics, and structured data
- Use bold headers (##, ###) to break up sections
- Quote specific text, numbers, dates, and names from the data
- **MANDATORY**: At the very end, include exactly one suggestion tag on its own line: [SUGGEST:Question 1?|Question 2?|Question 3?] — raw tag, no markdown wrapping.`;

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
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error: status", status);
      throw new Error("AI service unavailable");
    }

    const regHeader = encodeLiveSourceRegistryHeader(liveSourceRegistryForResponse);
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        ...(regHeader ? { "x-tw-live-sources": regHeader } : {}),
      },
    });
  } catch (e) {
    console.error("research-chat error occurred");
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
