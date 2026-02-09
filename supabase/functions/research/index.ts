import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const getSystemPrompt = (role: string, mode: string) => {
  const roleContexts: Record<string, string> = {
    ceo: `You are an AI CEO advisor. Focus on:
- Strategic direction, vision alignment, competitive positioning
- Organizational efficiency, cross-department performance
- Revenue growth opportunities, cost optimization, key risks`,
    cmo: `You are an AI CMO advisor. Focus on:
- Brand awareness, marketing campaigns, content strategy
- Customer acquisition costs, conversion rates, social media
- Customer sentiment, market positioning, brand reputation`,
    cfo: `You are an AI CFO advisor. Focus on:
- Cash flow management, runway, revenue streams, profit margins
- Expense optimization, financial forecasting, budgeting
- Investment and funding strategies`,
    coo: `You are an AI COO advisor. Focus on:
- Daily workflow efficiency, process bottlenecks
- Meeting patterns, time allocation, scheduling optimization
- Team collaboration, task completion, operational KPIs`,
    cto: `You are an AI CTO advisor. Focus on:
- Technical infrastructure, tool usage, system integrations
- Automation opportunities, technical debt indicators
- Platform adoption, security patterns, dev workflow efficiency`,
    chr: `You are an AI CHR (Chief HR) advisor. Focus on:
- Team communication patterns, employee engagement signals
- Hiring/onboarding indicators, workload distribution
- Culture health, collaboration patterns, people analytics`,
  };

  const modeInstructions = mode === "research" 
    ? "Your task is to conduct a thorough analysis and identify areas for improvement."
    : "Your task is to identify quick wins and actionable items that can be implemented immediately.";

  return `${roleContexts[role] || roleContexts.ceo}

${modeInstructions}

You are analyzing a company's Google Workspace data (emails, documents, spreadsheets, calendar).

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
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("JWT validation failed:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);

    const { role, mode, workspaceData } = await req.json();

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

    console.log(`Starting research analysis for user: ${userId}, role: ${role}, mode: ${mode}`);
    console.log(`Workspace data provided: ${workspaceData ? 'yes' : 'no'}`);

    // Build the user prompt based on whether we have real workspace data
    let userPrompt: string;
    if (workspaceData) {
      const emailCount = workspaceData.emails?.length || 0;
      const docCount = workspaceData.documents?.length || 0;
      const sheetCount = workspaceData.spreadsheets?.length || 0;
      const eventCount = workspaceData.calendarEvents?.length || 0;

      userPrompt = `Analyze my company's Google Workspace data and provide insights for my role as ${role.toUpperCase()}. I'm in ${mode} mode.

Here is the REAL data from my Google Workspace:

## Emails (${emailCount} recent messages):
${workspaceData.emails?.slice(0, 15).map((e: any) => `- Subject: "${e.subject}" | From: ${e.from} | Labels: ${e.labelIds?.join(', ') || 'none'}`).join('\n') || 'No emails found'}

## Documents (${docCount} files):
${workspaceData.documents?.slice(0, 15).map((d: any) => `- "${d.name}" | Modified: ${d.modifiedTime} | Shared: ${d.shared}`).join('\n') || 'No documents found'}

## Spreadsheets (${sheetCount} files):
${workspaceData.spreadsheets?.slice(0, 10).map((s: any) => `- "${s.name}" | Modified: ${s.modifiedTime}`).join('\n') || 'No spreadsheets found'}

## Calendar Events (${eventCount} upcoming):
${workspaceData.calendarEvents?.slice(0, 15).map((e: any) => `- "${e.summary}" | ${e.start} | Attendees: ${e.attendees} | Has video: ${e.hasConferencing}`).join('\n') || 'No events found'}

Based on this real data, identify patterns and provide 4-6 key findings and 3-5 prioritized recommendations.`;
    } else {
      userPrompt = `Analyze my company's Google Workspace data and provide insights for my role as ${role.toUpperCase()}. I'm in ${mode} mode.

Simulate finding patterns in:
- Email communications (response times, important threads, overdue follow-ups)
- Documents (outdated docs, collaboration patterns, knowledge gaps)
- Spreadsheets (budget tracking, sales data, operational metrics)
- Calendar (meeting efficiency, scheduling patterns, time allocation)

Provide 4-6 key findings and 3-5 prioritized recommendations.`;
    }

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
            { role: "user", content: userPrompt },
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

    console.log("Streaming research response for user:", userId);

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
