import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, connectedContexts } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build context string from connected nodes
    let contextBlock = "";
    if (connectedContexts && connectedContexts.length > 0) {
      contextBlock = "\n\n## Connected Data Sources\n\n";
      for (const ctx of connectedContexts) {
        contextBlock += `### ${ctx.label} (${ctx.type})\n`;
        if (ctx.content?.analysis) {
          contextBlock += `**AI Analysis:**\n${ctx.content.analysis}\n\n`;
        }
        if (ctx.content?.text) {
          contextBlock += `**Raw Text:**\n${ctx.content.text}\n\n`;
        }
        if (ctx.content?.extractedText) {
          contextBlock += `**Extracted Content:**\n${ctx.content.extractedText}\n\n`;
        }
        if (ctx.content?.url) {
          contextBlock += `**Source URL:** ${ctx.content.url}\n\n`;
        }
        if (ctx.content?.name) {
          contextBlock += `**Document:** ${ctx.content.name}\n\n`;
        }
        if (ctx.content?.research_summary) {
          contextBlock += `**Business Summary:**\n${JSON.stringify(ctx.content.research_summary, null, 2)}\n\n`;
        }
        if (ctx.content?.findings && Array.isArray(ctx.content.findings)) {
          contextBlock += `**Key Findings:**\n${ctx.content.findings.map((f: any) => `- ${typeof f === "string" ? f : JSON.stringify(f)}`).join("\n")}\n\n`;
        }
      }
    }

    const systemPrompt = `You are a creative content generation assistant. You have access to specific data sources that the user has connected to this generation session.

${contextBlock}

## Instructions
- You generate content, reports, summaries, emails, social media posts, marketing copy, data tables, and any other business content the user requests
- Ground all generated content in the connected data sources above
- Use bold headers, bullet points, and tables for scannability
- Be creative but accurate — always reference the actual data when generating content
- If the user asks for something that requires data not in the connected sources, note what's missing
- Format output in clean markdown ready to copy-paste
- After each response, suggest 3 follow-up generation ideas, formatted as: [SUGGEST:Idea 1|Idea 2|Idea 3]

When generating content, be specific and use real numbers, names, and details from the connected data sources.`;

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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    console.error("action-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
