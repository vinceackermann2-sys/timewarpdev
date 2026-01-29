import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSystemPrompt(research: any): string {
  const basePrompt = `You are TimeWarp AI, an intelligent business assistant that helps entrepreneurs and business owners manage their digital life. You are professional, concise, and action-oriented.

Your capabilities:
- Analyzing business data and providing insights
- Answering questions about emails, documents, schedules, and contacts
- Providing strategic business advice based on real data
- Helping with task prioritization and time management

Guidelines:
- Be concise but thorough in your responses
- When suggesting actions, explain your reasoning
- Base your answers on the ACTUAL business data provided below
- Maintain a professional yet approachable tone
- Focus on actionable insights rather than generic advice`;

  if (!research) {
    return basePrompt + `

Note: No business data has been researched yet. I can answer general business questions, but for personalized insights, please run the research analysis first by going through the quiz on the landing page.`;
  }

  // Build context from research data
  const summary = research.summary || {};
  const rawData = research.rawData || {};
  const findings = research.findings || [];

  let context = `

=== YOUR BUSINESS DATA (Last analyzed: ${summary.analyzedAt || 'Recently'}) ===

OVERVIEW:
- ${summary.emailsAnalyzed || 0} emails analyzed
- ${summary.eventsAnalyzed || 0} calendar events
- ${summary.documentsAnalyzed || 0} documents
- ${summary.sheetsAnalyzed || 0} spreadsheets
- ${summary.slidesAnalyzed || 0} presentations`;

  // Add top contacts
  if (rawData.topContacts?.length > 0) {
    context += `

TOP EMAIL CONTACTS:
${rawData.topContacts.slice(0, 15).map((c: any) => `- ${c.email}: ${c.count} emails`).join('\n')}`;
  }

  // Add recent emails summary
  if (rawData.emailSummaries?.length > 0) {
    context += `

RECENT EMAIL THREADS:
${rawData.emailSummaries.slice(0, 25).map((e: any) => `- From: ${e.from} | Subject: "${e.subject}" | ${e.snippet?.slice(0, 100) || ''}`).join('\n')}`;
  }

  // Add calendar events
  if (rawData.calendarEvents?.length > 0) {
    context += `

UPCOMING CALENDAR EVENTS:
${rawData.calendarEvents.slice(0, 20).map((e: any) => {
      const startDate = e.start?.dateTime || e.start?.date || 'TBD';
      return `- ${e.summary || 'Untitled'} | ${startDate} | ${e.attendees || 0} attendees`;
    }).join('\n')}`;
  }

  // Add documents
  if (rawData.documents?.length > 0) {
    context += `

RECENT DOCUMENTS:
${rawData.documents.slice(0, 15).map((d: any) => `- ${d.name} (modified: ${d.modifiedTime?.split('T')[0] || 'unknown'})`).join('\n')}`;
  }

  // Add spreadsheets with sample data
  if (rawData.sheets?.length > 0) {
    context += `

SPREADSHEETS:
${rawData.sheets.slice(0, 5).map((s: any) => {
      let sheetInfo = `- ${s.name || s.title}`;
      if (s.sampleData) {
        for (const [tabName, tabData] of Object.entries(s.sampleData || {})) {
          const data = tabData as any;
          if (data?.headers) {
            sheetInfo += `\n  Tab "${tabName}": Headers: ${data.headers.slice(0, 5).join(', ')} (${data.rowCount} rows)`;
          }
        }
      }
      return sheetInfo;
    }).join('\n')}`;
  }

  // Add presentations
  if (rawData.slides?.length > 0) {
    context += `

PRESENTATIONS:
${rawData.slides.slice(0, 5).map((s: any) => `- ${s.name || s.title} (${s.slideCount} slides)`).join('\n')}`;
  }

  // Add analyzed images if any
  if (rawData.analyzedImages?.length > 0) {
    context += `

ANALYZED IMAGES:
${rawData.analyzedImages.slice(0, 5).map((i: any) => `- ${i.filename || i.name}: ${i.analysis?.slice(0, 80) || 'analyzed'}`).join('\n')}`;
  }

  // Add previous findings
  if (findings.length > 0) {
    context += `

PREVIOUS ANALYSIS FINDINGS:
${findings.map((f: any) => `- Issue: ${f.issue?.title || 'N/A'} | Recommendation: ${f.improvement?.title || 'N/A'}`).join('\n')}`;
  }

  context += `

=== END OF BUSINESS DATA ===

Use this real business data to answer questions. Reference specific emails, contacts, events, or documents when relevant. If asked about something not in the data, acknowledge the limitation.`;

  return basePrompt + context;
}

serve(async (req) => {
  // Handle CORS preflight requests
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
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
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

    // Fetch stored research data from storage bucket using service role
    const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    let research = null;
    try {
      const { data, error } = await supabaseServiceRole.storage
        .from('business-data')
        .download(`${userId}/research.json`);
      
      if (!error && data) {
        const text = await data.text();
        research = JSON.parse(text);
        console.log("Loaded research from bucket:", research?.summary?.emailsAnalyzed || 0, "emails");
      } else {
        console.log("No research data in bucket:", error?.message);
      }
    } catch (e) {
      console.log("Error fetching research from bucket:", e);
    }

    // Build system prompt with research context
    const systemPrompt = buildSystemPrompt(research);

    console.log("Calling AI gateway with", messages.length, "messages for user:", userId);

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
          JSON.stringify({
            error: "Rate limit exceeded. Please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Usage limit reached. Please contact support.",
          }),
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

    console.log("Streaming response from AI gateway for user:", userId);

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat function error:", error);
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
