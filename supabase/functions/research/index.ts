import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getSystemPrompt = (role: string, mode: string) => {
  const roleContexts: Record<string, string> = {
    ceo: `You are an AI CEO advisor analyzing a company's overall business health. Focus on:
- Strategic direction and vision alignment
- Organizational efficiency and team performance
- Revenue growth opportunities and cost optimization
- Competitive positioning and market trends
- Key business risks and mitigation strategies`,
    cmo: `You are an AI CMO advisor analyzing a company's marketing and brand performance. Focus on:
- Brand awareness and market positioning
- Marketing campaign effectiveness and ROI
- Customer acquisition costs and conversion rates
- Content strategy and social media performance
- Customer sentiment and brand reputation`,
    cfo: `You are an AI CFO advisor analyzing a company's financial health. Focus on:
- Cash flow management and runway
- Revenue streams and profit margins
- Expense optimization opportunities
- Financial forecasting and budgeting
- Investment and funding strategies`,
  };

  const modeInstructions = mode === "research" 
    ? "Your task is to conduct a thorough analysis and identify areas for improvement."
    : "Your task is to identify quick wins and actionable items that can be implemented immediately.";

  return `${roleContexts[role] || roleContexts.ceo}

${modeInstructions}

You are simulating an analysis of a company's Google Workspace data (emails, documents, spreadsheets, calendar).

Generate a realistic, detailed business analysis with specific insights. Be creative but realistic.
Include specific metrics, percentages, and actionable recommendations.

Format your response as JSON with this structure:
{
  "summary": "Brief executive summary (2-3 sentences)",
  "keyFindings": [
    {
      "category": "Category name",
      "finding": "Specific finding",
      "impact": "high" | "medium" | "low",
      "details": "More context about this finding"
    }
  ],
  "recommendations": [
    {
      "title": "Recommendation title",
      "description": "Detailed description",
      "priority": "urgent" | "high" | "medium" | "low",
      "estimatedImpact": "Expected outcome",
      "effort": "low" | "medium" | "high"
    }
  ],
  "metrics": {
    "areasAnalyzed": number,
    "issuesFound": number,
    "opportunitiesIdentified": number,
    "estimatedSavings": "dollar amount or percentage"
  }
}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { role, mode } = await req.json();

    if (!role || !mode) {
      return new Response(
        JSON.stringify({ error: "Role and mode are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Starting research analysis for role: ${role}, mode: ${mode}`);

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
            { role: "system", content: getSystemPrompt(role, mode) },
            { 
              role: "user", 
              content: `Analyze my company's Google Workspace data and provide insights for my role as ${role.toUpperCase()}. I'm in ${mode} mode.

Simulate finding patterns in:
- Email communications (response times, important threads, overdue follow-ups)
- Documents (outdated docs, collaboration patterns, knowledge gaps)
- Spreadsheets (budget tracking, sales data, operational metrics)
- Calendar (meeting efficiency, scheduling patterns, time allocation)

Provide 4-6 key findings and 3-5 prioritized recommendations.` 
            },
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
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Streaming research response");

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Research function error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
