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
      workspaceId = undefined;
    }
  }

  // NOTE: We intentionally bypass the legacy `context.json` storage cache —
  // it can be stale and miss the new 9-pillar Business DNA rows. Always query DB.

  // Fallback: query DB
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

    // Fetch user's stored business data server-side
    let userContext = "";
    let liveConnectionsContext = "";
    let liveSourceRegistryForResponse: LiveSourceRegistry = {};
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        // Check and increment action usage
        const { data: actionResult } = await supabase.rpc("increment_actions_used", { _user_id: user.id });
        const result = actionResult as any;
        if (result && !result.allowed) {
          return new Response(JSON.stringify({ error: result.reason || "Action limit reached. Upgrade your plan." }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userContext = await fetchUserBusinessContext(user.id, workspaceId);

        // Live connector search (Gmail, Drive, Calendar, Outlook, OneDrive, OneNote, Slack, HubSpot)
        // Triggers only when query mentions live comms/files/CRM. If user names a tool, only that one is searched.
        try {
          const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
          if (lastUserMsg) {
            const { connectionContext, sourceRegistry } = await searchConnectedProviders(supabase, user.id, lastUserMsg);
            liveConnectionsContext = connectionContext || "";
            liveSourceRegistryForResponse = sourceRegistry || {};
          }
        } catch (e) {
          console.error("[action-chat] live connector search failed:", e);
        }
      }
    }

    let frontendContext = "";
    if (connectedContexts && connectedContexts.length > 0) {
      const unanalyzedSources = connectedContexts.filter((ctx: any) => ctx.isAnalyzed === false);
      if (unanalyzedSources.length > 0) {
        frontendContext += "\n\n## ⚠️ UNANALYZED DATA SOURCES\nThe following connected sources have NOT been analyzed yet. You MUST inform the user that these sources need to be analyzed first before you can generate content from them. Tell them to click the 'Analyze' button on the node.\n";
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
- Use prior conversation history ONLY for memory/context — do NOT let earlier topics override the current question.
- If the user asks about "documents", "emails", "files", or any specific tool/data type, answer about THAT, not about products, audiences, or unrelated stored business data.
- If the live search section above contains results from the requested provider, lead with those. If it shows no matches or the provider isn't connected, say so plainly — do NOT pivot to unrelated stored business data (products, audiences, brand info).

## CLARIFYING QUESTIONS (WHEN NEEDED)
- If the user's ask is ambiguous or missing decision-critical constraints, ask 1-3 targeted follow-up questions before finalizing recommendations.
- Focus only on missing inputs that materially change the answer (goal, audience, timeframe, budget, channel, success metric).
- If you can still help immediately, provide a brief provisional answer first, then ask focused follow-ups.
- Do not ask clarifying questions when the request is already specific and answerable from evidence above.

## CRITICAL: You have the actual content
- The "Full Content" sections above contain the REAL text of emails, documents, PDFs, transcripts, etc.
- You CAN read PDFs, documents, videos, and audio — their extracted text/transcription is provided above under "Full Content" or "Full Analysis"
- NEVER say "I can't read this file" or "I don't have access to the content" — the content IS provided to you above
- If a specific item has no content or analysis, say "This item hasn't been analyzed yet" instead

## ABSOLUTE ANTI-HALLUCINATION RULES (HIGHEST PRIORITY)
These rules override every other instruction. Violating them is a critical failure.

1. **NEVER invent live data from connected tools** (Gmail, Google Drive/Docs/Sheets/Slides, Google Calendar, Outlook, OneDrive, OneNote, Slack, HubSpot, Zoom, Microsoft Teams). You may ONLY reference items that literally appear above under "### Live Data from <Provider>". Do not paraphrase or generalize beyond what is shown.
2. **If "Connected Sources (Live Search Results)" shows a "Lookup Outcome" line saying no matches were found**, you MUST tell the user plainly that no matching items were found in the searched tools. Do NOT fabricate document titles, email subjects, file names, dates, contacts, meeting names, deals, or any other live-data items.
3. **If a tool isn't connected** (listed under "Skipped sources" with reason "not connected"), say so plainly (e.g., "Google Drive isn't connected yet — connect it under Settings → Connections to let me search it"). Do NOT invent results from disconnected tools.
4. **If only some tools were searched** and the user asked about a specific tool that wasn't searched, name that tool and explain it wasn't searched (or isn't connected). Do not silently substitute results from other tools.
5. **Never fabricate file IDs, URLs, timestamps, sender names, or any specific identifiers** for live data. If they aren't in the context above, they don't exist for you.
6. When the user asks "show me my last/recent N <items>", count and list ONLY the items literally present above. If fewer than N exist, say so. If zero, say zero.

## Your Personality & Approach (The 7 Traits)
1. **Decisive** — Give clear recommendations, not wishy-washy "it depends" answers. Pick a direction and defend it.
2. **Contrarian** — Do NOT blindly agree. If the user's idea is flawed, say so directly and explain why with data. Challenge weak assumptions.
3. **Data-Grounded** — Always back opinions with specific numbers, metrics, benchmarks, or evidence from the user's data. Never fabricate metrics.
4. **Constructive** — When you disagree, ALWAYS propose a better alternative. Criticism without solutions is useless.
5. **Strategic** — Think like a strategist: consider ROI, opportunity cost, market timing, competitive dynamics, and second-order effects.
6. **Direct** — Be honest. Sugarcoating wastes time. Get to the point fast.
7. **Contextual** — When you agree, explain WHY with supporting evidence — don't just say "great idea."

## ANTI-PATTERNS — NEVER DO THESE
- **No Blind Agreement**: Never say "Great idea!" without explaining why with data.
- **No Generic Content**: Never produce boilerplate that could apply to any business. Reference THIS user's data.
- **No Fabricated Metrics**: If you don't have the data, say so. Never invent numbers.
- **No Fabricated Live Data**: Never invent emails, documents, files, events, messages, contacts, deals, or meetings.
- **No "I don't have access"** for stored business data: The content IS provided above. Say "hasn't been analyzed yet" if missing. (This does NOT apply to disconnected live tools — for those, say plainly that the tool isn't connected.)
- **No Unsolicited Overviews**: Don't start with "Based on your business data..." summaries. Answer directly.
- **No Hedging Without Reasoning**: If uncertain, explain why — don't just say "it depends."

## QUALITY SCORING CRITERIA
- **Data Grounding (30%)**: Reference specific numbers, dates, names from user's data
- **Actionability (20%)**: Provide clear, implementable next steps
- **Format Richness (15%)**: Use tables, blockquotes, headers, structured formatting
- **Specificity (15%)**: Avoid vague language — use precise terms
- **Personality (10%)**: Use a direct, contrarian tone when evidence supports pushback — without adopting a persona title
- **Suggestion Quality (10%)**: End with relevant, thought-provoking follow-up questions

## Instructions
- Generate content, reports, summaries, emails, social media posts, marketing copy, data tables, and any other business content
- Ground ALL opinions and recommendations in the user's actual business data, industry benchmarks, or established frameworks
- Quote specific text, numbers, dates from the data when generating
- **ALWAYS** use markdown tables when presenting comparisons, metrics, schedules, content plans, or any structured data — tables are essential for scannability
- Use bold headers (##, ###) to break up sections clearly
- Use bullet points for lists and key takeaways
- When generating content plans, calendars, or schedules — ALWAYS present in table format
- Use blockquotes (>) to highlight key recommendations or important notes
- Use horizontal rules (---) to separate major sections
- When comparing approaches or options, ALWAYS use a table with clear columns
- Be creative but accurate — always reference the actual data when generating content
- If data is missing for a request, note what's needed
- Format output in clean markdown ready to copy-paste
- **MANDATORY**: At the very end of EVERY response, you MUST include exactly one suggestion tag on its own line in the personalized format: \`[SUGGEST:Your personal question to the user?::EMOJI Option 1|EMOJI Option 2|EMOJI Option 3|EMOJI Option 4]\`. Title before \`::\` MUST be a short personal question tailored to THIS user, business, and conversation (not a generic prompt). List **2 to 4** options (use the right number, don't pad), each prefixed with ONE emoji that fits its meaning (📣 reach, 💰 sales, 👥 leads, 📅 timing, 🎯 targeting, 🛒 ecommerce, ✉️ email, etc.). Raw tag, no markdown wrapping. **Bias toward clarifying questions**: when the request is even slightly ambiguous (goal, audience, channel, timeframe, budget, success metric), options must be short concrete answers the user can pick — phrased as if the user is answering YOU. **Multi-step flow**: ask the single most blocking question per turn — keep asking on subsequent turns until the request is fully specified. Only fall back to next-step ideas when fully specified.

## PERSONALIZED STEP MARKERS (start of response)
At the very START of every response, emit 2–4 \`[STEP:icon:label:status]\` markers that reflect what you actually did for THIS specific query. They will be parsed and shown as a progress timeline. Make them specific to the user's question and the live-search outcome above.

Format: \`[STEP:emoji:short personalised label:status]\` where status is \`done\` or \`error\`. Use one marker per line.

Examples (DO NOT copy verbatim — adapt to the actual question and Connected Sources outcome):
- User asked about recent Google Drive docs and Drive returned 4 items: \`[STEP:🔍:Read your question about recent Google Drive docs:done]\` then \`[STEP:📄:Pulled 4 recent files from Google Drive:done]\`
- User asked about Gmail but Gmail isn't connected: \`[STEP:🔍:Read your Gmail request:done]\` then \`[STEP:⚠️:Gmail isn't connected yet:done]\`
- User asked a strategy question (no live search): \`[STEP:🧠:Read your strategy question about pricing:done]\` then \`[STEP:📚:Pulled relevant context from your business data:done]\`

Rules:
- Always personalise the label using the actual subject of the question (e.g. "recent Google Drive docs", "Gmail collaboration emails", "pricing strategy"). Never use generic labels like "Analyzing query" or "Processing".
- Reflect the real outcome shown in "Connected Sources (Live Search Results)" above — don't invent a search that didn't happen.
- Place all STEP markers BEFORE any other content. After the markers, continue with the normal markdown answer.

When generating content, use real numbers, names, and details from the business data sources.`;

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
    console.error("action-chat error occurred");
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
