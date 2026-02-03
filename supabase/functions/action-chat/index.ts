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

interface ActionResult {
  success: boolean;
  type: string;
  title?: string;
  link?: string;
  error?: string;
}

async function createGoogleDoc(accessToken: string, title: string, content: string): Promise<ActionResult> {
  try {
    console.log("Creating Google Doc with title:", title);
    console.log("Access token length:", accessToken?.length || 0);
    
    const createResponse = await fetch("https://docs.googleapis.com/v1/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    console.log("Google Docs API response status:", createResponse.status);
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error("Google Docs API error:", error);
      return { success: false, type: "document", error: `Failed to create document: ${error}` };
    }

    const doc = await createResponse.json();
    const documentId = doc.documentId;

    await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: content } }] }),
    });

    return { success: true, type: "document", title, link: `https://docs.google.com/document/d/${documentId}/edit` };
  } catch (error) {
    return { success: false, type: "document", error: String(error) };
  }
}

async function createGoogleSheet(accessToken: string, title: string, data: string[][]): Promise<ActionResult> {
  try {
    console.log("Creating Google Sheet with title:", title);
    
    const createResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: { title },
        sheets: [{
          properties: { title: "Sheet1" },
          data: [{
            startRow: 0,
            startColumn: 0,
            rowData: data.map(row => ({
              values: row.map(cell => ({ userEnteredValue: { stringValue: cell } }))
            }))
          }]
        }]
      }),
    });

    console.log("Google Sheets API response status:", createResponse.status);
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error("Google Sheets API error:", error);
      return { success: false, type: "sheet", error: `Failed to create spreadsheet: ${error}` };
    }

    const sheet = await createResponse.json();
    const spreadsheetId = sheet.spreadsheetId;

    return { success: true, type: "sheet", title, link: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` };
  } catch (error) {
    return { success: false, type: "sheet", error: String(error) };
  }
}

async function sendEmail(accessToken: string, to: string, subject: string, body: string): Promise<ActionResult> {
  try {
    const email = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n");
    const encodedEmail = btoa(unescape(encodeURIComponent(email))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: encodedEmail }),
    });

    if (!response.ok) return { success: false, type: "email", error: await response.text() };
    const result = await response.json();
    return { success: true, type: "email", title: subject, link: `https://mail.google.com/mail/u/0/#sent/${result.id}` };
  } catch (error) {
    return { success: false, type: "email", error: String(error) };
  }
}

async function createDraft(accessToken: string, to: string, subject: string, body: string): Promise<ActionResult> {
  try {
    const email = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n");
    const encodedEmail = btoa(unescape(encodeURIComponent(email))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { raw: encodedEmail } }),
    });

    if (!response.ok) return { success: false, type: "draft", error: await response.text() };
    const result = await response.json();
    return { success: true, type: "draft", title: subject, link: `https://mail.google.com/mail/u/0/#drafts/${result.id}` };
  } catch (error) {
    return { success: false, type: "draft", error: String(error) };
  }
}

async function createCalendarEvent(accessToken: string, summary: string, description: string, startTime: string, endTime: string, attendees?: string[]): Promise<ActionResult> {
  try {
    const event: any = { summary, description, start: { dateTime: startTime, timeZone: "UTC" }, end: { dateTime: endTime, timeZone: "UTC" } };
    if (attendees?.length) event.attendees = attendees.map((email) => ({ email }));

    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!response.ok) return { success: false, type: "calendar", error: await response.text() };
    const result = await response.json();
    return { success: true, type: "calendar", title: summary, link: result.htmlLink };
  } catch (error) {
    return { success: false, type: "calendar", error: String(error) };
  }
}

