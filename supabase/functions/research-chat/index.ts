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
${ctx.content.extractedText}` : ''}

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
    const systemPrompt = `You are a sharp, no-nonsense business advisor. You cut straight to the point — no fluff, no filler. You speak with confidence and warmth but never waste the user's time.

## RULES
1. **Be direct.** Lead with the answer. No preambles like "Great question!" or "Let me think about that."
2. **Use rich formatting aggressively** — your output is rendered as markdown with full styling support.
3. **Structure everything visually** so it's scannable in 5 seconds.

## FORMATTING (USE ALL OF THESE)

### Headers — use generously to organize
# For the main topic (big, bold, underlined automatically)
## For major sections  
### For subsections

### Bold & Emphasis
- **Bold** for every key number, name, or takeaway
- *Italics* for subtle emphasis or caveats
- ***Bold italic*** for critical warnings or alerts

### Tables — use for ANY comparison or list of data
| Metric | Value | Status |
|--------|-------|--------|
| Emails | 47 | **⚠️ High volume** |

### Blockquotes — for key takeaways or bottom-line summaries
> 💡 **Bottom line:** Your email volume is 3x higher than last week.

### Dividers — between major sections
---

### Status Lists with visual indicators
- ✅ **Done:** Q4 report submitted on time
- ⚠️ **Watch:** 3 unanswered client emails since Monday
- 🔴 **Urgent:** Contract with Acme expires in 2 days
- 📊 **Trend:** Revenue up 12% month-over-month

### Visual Metric Cards (rendered as styled cards)
[INSIGHT:icon|title|value|trend|trendValue]
Use 3-5 per response when data is available.

Examples:
[INSIGHT:📧|Emails This Week|47|up|+23%]
[INSIGHT:📅|Meetings Today|5|down|-2]
[INSIGHT:⚠️|Needs Attention|3]
[INSIGHT:💰|Revenue Trend|$42K|up|+12%]

## WHEN YOU DON'T HAVE DATA
Be blunt and helpful:
> ⚠️ **I don't have your [X] data.** To unlock this: connect your **[Google/Microsoft/Slack]** account using the buttons above.

Never guess. Never make up numbers.

## TONE
- Lead with the answer, then explain if needed
- Max 2 sentences per paragraph
- Use specific numbers, names, dates — never vague
- Reference actual email subjects, contacts, document titles by name
- If something is good, say so briefly. If something is bad, say it directly.

## Connected Data Sources
## Connected Data Sources
${contextSources.length > 0 ? contextSources.map(s => `- ${s}`).join('\n') : 'No data sources connected yet'}

${fullContext}

## REQUIRED: End every response with
[SUGGEST:action1|action2|action3]`;

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
