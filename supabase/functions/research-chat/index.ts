import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildContextFromWorkspace(data: any): string {
  const rawData = data.raw_data || {};
  const summary = data.research_summary || {};
  const findings = data.findings || [];

  const allEmails = rawData.emails || rawData.emailSummaries || [];
  const emailBlock = allEmails.slice(0, 100).map((e: any, i: number) =>
    `${i + 1}. "${e.subject || '(No subject)'}" from ${e.from}${e.snippet ? ' — ' + e.snippet.slice(0, 200) : ''}`
  ).join('\n') || 'No email data';

  const allEvents = rawData.calendarEvents || [];
  const calendarBlock = allEvents.slice(0, 50).map((e: any, i: number) =>
    `${i + 1}. "${e.summary || 'Untitled'}" | ${e.start?.dateTime || e.start || ''} → ${e.end?.dateTime || e.end || ''}`
  ).join('\n') || 'No calendar data';

  const allDocs = rawData.documents || [];
  const docsBlock = allDocs.slice(0, 50).map((d: any, i: number) =>
    `${i + 1}. "${d.name || d.title}" | Modified: ${d.modifiedTime || 'unknown'}`
  ).join('\n') || 'No document data';

  const allContacts = rawData.topContacts || [];
  const contactsBlock = allContacts.slice(0, 30).map((c: any, i: number) =>
    `${i + 1}. ${c.email} (${c.count} interactions)`
  ).join('\n') || 'No contact data';

  const slackChannels = (rawData.slackChannels || []).slice(0, 20).map((ch: any, i: number) =>
    `${i + 1}. #${ch.name} (${ch.memberCount} members)`
  ).join('\n') || 'No Slack data';

  const slackMessages = (rawData.slackMessages || []).slice(0, 50).map((m: any, i: number) =>
    `${i + 1}. #${m.channel} | ${m.user}: ${m.text}`
  ).join('\n') || 'No Slack messages';

  return `
## Business Data Overview
- Emails Analyzed: ${data.emails_analyzed || allEmails.length || 0}
- Documents: ${data.documents_analyzed || allDocs.length || 0}
- Calendar Events: ${data.events_analyzed || allEvents.length || 0}
- Spreadsheets: ${data.sheets_analyzed || 0}
- Sources: ${(rawData.sources || ['Unknown']).join(', ')}

### Key Findings (${findings.length})
${findings.map((f: any, i: number) =>
  `${i + 1}. [${f.impact?.toUpperCase() || 'INFO'}] ${f.category || 'General'}: ${f.finding || JSON.stringify(f)}`
).join('\n') || 'No findings yet'}

### Emails (${allEmails.length})
${emailBlock}

### Calendar Events (${allEvents.length})
${calendarBlock}

### Documents (${allDocs.length})
${docsBlock}

### Top Contacts
${contactsBlock}

### Slack Channels
${slackChannels}

### Slack Messages
${slackMessages}

### Recommendations
${(summary.recommendations || []).map((r: any, i: number) =>
  `${i + 1}. [${r.priority?.toUpperCase() || 'MEDIUM'}] ${r.title}: ${r.description}`
).join('\n') || 'None yet'}
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user via JWT
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      // Skip if token is the anon key itself
      if (token !== supabaseAnonKey) {
        try {
          const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
            auth: { persistSession: false },
          });
          const { data: userData } = await supabaseAuth.auth.getUser(token);
          userId = userData?.user?.id || null;
        } catch (e) {
          console.error("Auth check failed:", e);
        }
      }
    }

    console.log("Research chat - userId:", userId);

    // Fetch user's workspace data server-side
    let businessContext = "";
    if (userId) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: { persistSession: false },
        });
        const { data: workspaceData, error } = await supabaseAdmin
          .from("workspace_research")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching workspace data:", error.message);
        } else if (workspaceData) {
          console.log("Found workspace data - emails:", workspaceData.emails_analyzed, "docs:", workspaceData.documents_analyzed);
          businessContext = buildContextFromWorkspace(workspaceData);
        } else {
          console.log("No workspace data found for user");
        }
      } catch (e) {
        console.error("Error fetching workspace data:", e);
      }
    }

    const systemPrompt = `You are a sharp, no-nonsense business advisor. You cut straight to the point — no fluff, no filler. You speak with confidence and warmth but never waste the user's time.

## RULES
1. **Be direct.** Lead with the answer.
2. **Use rich formatting aggressively** — your output is rendered as markdown.
3. **Structure everything visually** so it's scannable in 5 seconds.

## FORMATTING
- Use **bold** for key numbers, names, takeaways
- Use tables for comparisons
- Use blockquotes for key takeaways: > 💡 **Bottom line:**
- Use status indicators: ✅ ⚠️ 🔴 📊

## WHEN YOU DON'T HAVE DATA
Be blunt: tell the user to connect their Google, Microsoft, or Slack account.

## TONE
- Lead with the answer, then explain if needed
- Max 2 sentences per paragraph
- Use specific numbers, names, dates — never vague
- Reference actual email subjects, contacts, document titles by name

${businessContext ? `## USER'S BUSINESS DATA\n${businessContext}` : '## NO DATA CONNECTED\nThe user has not connected any data sources yet. Tell them to connect Google, Microsoft, or Slack above.'}

## REQUIRED: End every response with
[SUGGEST:action1|action2|action3]`;

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
