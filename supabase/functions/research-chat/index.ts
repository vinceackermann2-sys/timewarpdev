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

  // Try to read consolidated context from storage bucket first
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
    } catch { /* fall through to DB query */ }
  }

  // Fallback: query DB directly — fetch ALL user data
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

  // Group by source
  const bySource: Record<string, any[]> = {};
  for (const item of items) {
    const src = item.source || "unknown";
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(item);
  }

  for (const [source, sourceItems] of Object.entries(bySource)) {
    context += `### Source: ${source} (${sourceItems.length} items)\n`;
    for (const item of sourceItems) {
      context += `- **${item.title}** (${item.data_type})`;
      if (item.analyzed_content) {
        context += `\n  Analysis: ${item.analyzed_content.slice(0, 2000)}`;
      } else if (item.content) {
        context += `\n  Content: ${item.content.slice(0, 1500)}`;
      }
      if (item.metadata) {
        const meta = typeof item.metadata === "string" ? item.metadata : JSON.stringify(item.metadata);
        context += `\n  Metadata: ${meta.slice(0, 300)}`;
      }
      context += "\n";
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

    // Get user ID from auth token
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

    // Also include any frontend-passed contexts
    let frontendContext = "";
    if (connectedContexts && connectedContexts.length > 0) {
      frontendContext = "\n\n## Additional Connected Data\n\n";
      for (const ctx of connectedContexts) {
        frontendContext += `### ${ctx.label} (${ctx.type})\n`;
        if (ctx.content?.analysis) frontendContext += `**AI Analysis:**\n${ctx.content.analysis}\n\n`;
        if (ctx.content?.text) frontendContext += `**Raw Text:**\n${ctx.content.text}\n\n`;
        if (ctx.content?.extractedText) frontendContext += `**Extracted Content:**\n${ctx.content.extractedText}\n\n`;
        if (ctx.content?.url) frontendContext += `**Source URL:** ${ctx.content.url}\n\n`;
        if (ctx.content?.name) frontendContext += `**Document:** ${ctx.content.name}\n\n`;
        if (ctx.content?.items) frontendContext += `**Data:** ${JSON.stringify(ctx.content.items?.slice(0, 20))}\n\n`;
      }
    }

    const systemPrompt = `You are a warm, empathetic, and honest business advisor. You have access to the user's stored business data from their connected integrations and uploads.

${userContext}
${frontendContext}

## Instructions
- Lead with straightforward, non-technical answers grounded in the user's actual business data
- Use bold headers, bullet points, and tables for scannability
- Be transparent if the data doesn't contain enough information to fully answer a question
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
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway returned ${status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("research-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
