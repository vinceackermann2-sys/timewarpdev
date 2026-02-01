import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, dataSources, dataContext, researchData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build rich context from actual research data
    let businessContext = "";
    if (researchData) {
      const summary = researchData.research_summary || {};
      const findings = researchData.findings || [];
      const rawData = researchData.raw_data || {};

      businessContext = `
## User's Business Research Data

### Analysis Summary
${summary.summary || "No summary available"}

### Key Findings (${findings.length} total)
${findings.slice(0, 10).map((f: any, i: number) => 
  `${i + 1}. [${f.impact?.toUpperCase() || 'INFO'}] ${f.category}: ${f.finding}`
).join('\n')}

### Data Analyzed
- Emails: ${researchData.emails_analyzed || 0}
- Documents: ${researchData.documents_analyzed || 0}
- Calendar Events: ${researchData.events_analyzed || 0}
- Spreadsheets: ${researchData.sheets_analyzed || 0}

### Recommendations
${(summary.recommendations || []).slice(0, 5).map((r: any, i: number) => 
  `${i + 1}. [${r.priority?.toUpperCase()}] ${r.title}: ${r.description}`
).join('\n')}

### Raw Email Insights
${rawData.emails?.slice(0, 5).map((e: any) => `- "${e.subject}" from ${e.from}`).join('\n') || 'No email data'}

### Calendar Context
${rawData.calendarEvents?.slice(0, 5).map((e: any) => `- ${e.summary} (${e.start})`).join('\n') || 'No calendar data'}
`;
    }

    // Build system prompt based on connected data sources
    const systemPrompt = `You are a research assistant analyzing business data. You help users understand and extract insights from their connected data sources.

${dataContext ? `Connected data sources:\n${dataContext}\n` : ""}
${businessContext}

Guidelines:
- Reference specific findings, emails, events, or recommendations when answering
- Provide clear, concise answers grounded in the actual data
- If asked about data you don't have, explain what's available
- Suggest relevant follow-up questions to help users explore their data
- Use bullet points and structured formatting for clarity`;

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
