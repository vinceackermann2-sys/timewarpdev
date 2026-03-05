import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchUserBusinessContext(userId: string): Promise<string> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Try bucket context first
  const bucketPath = `${userId}/context.json`;
  const { data: fileData } = await supabase.storage
    .from("business-data")
    .download(bucketPath);

  if (fileData) {
    try {
      const text = await fileData.text();
      const contextObj = JSON.parse(text);
      if (contextObj.items && contextObj.items.length > 0) {
        return formatContextItems(contextObj.items);
      }
    } catch { /* fall through */ }
  }

  // Fallback: DB query — fetch ALL user data
  const { data: bizData } = await supabase
    .from("user_business_data")
    .select("data_type, source, title, content, analyzed_content, metadata, is_analyzed")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (bizData && bizData.length > 0) {
    return formatContextItems(bizData);
  }

  return "";
}

function formatContextItems(items: any[]): string {
  let context = "\n\n## User's Business Data\n\n";
  const bySource: Record<string, any[]> = {};
  for (const item of items) {
    const src = item.source || "unknown";
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(item);
  }
  for (const [source, sourceItems] of Object.entries(bySource)) {
    context += `### Source: ${source} (${sourceItems.length} items)\n`;
    for (const item of sourceItems) {
      context += `- **${item.title}** (${item.data_type})\n`;
      if (item.analyzed_content) {
        context += `  **Full Analysis:**\n${item.analyzed_content}\n\n`;
      }
      if (item.content) {
        context += `  **Full Content:**\n${item.content}\n\n`;
      }
      if (item.metadata) {
        const meta = typeof item.metadata === "string" ? item.metadata : JSON.stringify(item.metadata);
        context += `  Metadata: ${meta.slice(0, 500)}\n`;
      }
    }
    context += "\n";
  }
  return context;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    const { messages, connectedContexts } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch user's stored business data server-side
    let userContext = "";
    if (authHeader) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userContext = await fetchUserBusinessContext(user.id);
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

    const systemPrompt = `You are a creative content generation assistant. You have FULL ACCESS to the user's actual business data below — this includes the complete text of emails, documents, transcriptions, analysis results, and all uploaded content. You CAN and SHOULD read, reference, and quote this data directly.

${userContext}
${frontendContext}

## CRITICAL: You have the actual content
- The "Full Content" sections above contain the REAL text of emails, documents, PDFs, transcripts, etc.
- You CAN read PDFs, documents, videos, and audio — their extracted text/transcription is provided above under "Full Content" or "Full Analysis"
- NEVER say "I can't read this file" or "I don't have access to the content" — the content IS provided to you above
- If a specific item has no content or analysis, say "This item hasn't been analyzed yet" instead

## Instructions
- Generate content, reports, summaries, emails, social media posts, marketing copy, data tables, and any other business content
- Ground all generated content in the user's actual business data above
- Quote specific text, numbers, dates from the data when generating
- Use bold headers, bullet points, and tables for scannability
- Be creative but accurate — always reference the actual data when generating content
- If data is missing for a request, note what's needed
- Format output in clean markdown ready to copy-paste
- After each response, suggest 3 follow-up generation ideas formatted as: [SUGGEST:Idea 1|Idea 2|Idea 3]

When generating content, use real numbers, names, and details from the business data sources.`;

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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("action-chat error occurred");
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
