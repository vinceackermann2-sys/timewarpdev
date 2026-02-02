import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.1";

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

    // Get user session for workspace access
    const authHeader = req.headers.get("Authorization");
    let userEmail = "user";
    let hasWorkspaceAccess = false;

    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user?.email) {
        userEmail = user.email;
        
        // Check if user has Google Workspace connected
        const { data: connection } = await supabase
          .from("google_workspace_connections")
          .select("connected")
          .eq("user_id", user.id)
          .single();
        
        hasWorkspaceAccess = connection?.connected || false;
      }
    }

    // Build context from connected nodes
    let fullContext = "";
    const contextSources: string[] = [];

    for (const ctx of (connectedContexts || []) as ConnectedContext[]) {
      contextSources.push(`${ctx.label} (${ctx.type})`);

      switch (ctx.type) {
        case "business-db": {
          const data = ctx.content;
          const rawData = data.raw_data || {};

          fullContext += `
## Business Database: ${ctx.label}

### Recent Emails (for replying/drafting)
${rawData.emailSummaries?.slice(0, 20).map((e: any) => 
  `- From: ${e.from}, Subject: "${e.subject}", Snippet: ${e.snippet?.slice(0, 200) || 'No preview'}`
).join('\n') || rawData.emails?.slice(0, 20).map((e: any) => 
  `- From: ${e.from}, Subject: "${e.subject}"`
).join('\n') || 'No email data'}

### Upcoming Events (for scheduling)
${rawData.calendarEvents?.slice(0, 15).map((e: any) => 
  `- ${e.summary} at ${e.start?.dateTime || e.start}`
).join('\n') || 'No calendar data'}

### Documents (for reference)
${rawData.documents?.slice(0, 15).map((d: any) => 
  `- ${d.name || d.title}`
).join('\n') || 'No document data'}

### Top Contacts
${rawData.topContacts?.slice(0, 10).map((c: any) => 
  `- ${c.email} (${c.count} interactions)`
).join('\n') || 'No contact data'}

`;
          break;
        }

        case "text": {
          fullContext += `
## Text Content: ${ctx.label}
${ctx.content.text}
${ctx.content.analysis ? `\nAnalysis: ${ctx.content.analysis}` : ''}
`;
          break;
        }

        case "document": {
          fullContext += `
## Document: ${ctx.label}
Name: ${ctx.content.name || "Unknown"}
${ctx.content.extractedText ? `Content:\n${ctx.content.extractedText.slice(0, 5000)}` : ''}
${ctx.content.analysis ? `\nAnalysis: ${ctx.content.analysis}` : ''}
`;
          break;
        }

        case "website": {
          fullContext += `
## Website: ${ctx.label}
URL: ${ctx.content.url}
${ctx.content.title ? `Title: ${ctx.content.title}` : ""}
${ctx.content.analysis ? `\nContent Analysis: ${ctx.content.analysis}` : ''}
`;
          break;
        }

        case "research": {
          fullContext += `
## Research Node Connected
Research insights from connected analysis are available for reference.
`;
          break;
        }
      }
    }

    // Build action-focused system prompt
    const systemPrompt = `You are an AI executive assistant that helps users take actions within their Google Workspace. You can help with:

## Capabilities
1. **Email Actions**: Draft replies, compose new emails, summarize email threads
2. **Document Creation**: Create SOPs, strategies, reports, proposals
3. **Calendar Management**: Schedule meetings, find available times, create events
4. **Content Generation**: Write professional content based on context

## User Info
- User: ${userEmail}
- Workspace Connected: ${hasWorkspaceAccess ? "Yes" : "No - actions will be simulated"}

## Connected Data Sources
${contextSources.length > 0 ? contextSources.map(s => `- ${s}`).join('\n') : 'No data sources connected'}

${fullContext}

## Response Format
When asked to take an action:

1. **Acknowledge** the request clearly
2. **Show the action** you're taking (draft email, document content, calendar event details)
3. **Use ✅** when action is ready/completed
4. **Format content** professionally with proper structure

## Guidelines
- Be proactive and helpful
- Reference specific emails, contacts, or events from the context
- Generate complete, professional content (not placeholders)
- For emails, include Subject, To, and Body
- For documents, include proper headers and sections
- For calendar events, include title, time, attendees, and description
- If workspace is not connected, explain the content would be created when connected

## Examples of Actions
- "Reply to John's email about the project" → Draft a professional reply
- "Create an SOP for customer onboarding" → Generate a full SOP document
- "Schedule a meeting with Sarah tomorrow" → Propose calendar event details
- "Write a strategy for Q2 marketing" → Create a strategy document outline`;

    console.log("Action chat - user:", userEmail, "workspace:", hasWorkspaceAccess, "contexts:", contextSources);

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
    console.error("Action chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
