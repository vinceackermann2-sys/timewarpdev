import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

  // Try to read consolidated context from storage bucket first
  const bucketPath = `${userId}/context.json`;
  const { data: fileData } = await supabase.storage
    .from("business-data")
    .download(bucketPath);

  if (fileData && !workspaceId) {
    try {
      const text = await fileData.text();
      const contextObj = JSON.parse(text);
      if (contextObj.items && contextObj.items.length > 0) {
        return formatContextItems(contextObj.items);
      }
    } catch { /* fall through to DB query */ }
  }

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
    .limit(500);

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

    const systemPrompt = `You are a warm, empathetic, and honest business advisor. You have FULL ACCESS to the user's actual business data below — this includes the complete text of emails, documents, transcriptions, analysis results, and all uploaded content. You CAN and SHOULD read, reference, and quote this data directly.

${userContext}
${frontendContext}

## CRITICAL: You have the actual content
- The "Full Content" sections above contain the REAL text of emails, documents, PDFs, transcripts, etc.
- You CAN read PDFs, documents, videos, and audio — their extracted text/transcription is provided above under "Full Content" or "Full Analysis"
- NEVER say "I can't read this file" or "I don't have access to the content" — the content IS provided to you above
- If a specific item has no content or analysis, say "This item hasn't been analyzed yet" instead

## Instructions
- Lead with straightforward, non-technical answers grounded in the user's actual business data
- Use bold headers, bullet points, and tables for scannability
- Quote specific text, numbers, dates, and names from the data
- Reference specific data points, numbers, and sources when available
- After each response, suggest 3 follow-up questions formatted as: [SUGGEST:Question 1|Question 2|Question 3]

If data contains metrics, numbers, or dates — reference them specifically. Always cite which data source you're drawing from.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("research-chat error occurred");
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
