// Real integration executor for AI Agents.
// Exposes a set of OpenAI-compatible tools that the AI can call to perform
// real actions against the user's connected accounts. Tokens are resolved
// through getValidAccessToken which transparently refreshes expired tokens.

import { getValidAccessToken } from "../oauth/refresh.ts";

type Ctx = {
  supabase: any;
  userId: string;
  workspaceId: string | null;
  brandId?: string | null;
};

export type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const ALL_TOOLS: ToolDef[] = [
  // ---------- Gmail ----------
  {
    type: "function",
    function: {
      name: "gmail_list_messages",
      description: "List the user's most recent Gmail messages, optionally filtered with a Gmail search query (e.g. 'is:unread newer_than:1d from:foo@bar.com').",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Gmail search syntax. Optional." },
          max_results: { type: "number", description: "Default 10, max 25." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_send_email",
      description: "Send an email via the user's Gmail account.",
      parameters: {
        type: "object",
        required: ["to", "subject", "body"],
        properties: {
          to: { type: "string", description: "Recipient email address (or comma-separated list)." },
          subject: { type: "string" },
          body: { type: "string", description: "Plain text or HTML body." },
          html: { type: "boolean", description: "True if body is HTML." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_create_draft",
      description: "Create a draft email in the user's Gmail account (does NOT send).",
      parameters: {
        type: "object",
        required: ["to", "subject", "body"],
        properties: {
          to: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" },
          html: { type: "boolean" },
        },
      },
    },
  },

  // ---------- Outlook ----------
  {
    type: "function",
    function: {
      name: "outlook_list_messages",
      description: "List the user's most recent Outlook messages.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Optional search term." },
          max_results: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "outlook_send_email",
      description: "Send an email via the user's Outlook/Microsoft 365 account.",
      parameters: {
        type: "object",
        required: ["to", "subject", "body"],
        properties: {
          to: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" },
          html: { type: "boolean" },
        },
      },
    },
  },

  // ---------- Google Calendar ----------
  {
    type: "function",
    function: {
      name: "gcal_list_events",
      description: "List upcoming Google Calendar events.",
      parameters: {
        type: "object",
        properties: {
          max_results: { type: "number" },
          query: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gcal_create_event",
      description: "Create a Google Calendar event.",
      parameters: {
        type: "object",
        required: ["summary", "start", "end"],
        properties: {
          summary: { type: "string" },
          description: { type: "string" },
          start: { type: "string", description: "ISO 8601 datetime." },
          end: { type: "string", description: "ISO 8601 datetime." },
          attendees: { type: "array", items: { type: "string" }, description: "Email addresses." },
        },
      },
    },
  },

  // ---------- HubSpot ----------
  {
    type: "function",
    function: {
      name: "hubspot_search_contacts",
      description: "Search HubSpot contacts.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "hubspot_create_contact",
      description: "Create a HubSpot contact.",
      parameters: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string" },
          firstname: { type: "string" },
          lastname: { type: "string" },
          company: { type: "string" },
          phone: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "hubspot_create_note",
      description: "Create a note in HubSpot, optionally associated with a contact.",
      parameters: {
        type: "object",
        required: ["body"],
        properties: {
          body: { type: "string" },
          contact_id: { type: "string" },
        },
      },
    },
  },

  // ---------- Slack ----------
  {
    type: "function",
    function: {
      name: "business_dna_search",
      description: "Search the current workspace's Business DNA/context for grounded answers. Use this before answering business-specific questions.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search terms or question to match against Business DNA." },
          max_results: { type: "number", description: "Default 8, max 15." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "slack_post_message",
      description: "Post a message to a Slack channel (use channel ID or name like #general).",
      parameters: {
        type: "object",
        required: ["channel", "text"],
        properties: {
          channel: { type: "string" },
          text: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "slack_conversations_list",
      description: "List Slack conversations/channels the bot can access. Use this to resolve a channel name to an ID before reading or posting.",
      parameters: {
        type: "object",
        properties: {
          types: { type: "string", description: "Comma-separated Slack types. Default public_channel,private_channel,im,mpim." },
          limit: { type: "number", description: "Default 100, max 200." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "slack_conversations_history",
      description: "Read recent messages from a Slack conversation by channel ID or #channel name.",
      parameters: {
        type: "object",
        required: ["channel"],
        properties: {
          channel: { type: "string", description: "Slack channel ID or name like #general." },
          limit: { type: "number", description: "Default 20, max 100." },
        },
      },
    },
  },
];

const TOOLS_BY_INTEGRATION: Record<string, string[]> = {
  gmail: ["gmail_list_messages", "gmail_send_email", "gmail_create_draft"],
  google_gmail: ["gmail_list_messages", "gmail_send_email", "gmail_create_draft"],
  outlook: ["outlook_list_messages", "outlook_send_email"],
  microsoft_outlook: ["outlook_list_messages", "outlook_send_email"],
  google_calendar: ["gcal_list_events", "gcal_create_event"],
  gcal: ["gcal_list_events", "gcal_create_event"],
  calendar: ["gcal_list_events", "gcal_create_event"],
  hubspot: ["hubspot_search_contacts", "hubspot_create_contact", "hubspot_create_note"],
  slack: ["slack_post_message", "slack_conversations_list", "slack_conversations_history"],
  business_dna: ["business_dna_search"],
  dna: ["business_dna_search"],
  dna_search: ["business_dna_search"],
};

export function buildToolsFor(requiredIntegrations: string[] | null): ToolDef[] {
  if (!requiredIntegrations?.length) return ALL_TOOLS;
  const wanted = new Set<string>();
  for (const integ of requiredIntegrations) {
    const key = integ.toLowerCase().trim();
    const names = TOOLS_BY_INTEGRATION[key];
    if (names) names.forEach((n) => wanted.add(n));
  }
  wanted.add("business_dna_search");
  if (!wanted.size) return ALL_TOOLS;
  return ALL_TOOLS.filter((t) => wanted.has(t.function.name));
}

// ---------- Tool runner ----------

async function gmailToken(ctx: Ctx) {
  return (
    (await getValidAccessToken(ctx.supabase, ctx.userId, "google_gmail", ctx.workspaceId)) ||
    (await getValidAccessToken(ctx.supabase, ctx.userId, "google", ctx.workspaceId))
  );
}
async function outlookToken(ctx: Ctx) {
  return (
    (await getValidAccessToken(ctx.supabase, ctx.userId, "microsoft_outlook", ctx.workspaceId)) ||
    (await getValidAccessToken(ctx.supabase, ctx.userId, "microsoft", ctx.workspaceId))
  );
}
async function gcalToken(ctx: Ctx) {
  return (
    (await getValidAccessToken(ctx.supabase, ctx.userId, "google_calendar", ctx.workspaceId)) ||
    (await getValidAccessToken(ctx.supabase, ctx.userId, "google", ctx.workspaceId))
  );
}
async function hubspotToken(ctx: Ctx) {
  return await getValidAccessToken(ctx.supabase, ctx.userId, "hubspot", ctx.workspaceId);
}
async function slackToken(ctx: Ctx) {
  return await getValidAccessToken(ctx.supabase, ctx.userId, "slack", ctx.workspaceId);
}

function tokenize(value: string): string[] {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9åäö]+/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function scoreText(text: string, query: string): number {
  const haystack = String(text || "").toLowerCase();
  const terms = Array.from(new Set(tokenize(query)));
  if (!terms.length) return 1;
  return terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
}

async function resolveSlackChannelId(ctx: Ctx, token: string, channel: string): Promise<string | null> {
  const raw = String(channel || "").trim();
  if (!raw) return null;
  if (/^[CGD][A-Z0-9]+$/i.test(raw)) return raw;
  const target = raw.replace(/^#/, "").toLowerCase();
  const r = await fetch("https://slack.com/api/conversations.list?types=public_channel,private_channel,im,mpim&limit=200", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) return null;
  const match = (j.channels || []).find((c: any) => String(c.name || "").toLowerCase() === target || String(c.id) === raw);
  return match?.id || null;
}

function b64urlEncode(s: string): string {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRfc822(to: string, subject: string, body: string, html?: boolean): string {
  const contentType = html ? "text/html; charset=UTF-8" : "text/plain; charset=UTF-8";
  return [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: ${contentType}`,
    "",
    body,
  ].join("\r\n");
}

export async function runTool(ctx: Ctx, name: string, args: any): Promise<any> {
  args = args || {};
  switch (name) {
    case "business_dna_search": {
      const query = String(args.query || "");
      const max = Math.min(args.max_results ?? 8, 15);
      let db = ctx.supabase
        .from("user_business_data")
        .select("id, title, data_type, source, content, analyzed_content, metadata, workspace_id")
        .limit(300);
      if (ctx.workspaceId) db = db.eq("workspace_id", ctx.workspaceId);
      else db = db.eq("user_id", ctx.userId);
      const { data, error } = await db;
      if (error) return { error: `Business DNA search: ${error.message}` };
      const rows = (data || [])
        .map((row: any) => {
          const body = String(row.analyzed_content || row.content || "");
          const score = scoreText(`${row.title || ""}\n${row.data_type || ""}\n${body}`, query);
          return {
            id: row.id,
            title: row.title,
            data_type: row.data_type,
            source: row.source,
            score: row.id === ctx.brandId ? score + 2 : score,
            excerpt: body.slice(0, 1800),
          };
        })
        .filter((row: any) => row.excerpt && (query ? row.score > 0 : true))
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, max);
      return { results: rows, count: rows.length };
    }

    // ----- Gmail -----
    case "gmail_list_messages": {
      const token = await gmailToken(ctx);
      if (!token) return { error: "Gmail is not connected for this user." };
      const max = Math.min(args.max_results ?? 10, 25);
      const q = args.query ? `&q=${encodeURIComponent(args.query)}` : "";
      const list = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}${q}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!list.ok) return { error: `Gmail list ${list.status}: ${(await list.text()).slice(0, 200)}` };
      const { messages = [] } = await list.json();
      const detailed = await Promise.all(
        messages.slice(0, max).map(async (m: any) => {
          const r = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!r.ok) return { id: m.id };
          const j = await r.json();
          const headers: Record<string, string> = {};
          for (const h of j.payload?.headers || []) headers[h.name] = h.value;
          return {
            id: m.id,
            from: headers.From,
            subject: headers.Subject,
            date: headers.Date,
            snippet: j.snippet,
          };
        }),
      );
      return { messages: detailed };
    }
    case "gmail_send_email": {
      const token = await gmailToken(ctx);
      if (!token) return { error: "Gmail is not connected." };
      const raw = b64urlEncode(buildRfc822(args.to, args.subject, args.body, args.html));
      const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { error: `Gmail send ${r.status}: ${JSON.stringify(j).slice(0, 300)}` };
      return { sent: true, message_id: j.id };
    }
    case "gmail_create_draft": {
      const token = await gmailToken(ctx);
      if (!token) return { error: "Gmail is not connected." };
      const raw = b64urlEncode(buildRfc822(args.to, args.subject, args.body, args.html));
      const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: { raw } }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { error: `Gmail draft ${r.status}: ${JSON.stringify(j).slice(0, 300)}` };
      return { draft: true, draft_id: j.id, message_id: j.message?.id };
    }

    // ----- Outlook -----
    case "outlook_list_messages": {
      const token = await outlookToken(ctx);
      if (!token) return { error: "Outlook is not connected." };
      const max = Math.min(args.max_results ?? 10, 25);
      const search = args.search
        ? `&$search="${encodeURIComponent(args.search)}"`
        : "";
      const r = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$top=${max}&$select=id,subject,bodyPreview,from,receivedDateTime${search}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { error: `Outlook list ${r.status}: ${JSON.stringify(j).slice(0, 300)}` };
      return { messages: j.value || [] };
    }
    case "outlook_send_email": {
      const token = await outlookToken(ctx);
      if (!token) return { error: "Outlook is not connected." };
      const recipients = String(args.to).split(",").map((s: string) => ({
        emailAddress: { address: s.trim() },
      }));
      const r = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            subject: args.subject,
            body: { contentType: args.html ? "HTML" : "Text", content: args.body },
            toRecipients: recipients,
          },
          saveToSentItems: true,
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        return { error: `Outlook send ${r.status}: ${t.slice(0, 300)}` };
      }
      return { sent: true };
    }

    // ----- Google Calendar -----
    case "gcal_list_events": {
      const token = await gcalToken(ctx);
      if (!token) return { error: "Google Calendar is not connected." };
      const max = Math.min(args.max_results ?? 10, 25);
      const q = args.query ? `&q=${encodeURIComponent(args.query)}` : "";
      const now = new Date().toISOString();
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(now)}&maxResults=${max}${q}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { error: `Calendar list ${r.status}: ${JSON.stringify(j).slice(0, 300)}` };
      return { events: j.items || [] };
    }
    case "gcal_create_event": {
      const token = await gcalToken(ctx);
      if (!token) return { error: "Google Calendar is not connected." };
      const r = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: args.summary,
            description: args.description,
            start: { dateTime: args.start },
            end: { dateTime: args.end },
            attendees: (args.attendees || []).map((email: string) => ({ email })),
          }),
        },
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { error: `Calendar create ${r.status}: ${JSON.stringify(j).slice(0, 300)}` };
      return { created: true, event_id: j.id, html_link: j.htmlLink };
    }

    // ----- HubSpot -----
    case "hubspot_search_contacts": {
      const token = await hubspotToken(ctx);
      if (!token) return { error: "HubSpot is not connected." };
      const r = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: args.query || "",
          limit: Math.min(args.limit ?? 10, 50),
          properties: ["email", "firstname", "lastname", "company", "phone"],
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { error: `HubSpot search ${r.status}: ${JSON.stringify(j).slice(0, 300)}` };
      return { contacts: j.results || [] };
    }
    case "hubspot_create_contact": {
      const token = await hubspotToken(ctx);
      if (!token) return { error: "HubSpot is not connected." };
      const properties: Record<string, string> = { email: args.email };
      for (const k of ["firstname", "lastname", "company", "phone"]) {
        if (args[k]) properties[k] = args[k];
      }
      const r = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ properties }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { error: `HubSpot create ${r.status}: ${JSON.stringify(j).slice(0, 300)}` };
      return { created: true, contact_id: j.id };
    }
    case "hubspot_create_note": {
      const token = await hubspotToken(ctx);
      if (!token) return { error: "HubSpot is not connected." };
      const body: any = {
        properties: { hs_note_body: args.body, hs_timestamp: Date.now() },
      };
      if (args.contact_id) {
        body.associations = [{
          to: { id: args.contact_id },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }],
        }];
      }
      const r = await fetch("https://api.hubapi.com/crm/v3/objects/notes", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { error: `HubSpot note ${r.status}: ${JSON.stringify(j).slice(0, 300)}` };
      return { created: true, note_id: j.id };
    }

    // ----- Slack -----
    case "slack_post_message": {
      const token = await slackToken(ctx);
      if (!token) return { error: "Slack is not connected." };
      const r = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ channel: args.channel, text: args.text }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) return { error: `Slack: ${j.error || "post failed"}` };
      return { posted: true, ts: j.ts, channel: j.channel };
    }
  }
  return { error: `Unknown tool: ${name}` };
}
