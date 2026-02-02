import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConnectedContext {
  type: string;
  label: string;
  content: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, connectedContexts } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context from all connected nodes
    let fullContext = "";
    const contextSources: string[] = [];

    for (const ctx of (connectedContexts || []) as ConnectedContext[]) {
      contextSources.push(`${ctx.label} (${ctx.type})`);

      switch (ctx.type) {
        case "business-db": {
          const data = ctx.content;
          const summary = data.research_summary || {};
          const findings = data.findings || [];
          const rawData = data.raw_data || {};

          fullContext += `
## Business Database: ${ctx.label}

### Analysis Summary
${summary.summary || summary.overallHealth || "No summary available"}

### Key Findings (${findings.length} total)
${findings.slice(0, 10).map((f: any, i: number) => 
  `${i + 1}. [${f.impact?.toUpperCase() || f.priority?.toUpperCase() || 'INFO'}] ${f.category || f.issue?.category || 'General'}: ${f.finding || f.issue?.title || JSON.stringify(f)}`
).join('\n') || 'No findings yet'}

### Data Analyzed
- Emails: ${data.emails_analyzed || 0}
- Documents: ${data.documents_analyzed || 0}
- Calendar Events: ${data.events_analyzed || 0}

### Top Contacts
${rawData.topContacts?.slice(0, 5).map((c: any) => `- ${c.email} (${c.count} interactions)`).join('\n') || 'No contact data'}

### Recent Emails
${rawData.emailSummaries?.slice(0, 10).map((e: any) => `- "${e.subject}" from ${e.from}${e.snippet ? ': ' + e.snippet.slice(0, 100) : ''}`).join('\n') || rawData.emails?.slice(0, 10).map((e: any) => `- "${e.subject}" from ${e.from}`).join('\n') || 'No email data'}

### Upcoming Events
${rawData.calendarEvents?.slice(0, 10).map((e: any) => `- ${e.summary} (${e.start?.dateTime || e.start})`).join('\n') || 'No calendar data'}

### Documents
${rawData.documents?.slice(0, 10).map((d: any) => `- ${d.name || d.title}`).join('\n') || 'No document data'}

### Recommendations
${(summary.recommendations || []).slice(0, 5).map((r: any, i: number) => 
  `${i + 1}. [${r.priority?.toUpperCase() || 'MEDIUM'}] ${r.title}: ${r.description}`
).join('\n') || 'No recommendations yet'}

`;
          break;
        }

        case "text": {
          fullContext += `
## Text Content: ${ctx.label}

${ctx.content.text}

`;
          break;
        }

        case "document": {
          fullContext += `
## Document: ${ctx.label}

Document Name: ${ctx.content.name || "Unknown"}
${ctx.content.url ? `URL: ${ctx.content.url}` : ""}

(Analyze this document based on its name and any available metadata. The user may ask questions about its contents.)

`;
          break;
        }

        case "image": {
          fullContext += `
## Image: ${ctx.label}

Image URL: ${ctx.content.url}

(The user has connected an image. Analyze any visible content or answer questions about what might be in this image based on context.)

`;
          break;
        }

        case "website": {
          fullContext += `
## Website: ${ctx.label}

URL: ${ctx.content.url}
${ctx.content.title ? `Title: ${ctx.content.title}` : ""}

(Research and analyze this website. Answer questions about the website's content, purpose, or any relevant information.)

`;
          break;
        }
      }
    }

    // Build system prompt
    const systemPrompt = `You are a research assistant that analyzes connected data sources. You help users understand and extract insights from their data.

## Connected Data Sources
${contextSources.length > 0 ? contextSources.map(s => `- ${s}`).join('\n') : 'No data sources connected'}

${fullContext}

## Guidelines
- Reference specific data, emails, events, documents, or findings when answering
- Provide clear, concise answers grounded in the actual connected data
- If asked about data you don't have access to, explain what sources are connected
- Suggest relevant follow-up questions to help users explore their data
- For images and websites, describe what you can infer from the URL/metadata
- Use bullet points and structured formatting for clarity`;

    console.log("Research chat context sources:", contextSources);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Research chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