// Generate document content using AI (hidden from user)
async function generateDocumentContent(apiKey: string, docType: string, topic: string, context: string): Promise<string> {
  const docTypeInstructions: Record<string, string> = {
    "SOP": "Purpose, Scope, Responsibilities, Step-by-Step Procedure, Quality Checks, References",
    "Strategy Document": "Executive Summary, Objectives, Market Analysis, Strategic Initiatives, Action Plan, KPIs, Timeline",
    "Report": "Executive Summary, Key Findings, Data Analysis, Conclusions, Recommendations",
    "Proposal": "Executive Summary, Problem Statement, Proposed Solution, Benefits, Timeline, Budget, Next Steps",
    "Business Plan": "Executive Summary, Company Overview, Market Analysis, Products/Services, Marketing Strategy, Financial Projections",
    "Guide": "Introduction, Prerequisites, Step-by-Step Instructions, Tips & Best Practices, Troubleshooting, FAQ",
    "Email": "Subject line context, greeting, main message, call to action, professional closing",
    "Meeting Agenda": "Meeting objective, attendees, agenda items with time allocations, action items, next steps",
  };

  const sections = docTypeInstructions[docType] || docTypeInstructions["Report"];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{
        role: "user",
        content: `Generate a complete, professional ${docType} about: ${topic}

Context from user's business data:
${context}

Requirements:
- Write the FULL document content (not a summary or outline)
- Use proper formatting with headers, sections, bullet points
- Be specific and actionable
- Include these sections: ${sections}
- Make it ready to use immediately

Output ONLY the document content, no explanations.`
      }],
      stream: false,
    }),
  });

  if (!response.ok) throw new Error("Failed to generate content");
  const result = await response.json();
  return result.choices?.[0]?.message?.content || "";
}

// Generate spreadsheet data using AI
async function generateSpreadsheetData(apiKey: string, topic: string, context: string): Promise<string[][]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{
        role: "user",
        content: `Generate spreadsheet data for: ${topic}

Context from user's business data:
${context}

Requirements:
- Output ONLY a JSON 2D array of strings representing rows and columns
- First row should be headers
- Include realistic, useful data (10-20 rows)
- Make columns appropriate for the topic

Example output format:
[["Name","Date","Amount","Status"],["Item 1","2024-01-15","$100","Complete"],["Item 2","2024-01-16","$250","Pending"]]

Output ONLY the JSON array, no explanations or markdown.`
      }],
      stream: false,
    }),
  });

  if (!response.ok) throw new Error("Failed to generate spreadsheet data");
  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || "[]";
  
  try {
    return JSON.parse(content.replace(/```json?|```/g, "").trim());
  } catch {
    // Fallback to simple data if parsing fails
    return [["Column A", "Column B"], ["Data 1", "Data 2"]];
  }
}

