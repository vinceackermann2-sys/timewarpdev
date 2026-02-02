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
    // Create the document
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

    // Insert content into the document
    const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      }),
    });

    if (!updateResponse.ok) {
      console.error("Failed to update doc content:", await updateResponse.text());
    }

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
    // Create the email in RFC 2822 format
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ].join("\r\n");

    // Base64url encode the email
    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedEmail }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send email:", error);
      return { success: false, type: "email", error: `Failed to send email: ${error}` };
    }

    const result = await response.json();
    return {
      success: true,
      type: "email",
      title: subject,
      link: `https://mail.google.com/mail/u/0/#sent/${result.id}`,
    };
  } catch (error) {
    console.error("Send email error:", error);
    return { success: false, type: "email", error: String(error) };
  }
}

// Helper to create a draft email
async function createDraft(accessToken: string, to: string, subject: string, body: string): Promise<ActionResult> {
  try {
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ].join("\r\n");

    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: { raw: encodedEmail } }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to create draft:", error);
      return { success: false, type: "draft", error: `Failed to create draft: ${error}` };
    }

    const result = await response.json();
    return {
      success: true,
      type: "draft",
      title: subject,
      link: `https://mail.google.com/mail/u/0/#drafts/${result.id}`,
    };
  } catch (error) {
    console.error("Create draft error:", error);
    return { success: false, type: "draft", error: String(error) };
  }
}

// Helper to create a calendar event
async function createCalendarEvent(
  accessToken: string,
  summary: string,
  description: string,
  startTime: string,
  endTime: string,
  attendees?: string[]
): Promise<ActionResult> {
  try {
    const event: any = {
      summary,
      description,
      start: { dateTime: startTime, timeZone: "UTC" },
      end: { dateTime: endTime, timeZone: "UTC" },
    };

    if (attendees && attendees.length > 0) {
      event.attendees = attendees.map((email) => ({ email }));
    }

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to create event:", error);
      return { success: false, type: "calendar", error: `Failed to create event: ${error}` };
    }

    const result = await response.json();
    return {
      success: true,
      type: "calendar",
      title: summary,
      link: result.htmlLink,
    };
  } catch (error) {
    console.error("Create event error:", error);
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
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user session for workspace access
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

        // Check if user has Google Workspace connected
        const { data: connection } = await supabase
          .from("google_workspace_connections")
          .select("connected")
          .eq("user_id", user.id)
          .single();

        hasWorkspaceAccess = connection?.connected || false;

        // If no token provided, try to get from stored tokens
        if (!accessToken) {
          const { data: tokens } = await supabase
            .from("google_workspace_tokens")
            .select("access_token, expires_at, refresh_token")
            .eq("user_id", user.id)
            .single();

          if (tokens?.access_token) {
            // Check if token is expired and refresh if needed
            const expiresAt = new Date(tokens.expires_at);
            if (expiresAt > new Date()) {
              accessToken = tokens.access_token;
            }
            // TODO: Implement token refresh if expired
          }
        }
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
            `- ID: ${e.id || 'N/A'}, From: ${e.from}, Subject: "${e.subject}", Snippet: ${e.snippet?.slice(0, 200) || 'No preview'}`
          ).join('\n') || rawData.emails?.slice(0, 20).map((e: any) =>
            `- From: ${e.from}, Subject: "${e.subject}"`
          ).join('\n') || 'No email data'}

