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

// Helper to create a Google Doc
async function createGoogleDoc(accessToken: string, title: string, content: string): Promise<ActionResult> {
  try {
    const createResponse = await fetch("https://docs.googleapis.com/v1/documents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error("Failed to create doc:", error);
      return { success: false, type: "document", error: `Failed to create document: ${error}` };
    }

    const doc = await createResponse.json();
    const documentId = doc.documentId;

    await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [{ insertText: { location: { index: 1 }, text: content } }],
      }),
    });

    return {
      success: true,
      type: "document",
      title,
      link: `https://docs.google.com/document/d/${documentId}/edit`,
    };
  } catch (error) {
    console.error("Create doc error:", error);
    return { success: false, type: "document", error: String(error) };
  }
}

// Helper to send an email
async function sendEmail(accessToken: string, to: string, subject: string, body: string): Promise<ActionResult> {
  try {
    const email = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n");
    const encodedEmail = btoa(unescape(encodeURIComponent(email))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: encodedEmail }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, type: "email", error: `Failed to send email: ${error}` };
    }

    const result = await response.json();
    return { success: true, type: "email", title: subject, link: `https://mail.google.com/mail/u/0/#sent/${result.id}` };
  } catch (error) {
    return { success: false, type: "email", error: String(error) };
  }
}

// Helper to create a draft
async function createDraft(accessToken: string, to: string, subject: string, body: string): Promise<ActionResult> {
  try {
    const email = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n");
    const encodedEmail = btoa(unescape(encodeURIComponent(email))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { raw: encodedEmail } }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, type: "draft", error: `Failed to create draft: ${error}` };
    }

    const result = await response.json();
    return { success: true, type: "draft", title: subject, link: `https://mail.google.com/mail/u/0/#drafts/${result.id}` };
  } catch (error) {
    return { success: false, type: "draft", error: String(error) };
  }
}

// Helper to create a calendar event
async function createCalendarEvent(accessToken: string, summary: string, description: string, startTime: string, endTime: string, attendees?: string[]): Promise<ActionResult> {
  try {
    const event: any = {
      summary,
      description,
      start: { dateTime: startTime, timeZone: "UTC" },
      end: { dateTime: endTime, timeZone: "UTC" },
    };
    if (attendees?.length) event.attendees = attendees.map((email) => ({ email }));

    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, type: "calendar", error: `Failed to create event: ${error}` };
    }

    const result = await response.json();
    return { success: true, type: "calendar", title: summary, link: result.htmlLink };
  } catch (error) {
    return { success: false, type: "calendar", error: String(error) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, connectedContexts, googleAccessToken } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    let userEmail = "user";
    let hasWorkspaceAccess = false;
    let accessToken = googleAccessToken;

    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user?.email) {
        userEmail = user.email;
        const { data: connection } = await supabase.from("google_workspace_connections").select("connected").eq("user_id", user.id).single();
        hasWorkspaceAccess = connection?.connected || false;

        if (!accessToken) {
          const { data: tokens } = await supabase.from("google_workspace_tokens").select("access_token, expires_at").eq("user_id", user.id).single();
          if (tokens?.access_token && new Date(tokens.expires_at) > new Date()) {
            accessToken = tokens.access_token;
          }
        }
      }
    }

    // Build context
    let fullContext = "";
    const contextSources: string[] = [];
    for (const ctx of (connectedContexts || []) as ConnectedContext[]) {
      contextSources.push(`${ctx.label} (${ctx.type})`);
      if (ctx.type === "business-db") {
        const rawData = ctx.content.raw_data || {};
        fullContext += `\n## Business Database\n### Emails\n${rawData.emailSummaries?.slice(0, 15).map((e: any) => `- From: ${e.from}, Subject: "${e.subject}"`).join('\n') || 'No emails'}\n### Contacts\n${rawData.topContacts?.slice(0, 10).map((c: any) => `- ${c.email}`).join('\n') || 'No contacts'}\n`;
      } else if (ctx.type === "text" && ctx.content.text) {
        fullContext += `\n## Text: ${ctx.label}\n${ctx.content.text}\n`;
      } else if (ctx.type === "document" && ctx.content.extractedText) {
        fullContext += `\n## Document: ${ctx.content.name}\n${ctx.content.extractedText.slice(0, 3000)}\n`;
      }
    }

    const canExecute = hasWorkspaceAccess && accessToken;

    // Different prompts based on whether we can execute
    const systemPrompt = canExecute ? `You are an AI executive assistant that EXECUTES real actions in Google Workspace.

## EXECUTION MODE - Actions will be created in Google Workspace

When the user asks for an action, respond with this EXACT format:

---
📋 **Action: Create Document**
⏳ Generating content...
⏳ Creating in Google Docs...

[ACTION:CREATE_DOC]
title: Document Title Here
content:
Full document content with proper formatting.
Include all sections and details.
[/ACTION]
---

For emails use [ACTION:SEND_EMAIL] with to:, subject:, body:
For drafts use [ACTION:CREATE_DRAFT] with to:, subject:, body:
For calendar use [ACTION:CREATE_EVENT] with summary:, description:, start:, end:, attendees:

User: ${userEmail}
Context: ${fullContext || 'No context connected'}

Generate complete, professional content. The ACTION blocks will be parsed and executed.` 