// Helper to stream SSE messages
function streamChunk(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, connectedContexts, googleAccessToken } = await req.json();
    const userMessage = messages[messages.length - 1]?.content || "";
    const userMessageLower = userMessage.toLowerCase();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    let userEmail = "user";
    let accessToken = googleAccessToken;

    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user?.email) {
        userEmail = user.email;
      }
    }

    // Build context string
    let contextStr = "";
    for (const ctx of (connectedContexts || []) as ConnectedContext[]) {
      if (ctx.type === "business-db") {
        const rawData = ctx.content.raw_data || {};
        contextStr += `Emails: ${rawData.emailSummaries?.slice(0, 10).map((e: any) => e.subject).join(", ") || "none"}\n`;
        contextStr += `Contacts: ${rawData.topContacts?.slice(0, 5).map((c: any) => c.email).join(", ") || "none"}\n`;
      } else if (ctx.type === "text") {
        contextStr += `Text: ${ctx.content.text?.slice(0, 500) || ""}\n`;
      } else if (ctx.type === "document") {
        contextStr += `Document "${ctx.content.name}": ${ctx.content.extractedText?.slice(0, 500) || ""}\n`;
      }
    }

    // Check if we have a valid Google access token
    const canExecute = !!accessToken;
    console.log("Action chat - user:", userEmail, "canExecute:", canExecute, "hasToken:", !!accessToken);

    // Detect action type from user message
    // Check for spreadsheet/sheet request FIRST (before doc detection)
    const isSheetRequest = /\b(spreadsheet|sheet|excel|table|tracker|budget|inventory|list)\b/i.test(userMessageLower);
    
    // Detect specific document types from user message
    const docTypePatterns: Array<{ pattern: RegExp; type: string }> = [
      { pattern: /\bsop\b/i, type: "SOP" },
      { pattern: /\bstrategy\b/i, type: "Strategy Document" },
      { pattern: /\breport\b/i, type: "Report" },
      { pattern: /\bproposal\b/i, type: "Proposal" },
      { pattern: /\b(business\s*plan|plan)\b/i, type: "Business Plan" },
      { pattern: /\b(guide|manual|handbook)\b/i, type: "Guide" },
      { pattern: /\bagenda\b/i, type: "Meeting Agenda" },
      { pattern: /\b(document|doc)\b/i, type: "Document" }, // Generic fallback
    ];

    let detectedDocType: string | null = null;
    // Only detect doc type if it's not a sheet request
    if (!isSheetRequest) {
      for (const { pattern, type } of docTypePatterns) {
        if (pattern.test(userMessageLower)) {
          detectedDocType = type;
          break;
        }
      }
    }

    const isDocRequest = detectedDocType !== null;
    const isEmailRequest = /\b(email|reply|send|draft|message)\b/i.test(userMessageLower);
    const isCalendarRequest = /\b(schedule|meeting|calendar|event|appointment)\b/i.test(userMessageLower);

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (content: string) => controller.enqueue(encoder.encode(streamChunk(content)));

        if (!canExecute) {
          emit(`[STEP:⚠️:Google Workspace not connected:error]\n\n`);
          emit(`**Connect your Google Workspace** to execute actions.\n\n`);
          emit(`Once connected, I can:\n`);
          emit(`• **Create documents** in Google Docs\n`);
          emit(`• **Create spreadsheets** in Google Sheets\n`);
          emit(`• **Send emails** via Gmail\n`);
          emit(`• **Schedule events** in Google Calendar\n\n`);
          emit(`Go to **Integration Hub** to connect.`);
        } else if (isSheetRequest) {
          const topic = userMessage
            .replace(/create|make|write|generate|an?|the|for|me|please|spreadsheet|sheet|excel|table|tracker|budget|inventory|list/gi, "")
            .trim() || "Spreadsheet";
          const title = topic.slice(0, 60);

          try {
            emit(`[STEP:🔍:Analyzing request:complete]\n`);
            emit(`[STEP:✨:Generating spreadsheet data:running]\n`);

            const data = await generateSpreadsheetData(LOVABLE_API_KEY, topic, contextStr);
            
            emit(`[STEP:✨:Generating spreadsheet data:complete]\n`);
            emit(`[STEP:📊:Creating in Google Sheets:running]\n`);

            const result = await createGoogleSheet(accessToken, title, data);

            if (result.success) {
              emit(`[STEP:📊:Creating in Google Sheets:complete]\n`);
              emit(`[STEP:✅:Ready:complete]\n\n`);
              emit(`**Spreadsheet Created!**\n\n`);
              const previewText = data.slice(0, 2).map(row => row.join(", ")).join(" | ");
              emit(`[DOC:sheet|${result.title}|${result.link}|${previewText}...]\n\n`);
              emit(`[SUGGEST:Create a summary document for this data|Add formulas to calculate totals|Export this data to a report]`);
            } else {
              emit(`[STEP:📊:Creating in Google Sheets:error]\n\n`);
              emit(`**Error:** ${result.error}\n\n`);
              emit(`Check your Google Workspace connection.`);
            }
          } catch (error) {
            emit(`[STEP:❌:Error:error]\n\n`);
            emit(`**Error:** ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        } else if (isDocRequest && detectedDocType) {
          const docType = detectedDocType === "Document" ? "Document" : detectedDocType;
          const topic = userMessage
            .replace(/create|make|write|generate|an?|the|for|me|please|sop|strategy|report|proposal|plan|guide|manual|document|agenda/gi, "")
            .trim() || docType;
          const title = docType === "Document" ? topic.slice(0, 60) : `${docType}: ${topic.slice(0, 50)}`;

          try {
            emit(`[STEP:🔍:Analyzing request:complete]\n`);
            emit(`[STEP:✨:Generating ${docType.toLowerCase()}:running]\n`);

            const content = await generateDocumentContent(LOVABLE_API_KEY, docType, topic, contextStr);
            
            emit(`[STEP:✨:Generating ${docType.toLowerCase()}:complete]\n`);
            emit(`[STEP:📄:Creating in Google Docs:running]\n`);

            const result = await createGoogleDoc(accessToken, title, content);

            if (result.success) {
              emit(`[STEP:📄:Creating in Google Docs:complete]\n`);
              emit(`[STEP:✅:Ready:complete]\n\n`);
              emit(`**${docType} Created!**\n\n`);
              emit(`[DOC:doc|${result.title}|${result.link}|${content.slice(0, 100).replace(/\n/g, " ")}...]\n\n`);
              emit(`[SUGGEST:Create a follow-up action plan|Share this with my team|Create a tracker spreadsheet for this]`);
            } else {
              emit(`[STEP:📄:Creating in Google Docs:error]\n\n`);
              emit(`**Error:** ${result.error}\n\n`);
              emit(`Check your Google Workspace connection.`);
            }
          } catch (error) {
            emit(`[STEP:❌:Error:error]\n\n`);
            emit(`**Error:** ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        } else if (isEmailRequest) {
          emit(`[STEP:🔍:Analyzing email request:running]\n`);

          try {
            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [{
                  role: "system",
                  content: `You help draft emails. Based on the user's request, output ONLY a JSON object with: {"to": "email", "subject": "subject", "body": "email body"}. Use context to find recipient email if mentioned by name. Context: ${contextStr}`
                }, ...messages],
                stream: false,
              }),
            });

            const aiResult = await aiResponse.json();
            const emailContent = aiResult.choices?.[0]?.message?.content || "";

            try {
              const emailData = JSON.parse(emailContent.replace(/```json?|```/g, "").trim());
              
              emit(`[STEP:🔍:Analyzing email request:complete]\n`);
              emit(`[STEP:✍️:Composing email:complete]\n`);
              emit(`[STEP:📧:Sending via Gmail:running]\n`);

              const result = await sendEmail(accessToken, emailData.to, emailData.subject, emailData.body);

              if (result.success) {
                emit(`[STEP:📧:Sending via Gmail:complete]\n`);
                emit(`[STEP:✅:Email sent:complete]\n\n`);
                emit(`**Email Sent Successfully!**\n\n`);
                emit(`**To:** ${emailData.to}\n`);
                emit(`**Subject:** ${emailData.subject}\n\n`);
                emit(`[DOC:email|${result.title}|${result.link}|${emailData.body.slice(0, 80)}...]\n\n`);
                emit(`[SUGGEST:Schedule a follow-up meeting|Create a task tracker for this|Draft another email to the team]`);
              } else {
                emit(`[STEP:📧:Sending via Gmail:error]\n\n`);
                emit(`**Error:** ${result.error}`);
              }
            } catch {
              emit(`[STEP:🔍:Analyzing email request:complete]\n\n`);
              emit(`**I need more details to send an email:**\n\n`);
              emit(`• **To:** Who should I send this to?\n`);
              emit(`• **Subject:** What's the email about?\n`);
              emit(`• **Content:** What should the email say?\n\n`);
              emit(`[SUGGEST:Draft an email to my team about project status|Send a follow-up email to a client|Create an email template]`);
            }
          } catch (error) {
            emit(`[STEP:❌:Error occurred:error]\n\n`);
            emit(`**Error:** ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        } else if (isCalendarRequest) {
          emit(`[STEP:📅:Calendar action detected:complete]\n\n`);
          emit(`**Schedule an Event**\n\n`);
          emit(`Please provide:\n`);
          emit(`• **Title:** What's the meeting about?\n`);
          emit(`• **Date/Time:** When should it be?\n`);
          emit(`• **Attendees:** Who should be invited? (optional)\n\n`);
          emit(`*Example: "Schedule a team standup tomorrow at 10am with john@company.com"*\n\n`);
          emit(`[SUGGEST:Schedule a team meeting for tomorrow|Create a weekly standup|Set up a project kickoff]`);
        } else {
          // General question - use AI with rich formatting
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [{
                role: "system",
                content: `You are an action assistant for Google Workspace. Help users with tasks.

CRITICAL: You MUST end EVERY response with this exact format on its own line:
[SUGGEST:suggestion one|suggestion two|suggestion three]

Available actions:
- **Create documents/SOPs/strategies** in Google Docs
- **Create spreadsheets/trackers/budgets** in Google Sheets
- **Send emails** via Gmail  
- **Schedule events** in Google Calendar

Always use **bold** for important terms and action items.
Keep responses concise and actionable.
Context from user's data: ${contextStr}

REMINDER: Your response MUST end with [SUGGEST:action1|action2|action3] - this is required!`
              }, ...messages],
              stream: false,
            }),
          });

          const aiResult = await aiResponse.json();
          let response = aiResult.choices?.[0]?.message?.content || "How can I help you with your Google Workspace?";
          
          // Ensure suggestions are present - add default if AI didn't include them
          if (!response.includes("[SUGGEST:")) {
            response += "\n\n[SUGGEST:Create a document or report|Set up a spreadsheet tracker|Draft an email to your team]";
          }
          emit(response);
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (error) {
    console.error("Action chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