### Upcoming Events (for scheduling reference)
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

    // Build action-focused system prompt with execution capabilities
    const systemPrompt = `You are an AI executive assistant that EXECUTES real actions in Google Workspace. You have FULL access to create documents, send emails, and schedule events.

## Your Capabilities (REAL ACTIONS - NOT SIMULATIONS)
1. **CREATE DOCUMENTS**: Generate Google Docs with full content
2. **SEND EMAILS**: Compose and send emails via Gmail
3. **CREATE DRAFTS**: Save email drafts for review
4. **SCHEDULE EVENTS**: Create calendar events with attendees

## User Info
- User: ${userEmail}
- Workspace Connected: ${hasWorkspaceAccess ? "YES - FULL ACCESS" : "No - actions will be simulated"}
- Access Token Available: ${accessToken ? "YES" : "NO"}

## Connected Data Sources
${contextSources.length > 0 ? contextSources.map(s => `- ${s}`).join('\n') : 'No data sources connected'}

${fullContext}

## CRITICAL: Action Response Format
When the user requests an action, you MUST respond with a structured format that includes ACTION BLOCKS.
Use this EXACT format to trigger real actions:

### For Creating Documents (SOPs, Strategies, Reports):
\`\`\`
📋 **Creating Document...**

[ACTION:CREATE_DOC]
title: Your Document Title Here
content:
Full document content goes here.
Include all sections, headers, and details.
Use proper formatting with headings.
[/ACTION]
\`\`\`

### For Sending Emails:
\`\`\`
📧 **Sending Email...**

[ACTION:SEND_EMAIL]
to: recipient@email.com
subject: Email Subject Here
body:
Full email body content.
Professional and clear.
[/ACTION]
\`\`\`

### For Creating Email Drafts:
\`\`\`
📝 **Creating Draft...**

[ACTION:CREATE_DRAFT]
to: recipient@email.com
subject: Draft Subject Here
body:
Draft email content.
User can review before sending.
[/ACTION]
\`\`\`

### For Scheduling Calendar Events:
\`\`\`
📅 **Scheduling Event...**

[ACTION:CREATE_EVENT]
summary: Meeting Title
description: Meeting description and agenda
start: 2024-01-15T14:00:00Z
end: 2024-01-15T15:00:00Z
attendees: person1@email.com, person2@email.com
[/ACTION]
\`\`\`

## Guidelines
- ALWAYS use ACTION blocks for executable requests
- Generate COMPLETE, professional content (not placeholders)
- Reference specific emails/contacts from the context when relevant
- For SOPs, include: Purpose, Scope, Responsibilities, Procedures, References
- For emails, be professional and context-aware
- After the action block, add a brief confirmation message

## Example Response for SOP Request:
📋 **Creating SOP Document...**

[ACTION:CREATE_DOC]
title: Customer Onboarding SOP
content:
# Customer Onboarding Standard Operating Procedure

## 1. Purpose
This document outlines the standard process for onboarding new customers...

## 2. Scope
This procedure applies to all new customer accounts...

## 3. Responsibilities
- Sales Team: Initial handoff...
- Customer Success: Onboarding execution...

## 4. Procedure
### Step 1: Welcome Email
Send welcome email within 24 hours...

### Step 2: Kickoff Call
Schedule onboarding call within 48 hours...

## 5. References
- Company Handbook Section 4.2
- CRM System Guide
[/ACTION]

✅ Your SOP has been created! Click the link below to view and edit it.`;

    console.log("Action chat - user:", userEmail, "workspace:", hasWorkspaceAccess, "hasToken:", !!accessToken);

    // First, get the AI response to determine what action to take
    const aiResponse = await fetch(
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
          stream: false, // Get full response to parse actions
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    let responseContent = aiResult.choices?.[0]?.message?.content || "";

    // Parse and execute actions from the response
    const actionResults: ActionResult[] = [];

    if (accessToken && hasWorkspaceAccess) {
      // Parse CREATE_DOC actions
      const docMatches = responseContent.matchAll(/\[ACTION:CREATE_DOC\]\s*\ntitle:\s*(.+?)\s*\ncontent:\s*([\s\S]*?)\s*\[\/ACTION\]/g);
      for (const match of docMatches) {
        const title = match[1].trim();
        const content = match[2].trim();
        console.log("Creating doc:", title);
        const result = await createGoogleDoc(accessToken, title, content);
        actionResults.push(result);
        
        if (result.success && result.link) {
          responseContent = responseContent.replace(match[0], 
            `✅ **Document Created:** [${result.title}](${result.link})\n\n📄 Click here to open: ${result.link}`
          );
        } else {
          responseContent = responseContent.replace(match[0], 
            `❌ **Failed to create document:** ${result.error}`
          );
        }
      }

      // Parse SEND_EMAIL actions
      const emailMatches = responseContent.matchAll(/\[ACTION:SEND_EMAIL\]\s*\nto:\s*(.+?)\s*\nsubject:\s*(.+?)\s*\nbody:\s*([\s\S]*?)\s*\[\/ACTION\]/g);
      for (const match of emailMatches) {
        const to = match[1].trim();
        const subject = match[2].trim();
        const body = match[3].trim();
        console.log("Sending email to:", to);
        const result = await sendEmail(accessToken, to, subject, body);
        actionResults.push(result);
        
        if (result.success && result.link) {
          responseContent = responseContent.replace(match[0], 
            `✅ **Email Sent:** "${result.title}" to ${to}\n\n📧 View in Gmail: ${result.link}`
          );
        } else {
          responseContent = responseContent.replace(match[0], 
            `❌ **Failed to send email:** ${result.error}`
          );
        }
      }

      // Parse CREATE_DRAFT actions
      const draftMatches = responseContent.matchAll(/\[ACTION:CREATE_DRAFT\]\s*\nto:\s*(.+?)\s*\nsubject:\s*(.+?)\s*\nbody:\s*([\s\S]*?)\s*\[\/ACTION\]/g);
      for (const match of draftMatches) {
        const to = match[1].trim();
        const subject = match[2].trim();
        const body = match[3].trim();
        console.log("Creating draft for:", to);
        const result = await createDraft(accessToken, to, subject, body);
        actionResults.push(result);
        
        if (result.success && result.link) {
          responseContent = responseContent.replace(match[0], 
            `✅ **Draft Created:** "${result.title}"\n\n📝 Review and send: ${result.link}`
          );
        } else {
          responseContent = responseContent.replace(match[0], 
            `❌ **Failed to create draft:** ${result.error}`
          );
        }
      }

      // Parse CREATE_EVENT actions
      const eventMatches = responseContent.matchAll(/\[ACTION:CREATE_EVENT\]\s*\nsummary:\s*(.+?)\s*\ndescription:\s*([\s\S]*?)\s*\nstart:\s*(.+?)\s*\nend:\s*(.+?)\s*\n(?:attendees:\s*(.+?)\s*)?\[\/ACTION\]/g);
      for (const match of eventMatches) {
        const summary = match[1].trim();
        const description = match[2].trim();
        const start = match[3].trim();
        const end = match[4].trim();
        const attendees = match[5]?.split(",").map((e: string) => e.trim()).filter(Boolean) || [];
        console.log("Creating event:", summary);
        const result = await createCalendarEvent(accessToken, summary, description, start, end, attendees);
        actionResults.push(result);
        
        if (result.success && result.link) {
          responseContent = responseContent.replace(match[0], 
            `✅ **Event Scheduled:** "${result.title}"\n\n📅 View in Calendar: ${result.link}`
          );
        } else {
          responseContent = responseContent.replace(match[0], 
            `❌ **Failed to schedule event:** ${result.error}`
          );
        }
      }
    }

    console.log("Action results:", actionResults.length, "actions executed");

    // Stream the final response with action results
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send the response as a single chunk (already processed)
        const data = JSON.stringify({
          choices: [{
            delta: { content: responseContent },
          }],
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
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
