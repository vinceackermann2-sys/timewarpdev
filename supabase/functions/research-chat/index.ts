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

          // Include ALL emails with snippets
          const allEmails = rawData.emails || rawData.emailSummaries || [];
          const emailBlock = allEmails.map((e: any, i: number) => 
            `${i + 1}. "${e.subject || '(No subject)'}" from ${e.from}${e.snippet ? ' — ' + e.snippet.slice(0, 200) : ''}${e.labels ? ' [' + e.labels.join(', ') + ']' : ''}`
          ).join('\n') || 'No email data';

          // Include ALL calendar events
          const allEvents = rawData.calendarEvents || [];
          const calendarBlock = allEvents.map((e: any, i: number) => 
            `${i + 1}. "${e.summary || 'Untitled'}" | ${e.start?.dateTime || e.start || ''} → ${e.end?.dateTime || e.end || ''} | Attendees: ${e.attendees || 0}${e.hasConferencing ? ' 📹' : ''}`
          ).join('\n') || 'No calendar data';

          // Include ALL documents
          const allDocs = rawData.documents || [];
          const docsBlock = allDocs.map((d: any, i: number) => 
            `${i + 1}. "${d.name || d.title}" | Modified: ${d.modifiedTime || d.modified || 'unknown'}${d.shared ? ' (shared)' : ''}${d.mimeType ? ' [' + d.mimeType + ']' : ''}`
          ).join('\n') || 'No document data';

          // Include ALL spreadsheets
          const allSheets = rawData.spreadsheets || [];
          const sheetsBlock = allSheets.map((s: any, i: number) => 
            `${i + 1}. "${s.name}" | Modified: ${s.modifiedTime || 'unknown'}`
          ).join('\n') || 'No spreadsheet data';

          // Include ALL contacts
          const allContacts = rawData.topContacts || [];
          const contactsBlock = allContacts.map((c: any, i: number) => 
            `${i + 1}. ${c.email} (${c.count} interactions)`
          ).join('\n') || 'No contact data';

          // Email patterns from summary
          const emailPatterns = summary.emailPatterns || [];
          const calendarSummary = summary.calendarSummary || [];
          const documentList = summary.documentList || [];

          fullContext += `
## Business Database: ${ctx.label}

### Overview
- Total Emails Analyzed: ${data.emails_analyzed || allEmails.length || 0}
- Total Documents: ${data.documents_analyzed || allDocs.length || 0}
- Total Calendar Events: ${data.events_analyzed || allEvents.length || 0}
- Total Spreadsheets: ${data.sheets_analyzed || allSheets.length || 0}

### Key Findings (${findings.length} total)
${findings.map((f: any, i: number) => 
  `${i + 1}. [${f.impact?.toUpperCase() || f.priority?.toUpperCase() || 'INFO'}] ${f.category || f.issue?.category || 'General'}: ${f.finding || f.issue?.title || JSON.stringify(f)}`
).join('\n') || 'No findings yet — this is fresh data, analyze it thoroughly'}

### ALL Emails (${allEmails.length})
${emailBlock}

### ALL Calendar Events (${allEvents.length})
${calendarBlock}

### ALL Documents (${allDocs.length})
${docsBlock}

### ALL Spreadsheets (${allSheets.length})
${sheetsBlock}

### Top Contacts
${contactsBlock}

### Recommendations
${(summary.recommendations || []).map((r: any, i: number) => 
  `${i + 1}. [${r.priority?.toUpperCase() || 'MEDIUM'}] ${r.title}: ${r.description}`
).join('\n') || 'None yet — generate recommendations from the data above'}

`;
          break;
        }

        case "text": {
          fullContext += `
## Text Content: ${ctx.label}

### Original Text
${ctx.content.text}

${ctx.content.analysis ? `### AI Analysis
${ctx.content.analysis}` : ''}

`;
          break;
        }

        case "document": {
          fullContext += `
## Document: ${ctx.label}

Document Name: ${ctx.content.name || "Unknown"}

${ctx.content.extractedText ? `### Extracted Content
${ctx.content.extractedText.slice(0, 8000)}` : ''}

${ctx.content.analysis ? `### AI Analysis
${ctx.content.analysis}` : ''}

`;
          break;
        }

        case "image": {
          fullContext += `
## Image: ${ctx.label}

Image has been analyzed by AI vision.

${ctx.content.analysis ? `### AI Vision Analysis
${ctx.content.analysis}` : 'No analysis available - please ensure the image was analyzed before connecting.'}

`;
          break;
        }

        case "website": {
          fullContext += `
## Website: ${ctx.label}

URL: ${ctx.content.url}
${ctx.content.title ? `Title: ${ctx.content.title}` : ""}

${ctx.content.analysis ? `### AI Analysis of Website Content
${ctx.content.analysis}` : 'No analysis available - please ensure the website was analyzed before connecting.'}

`;
          break;
        }
      }
    }

    // Build system prompt with C-suite role categorization
    const systemPrompt = `You are a warm, empathetic business advisor who genuinely cares about the person behind the business. You speak like a trusted friend — honest, clear, never overly technical. You use "you" and "your" to make it personal.

## YOUR PERSONALITY
- **Empathetic**: Acknowledge the human side of business challenges. "I can see you've been juggling a lot…"
- **Honest**: If something looks concerning, say it kindly but directly. No sugarcoating.
- **Simple**: Explain things like you're talking to a smart friend, not writing a business report.
- **Encouraging**: Celebrate wins, no matter how small.

## WHEN YOU DON'T HAVE DATA
If the user asks about something you don't have data for, be upfront:
- "I don't have access to your [X] data yet."
- Explain exactly how to fix it: "Connect your [Google/Microsoft/Slack] account to give me visibility into this."
- Never make up data or speculate without saying so.

## DATA CATEGORIZATION (use internally, don't lecture about it)
Categorize insights naturally by area:
- 📊 **Strategy** (CEO lens) — big picture, direction, risks
- 📣 **Marketing** (CMO lens) — brand, campaigns, customers
- 💰 **Finance** (CFO lens) — money, costs, revenue
- ⚙️ **Operations** (COO lens) — daily workflow, meetings, efficiency
- 🔧 **Tech** (CTO lens) — tools, systems, automation
- 👥 **People** (CHR lens) — team health, communication, culture

## CRITICAL OUTPUT FORMAT

### 1. USE VISUAL INSIGHT CARDS GENEROUSLY
For every answer with data, lead with cards:
[INSIGHT:icon|title|value|trend|trendValue]

Examples:
[INSIGHT:📧|Emails This Week|47|up|+12%]
[INSIGHT:👥|Key Contacts|8]
[INSIGHT:⚠️|Needs Attention|3]
[INSIGHT:📅|Meetings Today|5|down|-2]

Use at least 2-4 insight cards per response when data is available.

### 2. USE EMOJIS AND VISUAL STRUCTURE
- Start sections with relevant emojis: 📧 📊 📅 👥 💡 ⚠️ ✅ 🎯 💰 📈 📉 🔥 ❤️ 🚀
- Use **bold** for key takeaways
- Use > blockquotes for important callouts
- Use --- dividers between sections
- Keep paragraphs to 1-3 sentences max

### 3. USE HEADERS FOR SCANABILITY
Structure with ### headers using emojis:
### 📧 Your Email Activity
### 🎯 What I'd Focus On
### ⚠️ Heads Up

### 4. END with Suggestions (REQUIRED)
[SUGGEST:action 1|action 2|action 3]

## Connected Data Sources
${contextSources.length > 0 ? contextSources.map(s => `- ${s}`).join('\n') : 'No data sources connected yet'}

${fullContext}

## Response Guidelines
- Lead with insight cards — make every answer visually rich
- Be conversational, warm, and direct
- Reference specific emails, contacts, or docs by name
- If data is missing, say so honestly and explain the fix
- Keep it scannable — lots of whitespace, bullets, emojis
- End every response with [SUGGEST:...] for next steps

## REMINDER: End every response with [SUGGEST:action1|action2|action3]`;

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