: `You are an AI executive assistant. Google Workspace is NOT connected, so actions will be PREVIEWED only.

## PREVIEW MODE - Show what would be created

When the user asks for an action (SOP, email, document, etc.), respond with:

---
📋 **Action Preview: Create Document**

**Title:** [Document Title]

**Content Preview:**
[Show the full document content that would be created]

---
⚠️ **To execute this action:** Connect your Google Workspace in the Integration Hub to create this document automatically.

---

User: ${userEmail}
Context: ${fullContext || 'No context connected'}

Generate complete, professional content as a preview. Show exactly what would be created.`;

    console.log("Action chat - user:", userEmail, "canExecute:", canExecute, "contexts:", contextSources.length);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "Failed to get AI response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResult = await aiResponse.json();
    let responseContent = aiResult.choices?.[0]?.message?.content || "";

    // Execute actions if we have access
    if (canExecute) {
      // Parse and execute CREATE_DOC
      const docMatches = [...responseContent.matchAll(/\[ACTION:CREATE_DOC\]\s*\ntitle:\s*(.+?)\s*\ncontent:\s*([\s\S]*?)\s*\[\/ACTION\]/g)];
      for (const match of docMatches) {
        const title = match[1].trim();
        const content = match[2].trim();
        console.log("Executing: Create doc -", title);
        const result = await createGoogleDoc(accessToken, title, content);
        
        if (result.success) {
          responseContent = responseContent.replace(match[0], 
            `✅ **Document Created Successfully!**\n\n📄 **${result.title}**\n\n🔗 **Open in Google Docs:** ${result.link}\n\nClick the link above to view and edit your document.`
          );
        } else {
          responseContent = responseContent.replace(match[0], `❌ **Failed:** ${result.error}`);
        }
      }

      // Parse and execute SEND_EMAIL
      const emailMatches = [...responseContent.matchAll(/\[ACTION:SEND_EMAIL\]\s*\nto:\s*(.+?)\s*\nsubject:\s*(.+?)\s*\nbody:\s*([\s\S]*?)\s*\[\/ACTION\]/g)];
      for (const match of emailMatches) {
        const result = await sendEmail(accessToken, match[1].trim(), match[2].trim(), match[3].trim());
        responseContent = responseContent.replace(match[0], 
          result.success ? `✅ **Email Sent!**\n\n📧 To: ${match[1]}\n📝 Subject: ${result.title}\n\n🔗 View: ${result.link}` : `❌ **Failed:** ${result.error}`
        );
      }

      // Parse and execute CREATE_DRAFT
      const draftMatches = [...responseContent.matchAll(/\[ACTION:CREATE_DRAFT\]\s*\nto:\s*(.+?)\s*\nsubject:\s*(.+?)\s*\nbody:\s*([\s\S]*?)\s*\[\/ACTION\]/g)];
      for (const match of draftMatches) {
        const result = await createDraft(accessToken, match[1].trim(), match[2].trim(), match[3].trim());
        responseContent = responseContent.replace(match[0], 
          result.success ? `✅ **Draft Created!**\n\n📝 Subject: ${result.title}\n\n🔗 Review & Send: ${result.link}` : `❌ **Failed:** ${result.error}`
        );
      }

      // Parse and execute CREATE_EVENT
      const eventMatches = [...responseContent.matchAll(/\[ACTION:CREATE_EVENT\]\s*\nsummary:\s*(.+?)\s*\ndescription:\s*([\s\S]*?)\s*\nstart:\s*(.+?)\s*\nend:\s*(.+?)\s*\n(?:attendees:\s*(.+?)\s*)?\[\/ACTION\]/g)];
      for (const match of eventMatches) {
        const attendees = match[5]?.split(",").map((e: string) => e.trim()).filter(Boolean) || [];
        const result = await createCalendarEvent(accessToken, match[1].trim(), match[2].trim(), match[3].trim(), match[4].trim(), attendees);
        responseContent = responseContent.replace(match[0], 
          result.success ? `✅ **Event Scheduled!**\n\n📅 ${result.title}\n\n🔗 View: ${result.link}` : `❌ **Failed:** ${result.error}`
        );
      }
    }

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const data = JSON.stringify({ choices: [{ delta: { content: responseContent } }] });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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
