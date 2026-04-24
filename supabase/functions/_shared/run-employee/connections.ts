// --- Live Connection Search ---

import { getValidAccessToken, getAnyMicrosoftToken as _getAnyMicrosoftToken } from "../oauth/refresh.ts";
import { buildConnectorSearchIntentProfile } from "../connector-search-intent.ts";
import { shouldSearchConnections } from "../connection-search-decision.ts";

export { shouldSearchConnections };

const STOPWORDS = new Set(["this","that","with","from","have","been","were","they","their","what","about","which","when","where","will","would","could","should","there","these","those","some","other","into","more","also","than","then","just","only","very","much","such","like","over","after","before","between","under","each","every","both","most","same","does","doing","done","make","made","know","think","want","need","help","find","give","tell","show","look","come","back","take","well","still","even","here","many","while"]);

export { STOPWORDS };

export interface SkippedProviderDetail {
  provider: string;
  reason: string;
}

const SEARCH_TERM_ALIASES: Record<string, string[]> = {
  "collaborations & partnerships": ["collaboration", "partnership", "partner", "collab", "sponsorship"],
  "complaints & issues": ["complaint", "issue", "problem", "support ticket", "bug"],
  "meetings & calls": ["meeting", "call", "appointment", "invite", "calendar"],
  "emails & messages": ["email", "message", "mail", "thread", "reply"],
  "files & documents": ["file", "document", "attachment", "proposal", "brief"],
  "leads & deals": ["lead", "prospect", "deal", "opportunity"],
  "sales & revenue": ["sale", "order", "revenue", "invoice", "purchase order"],
};

function normalizeSearchTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchTerms(query: string, topic?: string): string[] {
  const normalizedQuery = normalizeSearchTerm(query);
  const conciseQuery = normalizedQuery
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .slice(0, 5)
    .join(" ");

  const aliasTerms = topic
    ? SEARCH_TERM_ALIASES[topic.toLowerCase()] || [normalizeSearchTerm(topic)]
    : [];

  return Array.from(
    new Set(
      [normalizedQuery, conciseQuery, ...aliasTerms]
        .map((term) => normalizeSearchTerm(term))
        .filter((term) => term.length > 2),
    ),
  ).slice(0, 4);
}

function isGenericRecentFileQuery(query: string): boolean {
  const normalized = normalizeSearchTerm(query);
  const asksForRecency = /\b(recent|latest|last|newest|new|most\s+recent)\b/i.test(normalized);
  const asksForFiles = /\b(documents?|docs?|files?|spreadsheets?|sheets?|slides?|presentations?)\b/i.test(normalized);
  const asksForNamedFile = /\b(about|regarding|named|called|titled|containing|with)\b/i.test(normalized);
  return asksForRecency && asksForFiles && !asksForNamedFile;
}

function formatProviderName(provider: string): string {
  if (provider === "microsoft") return "Microsoft 365";
  if (provider === "microsoft_outlook") return "Outlook";
  if (provider === "microsoft_calendar") return "Calendar";
  if (provider === "microsoft_onedrive") return "OneDrive";
  if (provider === "microsoft_onenote") return "OneNote";
  if (provider === "google_calendar") return "Google Calendar";
  if (provider === "google_drive") return "Google Drive";
  if (provider === "google_docs") return "Google Docs";
  if (provider === "google_sheets") return "Google Sheets";
  if (provider === "google_slides") return "Google Slides";
  if (provider === "google_gmail") return "Gmail";
  if (provider === "slack") return "Slack";
  if (provider === "hubspot") return "HubSpot";
  if (provider === "stripe") return "Stripe";
  return provider;
}

// Check if any Microsoft sub-service is connected
function isMicrosoftProvider(provider: string): boolean {
  return provider === "microsoft" || provider.startsWith("microsoft_");
}

// Get token for any available Microsoft sub-service (delegates to shared helper)
async function getAnyMicrosoftToken(supabaseAdmin: any, userId: string): Promise<string | null> {
  return _getAnyMicrosoftToken(supabaseAdmin, userId);
}

function buildNoMatchConnectionContext(
  topic: string,
  searchedProviders: string[],
  skippedProviderDetails: SkippedProviderDetail[],
  reason: string,
): string {
  const searchedSummary = searchedProviders.length > 0
    ? searchedProviders.map(formatProviderName).join(", ")
    : "none";
  const skippedSummary = skippedProviderDetails.length > 0
    ? skippedProviderDetails.map(({ provider, reason }) => `${formatProviderName(provider)} (${reason})`).join(", ")
    : "none";

  return `\n\n## Connected Sources (Live Search Results)\nUse this section as the primary source of truth for requests about live emails, messages, files, meetings, or collaboration activity. Answer the lookup request directly before offering any ideas.\n\n### Lookup Outcome\n${reason} for **${topic}**.\n\n- **Searched sources:** ${searchedSummary}\n- **Skipped sources:** ${skippedSummary}\n\n**Important:** Treat this as a real lookup outcome. Do **not** invent collaboration requests, emails, files, meetings, or partnership opportunities when no live matches were found.`;
}

// Delegates to the unified shared OAuth refresh helper.
// All providers (Microsoft, Google, HubSpot, Zoom, Slack) are handled there.
export async function getValidProviderToken(supabaseAdmin: any, userId: string, provider: string): Promise<string | null> {
  return getValidAccessToken(supabaseAdmin, userId, provider);
}

export async function searchMicrosoftData(token: string, query: string, topic?: string, options?: { searchEmails?: boolean; searchFiles?: boolean }): Promise<{ emails: string[]; files: string[] }> {
  const { searchEmails = true, searchFiles = true } = options || {};
  const results = { emails: [] as string[], files: [] as string[] };
  const seenEmails = new Set<string>();
  const seenFiles = new Set<string>();
  const searchTerms = buildSearchTerms(query, topic);
  const isGenericRecentFiles = isGenericRecentFileQuery(query);
  if (searchTerms.length === 0) return results;

  for (const term of searchTerms) {
    const encodedTerm = encodeURIComponent(term.replace(/"/g, " ").trim());
    if (!encodedTerm) continue;

    try {
      if (searchEmails && results.emails.length < 5) {
        const emailRes = await fetch(
          `https://graph.microsoft.com/v1.0/me/messages?$search="${encodedTerm}"&$top=5&$select=subject,bodyPreview,from,receivedDateTime`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              ConsistencyLevel: "eventual",
            },
          },
        );
        if (emailRes.ok) {
          const data = await emailRes.json();
          for (const msg of (data.value || [])) {
            const subject = msg.subject || "No subject";
            const from = msg.from?.emailAddress?.address || "unknown";
            const receivedAt = msg.receivedDateTime?.slice(0, 10) || "";
            const preview = (msg.bodyPreview || "").slice(0, 300);
            const key = `${subject}|${from}|${receivedAt}`;
            if (seenEmails.has(key)) continue;
            seenEmails.add(key);
            results.emails.push(`📧 SUBJECT: "${subject}" | FROM: ${from} | DATE: ${receivedAt}\nBODY: ${preview}`);
            if (results.emails.length >= 5) break;
          }
        }
      }
    } catch (e) {
      console.error("Microsoft email search error:", e);
    }

    try {
      if (searchFiles && results.files.length < 5) {
        if (isGenericRecentFiles) {
          const fileRes = await fetch(
            `https://graph.microsoft.com/v1.0/me/drive/recent?$top=5`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (fileRes.ok) {
            const data = await fileRes.json();
            for (const file of (data.value || [])) {
              const fileKey = file.webUrl || `${file.name}|${file.lastModifiedDateTime || ""}`;
              if (seenFiles.has(fileKey)) continue;
              seenFiles.add(fileKey);
              results.files.push(`📄 **${file.name}** (modified: ${file.lastModifiedDateTime?.slice(0, 10) || ""}) — [link](${file.webUrl || ""})`);
              if (results.files.length >= 5) break;
            }
          }
          if (results.files.length >= 5) break;
          continue;
        }
        const fileRes = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodedTerm}')?$top=5&$select=name,webUrl,lastModifiedDateTime,size`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (fileRes.ok) {
          const data = await fileRes.json();
          for (const file of (data.value || [])) {
            const fileKey = file.webUrl || `${file.name}|${file.lastModifiedDateTime || ""}`;
            if (seenFiles.has(fileKey)) continue;
            seenFiles.add(fileKey);
            results.files.push(`📄 **${file.name}** (modified: ${file.lastModifiedDateTime?.slice(0, 10) || ""}) — [link](${file.webUrl || ""})`);
            if (results.files.length >= 5) break;
          }
        }
      }
    } catch (e) {
      console.error("Microsoft file search error:", e);
    }

    if (results.emails.length >= 5 && results.files.length >= 5) break;
  }

  return results;
}

export async function searchOneNoteData(token: string, query: string, topic?: string): Promise<string[]> {
  const results: string[] = [];
  const seenPages = new Set<string>();
  const searchTerms = buildSearchTerms(query, topic);
  if (searchTerms.length === 0) return results;

  for (const term of searchTerms) {
    const encodedTerm = encodeURIComponent(term.replace(/"/g, " ").trim());
    if (!encodedTerm) continue;

    try {
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/onenote/pages?$search=${encodedTerm}&$top=5&$select=title,createdDateTime,lastModifiedDateTime,links&$orderby=lastModifiedDateTime desc`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        for (const page of (data.value || [])) {
          const title = page.title || "Untitled";
          const modified = page.lastModifiedDateTime?.slice(0, 10) || page.createdDateTime?.slice(0, 10) || "";
          const link = page.links?.oneNoteWebUrl?.href || "";
          const key = `${title}|${modified}`;
          if (seenPages.has(key)) continue;
          seenPages.add(key);
          results.push(`📝 **${title}** (modified: ${modified})${link ? ` — [link](${link})` : ""}`);
          if (results.length >= 5) break;
        }
      }
    } catch (e) {
      console.error("OneNote search error:", e);
    }

    if (results.length >= 5) break;
  }

  return results;
}

export async function searchSlackData(token: string, query: string, topic?: string): Promise<string[]> {
  const results: string[] = [];
  const seenResults = new Set<string>();
  const searchTerms = buildSearchTerms(query, topic);
  if (searchTerms.length === 0) return results;

  const lowerTerms = searchTerms.map(t => t.toLowerCase());

  try {
    // Step 1: List channels the bot has access to
    const channelsRes = await fetch(
      `https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=50&exclude_archived=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!channelsRes.ok) return results;
    const channelsData = await channelsRes.json();
    if (!channelsData.ok || !channelsData.channels) return results;

    const channels = channelsData.channels.slice(0, 20); // Check top 20 channels

    // Step 2: Fetch recent history from each channel and filter by search terms
    const channelChecks = channels.map(async (channel: any) => {
      try {
        const histRes = await fetch(
          `https://slack.com/api/conversations.history?channel=${channel.id}&limit=30`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!histRes.ok) return;
        const histData = await histRes.json();
        if (!histData.ok || !histData.messages) return;

        for (const msg of histData.messages) {
          if (results.length >= 5) return;
          const text = (msg.text || "").toLowerCase();
          // Check if any search term appears in the message
          const matches = lowerTerms.some(term => 
            term.split(/\s+/).some(word => word.length > 2 && text.includes(word))
          );
          if (!matches && lowerTerms.length > 0) continue;

          const user = msg.user || "unknown";
          const ts = msg.ts ? new Date(parseFloat(msg.ts) * 1000).toISOString().slice(0, 10) : "";
          const preview = (msg.text || "").slice(0, 300);
          const key = `${channel.name}|${user}|${ts}|${preview.slice(0, 50)}`;
          if (seenResults.has(key)) continue;
          seenResults.add(key);
          results.push(`💬 **#${channel.name}** (${user}, ${ts}): ${preview}`);
        }
      } catch (e) {
        console.error(`Slack channel ${channel.name} history error:`, e);
      }
    });

    await Promise.all(channelChecks);
  } catch (e) {
    console.error("Slack search error:", e);
  }

  return results.slice(0, 5);
}

// --- Google Workspace search (query-scoped, low-usage) ---

export async function searchGmailData(token: string, query: string, topic?: string): Promise<string[]> {
  const results: string[] = [];
  const searchTerms = buildSearchTerms(query, topic);
  // For generic "show me my recent emails" queries, list the inbox without a search term.
  // Detect a generic intent by checking if query matches recent/latest/last keywords.
  const isGenericRecent = /\b(recent|latest|last|new|inbox|unread|my\s+gmails?|my\s+emails?)\b/i.test(query) &&
    !/\b(about|regarding|from|partner|collab|complaint|deal|invoice|order)\b/i.test(query);
  // Build query string: empty for generic recent queries, otherwise OR-joined terms.
  const q = isGenericRecent || searchTerms.length === 0
    ? ""
    : searchTerms.slice(0, 2).join(" OR ");
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5${q ? `&q=${encodeURIComponent(q)}` : ""}`;
    const listRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!listRes.ok) {
      console.error("[gmail] list failed:", listRes.status, (await listRes.text()).slice(0, 200));
      return results;
    }
    const listData = await listRes.json();
    const ids: string[] = (listData.messages || []).slice(0, 5).map((m: any) => m.id);
    await Promise.all(ids.map(async (id: string) => {
      try {
        const r = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!r.ok) return;
        const d = await r.json();
        const headers = d.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === "Subject")?.value || "No Subject";
        const from = headers.find((h: any) => h.name === "From")?.value || "Unknown";
        const date = headers.find((h: any) => h.name === "Date")?.value || "";
        const snippet = (d.snippet || "").slice(0, 300);
        results.push(`📧 SUBJECT: "${subject}" | FROM: ${from} | DATE: ${date}\nBODY: ${snippet}`);
      } catch { /* skip */ }
    }));
  } catch (e) { console.error("Gmail search error:", e); }
  return results.slice(0, 5);
}

export async function searchGoogleDriveData(token: string, query: string, topic?: string): Promise<string[]> {
  const results: string[] = [];
  const searchTerms = buildSearchTerms(query, topic);
  const isGenericRecent = isGenericRecentFileQuery(query) || (/\b(my\s+drive)\b/i.test(query) && !/\b(about|regarding|named|called|titled)\b/i.test(query));

  // Generic recent → just list recent non-trashed files.
  if (isGenericRecent || searchTerms.length === 0) {
    try {
      const r = await fetch(
        `https://www.googleapis.com/drive/v3/files?pageSize=5&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink)&q=${encodeURIComponent("trashed=false")}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (r.ok) {
        const d = await r.json();
        for (const f of (d.files || []).slice(0, 5)) {
          const icon = f.mimeType?.includes("document") ? "📄" : f.mimeType?.includes("spreadsheet") ? "📊" : f.mimeType?.includes("presentation") ? "📽️" : "📁";
          const modified = f.modifiedTime?.slice(0, 10) || "";
          results.push(`${icon} **${f.name}** (modified: ${modified})${f.webViewLink ? ` — [link](${f.webViewLink})` : ""}`);
        }
      } else {
        if (r.status === 401 || r.status === 403) throw new Error("google_drive_permission_denied");
        console.error("[drive] list failed:", r.status, (await r.text()).slice(0, 200));
      }
    } catch (e) { console.error("Drive list error:", e); }
    return results;
  }

  for (const term of searchTerms.slice(0, 2)) {
    if (results.length >= 5) break;
    const safe = term.replace(/'/g, "\\'");
    // Parens around the OR group; trashed=false applied to the whole filter.
    const q = encodeURIComponent(`(name contains '${safe}' or fullText contains '${safe}') and trashed=false`);
    try {
      const r = await fetch(
        `https://www.googleapis.com/drive/v3/files?pageSize=5&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink)&q=${q}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) throw new Error("google_drive_permission_denied");
        console.error("[drive] search failed:", r.status, (await r.text()).slice(0, 200));
        continue;
      }
      const d = await r.json();
      for (const f of (d.files || [])) {
        if (results.length >= 5) break;
        const icon = f.mimeType?.includes("document") ? "📄" : f.mimeType?.includes("spreadsheet") ? "📊" : f.mimeType?.includes("presentation") ? "📽️" : "📁";
        const modified = f.modifiedTime?.slice(0, 10) || "";
        results.push(`${icon} **${f.name}** (modified: ${modified})${f.webViewLink ? ` — [link](${f.webViewLink})` : ""}`);
      }
    } catch (e) {
      if (e instanceof Error && e.message === "google_drive_permission_denied") throw e;
      console.error("Drive search error:", e);
    }
  }
  return results;
}

export async function searchGoogleCalendarData(token: string, query: string, topic?: string): Promise<string[]> {
  const results: string[] = [];
  const searchTerms = buildSearchTerms(query, topic);
  if (searchTerms.length === 0) return results;
  const q = searchTerms[0];
  try {
    const now = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const r = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(q)}&timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(future)}&maxResults=5&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!r.ok) return results;
    const d = await r.json();
    for (const ev of (d.items || []).slice(0, 5)) {
      const start = (ev.start?.dateTime || ev.start?.date || "").slice(0, 16).replace("T", " ");
      const attendees = (ev.attendees || []).length;
      results.push(`📅 **${ev.summary || "Untitled"}** — ${start} (${attendees} attendees)`);
    }
  } catch (e) { console.error("Calendar search error:", e); }
  return results;
}

export async function searchHubspotData(token: string, query: string, topic?: string): Promise<string[]> {
  const results: string[] = [];
  const searchTerms = buildSearchTerms(query, topic);
  if (searchTerms.length === 0) return results;
  const q = searchTerms[0];
  try {
    // Search contacts
    const contactsRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, limit: 5, properties: ["firstname", "lastname", "email", "lifecyclestage"] }),
    });
    if (contactsRes.ok) {
      const d = await contactsRes.json();
      for (const c of (d.results || []).slice(0, 3)) {
        results.push(`👤 ${c.properties?.firstname || ""} ${c.properties?.lastname || ""} (${c.properties?.email || "no email"}) — stage: ${c.properties?.lifecyclestage || "unknown"}`);
      }
    }
    // Search deals
    const dealsRes = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, limit: 5, properties: ["dealname", "amount", "dealstage"] }),
    });
    if (dealsRes.ok) {
      const d = await dealsRes.json();
      for (const deal of (d.results || []).slice(0, 3)) {
        results.push(`💼 ${deal.properties?.dealname || "Unnamed"} — $${deal.properties?.amount || "0"} (${deal.properties?.dealstage || "unknown"})`);
      }
    }
  } catch (e) { console.error("HubSpot search error:", e); }
  return results.slice(0, 6);
}

export async function searchStripeData(token: string, query: string, topic?: string): Promise<string[]> {
  const results: string[] = [];
  const searchTerms = buildSearchTerms(query, topic);
  const q = searchTerms[0] || "";
  const headers = { Authorization: `Bearer ${token}`, "Stripe-Version": "2025-08-27.basil" };
  try {
    // Recent customers (top 5) — also filter by name/email if query is specific.
    const custUrl = q
      ? `https://api.stripe.com/v1/customers/search?query=${encodeURIComponent(`name~"${q}" OR email~"${q}"`)}&limit=5`
      : `https://api.stripe.com/v1/customers?limit=5`;
    const custRes = await fetch(custUrl, { headers });
    if (custRes.ok) {
      const data = await custRes.json();
      for (const c of (data.data || []).slice(0, 5)) {
        const created = c.created ? new Date(c.created * 1000).toISOString().slice(0, 10) : "";
        results.push(`👤 **${c.name || c.email || c.id}** (${c.email || "no email"}) — created ${created}`);
      }
    }
    // Recent charges
    const chargesRes = await fetch(`https://api.stripe.com/v1/charges?limit=10`, { headers });
    if (chargesRes.ok) {
      const data = await chargesRes.json();
      for (const ch of (data.data || []).slice(0, 5)) {
        if (results.length >= 12) break;
        const amount = ((ch.amount || 0) / 100).toFixed(2);
        const created = ch.created ? new Date(ch.created * 1000).toISOString().slice(0, 10) : "";
        const status = ch.status || "unknown";
        const cust = ch.billing_details?.email || ch.receipt_email || ch.customer || "no customer";
        results.push(`💳 **${amount} ${(ch.currency || "").toUpperCase()}** — ${status} (${cust}) — ${created}`);
      }
    }
    // Active subscriptions
    const subsRes = await fetch(`https://api.stripe.com/v1/subscriptions?status=active&limit=5`, { headers });
    if (subsRes.ok) {
      const data = await subsRes.json();
      for (const s of (data.data || []).slice(0, 5)) {
        if (results.length >= 18) break;
        const item = s.items?.data?.[0];
        const amount = item?.price?.unit_amount ? (item.price.unit_amount / 100).toFixed(2) : "?";
        const interval = item?.price?.recurring?.interval || "month";
        const cur = (item?.price?.currency || "").toUpperCase();
        results.push(`🔁 Subscription **${amount} ${cur}/${interval}** — status ${s.status} — customer ${s.customer || "n/a"}`);
      }
    }
  } catch (e) { console.error("Stripe search error:", e); }
  return results.slice(0, 18);
}

export async function searchZoomData(token: string, query: string, topic?: string): Promise<string[]> {
  const results: string[] = [];
  const searchTerms = buildSearchTerms(query, topic);
  const lowerTerms = searchTerms.map((t) => t.toLowerCase());
  const matchTopic = (topic_: string) =>
    lowerTerms.length === 0 || lowerTerms.some((term) =>
      term.split(/\s+/).some((w) => w.length > 2 && topic_.toLowerCase().includes(w))
    );
  try {
    const upRes = await fetch(`https://api.zoom.us/v2/users/me/meetings?type=upcoming&page_size=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (upRes.ok) {
      const data = await upRes.json();
      for (const m of (data.meetings || [])) {
        if (results.length >= 5) break;
        const t_ = (m.topic || "Untitled").toString();
        if (!matchTopic(t_)) continue;
        const start = (m.start_time || "").slice(0, 16).replace("T", " ");
        results.push(`📹 **${t_}** — ${start} (${m.duration || 0} min)${m.join_url ? ` — [join](${m.join_url})` : ""}`);
      }
    }
    if (results.length < 5) {
      const pastRes = await fetch(`https://api.zoom.us/v2/users/me/meetings?type=previous_meetings&page_size=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pastRes.ok) {
        const data = await pastRes.json();
        for (const m of (data.meetings || [])) {
          if (results.length >= 5) break;
          const t_ = (m.topic || "Untitled").toString();
          if (!matchTopic(t_)) continue;
          const start = (m.start_time || "").slice(0, 16).replace("T", " ");
          results.push(`📹 **${t_}** (past) — ${start}`);
        }
      }
    }
  } catch (e) { console.error("Zoom search error:", e); }
  return results.slice(0, 5);
}


// Skips providers that are marked 'expired' in user_connections to avoid wasted
// refresh attempts (and cloud usage) on legacy/revoked grants.
async function getAnyGoogleToken(supabaseAdmin: any, userId: string): Promise<string | null> {
  // Prefer the granular per-service tokens; the legacy "google" provider is tried last.
  const candidates = ["google_gmail", "google_drive", "google_docs", "google_sheets", "google_slides", "google_calendar", "google"];
  // Look up which Google connections are still healthy
  const { data: conns } = await supabaseAdmin
    .from("user_connections")
    .select("provider, status")
    .eq("user_id", userId)
    .like("provider", "google%");
  const expired = new Set((conns || []).filter((c: any) => c.status === "expired").map((c: any) => c.provider));
  for (const p of candidates) {
    if (expired.has(p)) continue; // skip known-expired to save refresh calls
    const t = await getValidAccessToken(supabaseAdmin, userId, p);
    if (t) return t;
  }
  return null;
}

async function getGoogleTokenForProvider(
  supabaseAdmin: any,
  userId: string,
  provider: "google_gmail" | "google_drive" | "google_calendar",
): Promise<string | null> {
  const candidates = {
    google_gmail: ["google_gmail", "google"],
    google_drive: ["google_drive", "google"],
    google_calendar: ["google_calendar", "google"],
  }[provider];

  for (const candidate of candidates) {
    const token = await getValidAccessToken(supabaseAdmin, userId, candidate);
    if (token) return token;
  }

  return null;
}

// --- Per-provider intent detection ---
// If the user explicitly names a provider, only search that one (saves usage).
const PROVIDER_NAME_PATTERNS: { keys: RegExp; providers: string[] }[] = [
  { keys: /\b(gmail|g[\s-]?mail)\b/i, providers: ["google_gmail"] },
  // "google docs", "google documents", "google files", "google drive", "gdrive", "google sheets", "google slides"
  { keys: /\b(google\s*(docs?|documents?|files?|drives?|sheets?|slides?)|gdrive)\b/i, providers: ["google_drive"] },
  { keys: /\b(google\s*calendar|gcal)\b/i, providers: ["google_calendar"] },
  // Bare "google" (no specific sub-tool) — assume Drive only when paired with file/doc keywords; otherwise fan out.
  { keys: /\bgoogle\b(?!\s*(docs?|documents?|files?|drives?|sheets?|slides?|calendar|gcal|mail))/i, providers: ["google_gmail", "google_drive", "google_calendar"] },
  { keys: /\b(outlook)\b/i, providers: ["microsoft_outlook"] },
  { keys: /\b(onedrive|one\s*drive|sharepoint)\b/i, providers: ["microsoft_onedrive"] },
  { keys: /\b(onenote|one\s*note)\b/i, providers: ["microsoft_onenote"] },
  { keys: /\b(microsoft|teams|m365|office\s*365)\b/i, providers: ["microsoft_outlook", "microsoft_onedrive", "microsoft_onenote"] },
  { keys: /\bslack\b/i, providers: ["slack"] },
  { keys: /\b(hubspot|hub\s*spot|crm)\b/i, providers: ["hubspot"] },
  { keys: /\b(zoom|webinar)\b/i, providers: ["zoom"] },
  { keys: /\b(stripe|payment\w*|charge\w*|invoice\w*|mrr|arr|revenue|subscriber\w*|subscription\w*|payout\w*|refund\w*|checkout)\b/i, providers: ["stripe"] },
  // Generic file/doc keywords without a provider name → fan out to all file/doc providers (Google Drive + OneDrive)
  { keys: /\b(documents?|docs?|files?|spreadsheets?|sheets?|slides?|presentations?)\b/i, providers: ["google_drive", "microsoft_onedrive"] },
  // Generic email keywords without a provider name → fan out to email providers
  { keys: /\b(emails?|mails?|inbox|messages?)\b/i, providers: ["google_gmail", "microsoft_outlook"] },
  // Generic calendar keywords → fan out to calendar providers
  { keys: /\b(calendar|schedule|meetings?|appointments?|events?)\b/i, providers: ["google_calendar", "microsoft_outlook"] },
];

export function detectNamedProviders(query: string): string[] {
  if (!query) return [];
  const matched = new Set<string>();
  for (const { keys, providers } of PROVIDER_NAME_PATTERNS) {
    if (keys.test(query)) providers.forEach((p) => matched.add(p));
  }
  return Array.from(matched);
}

// Narrow generic intent (e.g. "documents", "emails", "meetings") to ONLY the
// providers the user actually has connected. This prevents the AI from saying
// it checked OneDrive when only Google Drive is connected.
// If the user explicitly named a provider (e.g. "gmail", "onedrive"), we keep
// the original list so they get an accurate "not connected" message.
export function narrowProvidersByConnections(
  detectedProviders: string[],
  connectedProviders: string[],
  query: string,
): string[] {
  if (detectedProviders.length === 0) return [];
  // If the user explicitly named a specific provider in the query, do not narrow.
  const explicitProviderRegex = /\b(gmail|outlook|onedrive|onenote|slack|hubspot|zoom|teams|sharepoint|gdrive|gcal|stripe|google\s*(docs?|drives?|sheets?|slides?|calendar|mail))\b/i;
  if (explicitProviderRegex.test(query)) return detectedProviders;

  const connectedSet = new Set<string>();
  for (const p of connectedProviders) {
    connectedSet.add(p);
    // Legacy aggregate "google" / "microsoft" cover their sub-services
    if (p === "google") {
      ["google_gmail", "google_drive", "google_calendar", "google_docs", "google_sheets", "google_slides"].forEach((x) => connectedSet.add(x));
    }
    if (p === "microsoft") {
      ["microsoft_outlook"].forEach((x) => connectedSet.add(x));
    }
    if (p === "microsoft_calendar") {
      ["microsoft_outlook"].forEach((x) => connectedSet.add(x));
    }
  }
  const narrowed = detectedProviders.filter((p) => connectedSet.has(p));
  // If nothing matches (user asked for X but has none of those connected), keep
  // the original list so the skip message correctly says "not connected".
  return narrowed.length > 0 ? narrowed : detectedProviders;
}

// Human-readable inventory of which integrations the user has connected vs not.
// Surfaced into the AI prompt so it never references disconnected tools.
const ALL_TRACKED_PROVIDERS = [
  "google_gmail", "google_drive", "google_calendar",
  "microsoft_outlook", "microsoft_onedrive", "microsoft_onenote",
  "slack", "hubspot", "zoom", "stripe",
];

export function buildConnectedToolsInventory(connectedProviders: string[]): string {
  const connectedSet = new Set<string>();
  for (const p of connectedProviders) {
    connectedSet.add(p);
    if (p === "google") ["google_gmail", "google_drive", "google_calendar"].forEach((x) => connectedSet.add(x));
    if (p === "microsoft") ["microsoft_outlook"].forEach((x) => connectedSet.add(x));
    if (p === "microsoft_calendar") ["microsoft_outlook"].forEach((x) => connectedSet.add(x));
  }
  const connected = ALL_TRACKED_PROVIDERS.filter((p) => connectedSet.has(p));
  const notConnected = ALL_TRACKED_PROVIDERS.filter((p) => !connectedSet.has(p));

  const connectedList = connected.length > 0
    ? connected.map((p) => `- ✅ ${formatProviderName(p)}`).join("\n")
    : "- (none yet)";
  const notConnectedList = notConnected.length > 0
    ? notConnected.map((p) => `- ❌ ${formatProviderName(p)} (not connected)`).join("\n")
    : "- (all integrations connected)";

  return `\n\n## 🔌 User's Connected Integrations Inventory\nThis is the AUTHORITATIVE list of integrations the user has connected to their account. Use this to interpret generic questions correctly:\n- If the user asks about "documents" or "files" and only Google Drive is connected, they mean Google Drive. Do NOT mention OneDrive.\n- If the user asks about "emails" and only Gmail is connected, they mean Gmail. Do NOT mention Outlook.\n- If the user asks about a tool that is NOT connected, say plainly it isn't connected yet and suggest connecting it under Settings → Connections.\n- NEVER claim to have searched a tool that is marked ❌ below.\n\n### Connected\n${connectedList}\n\n### Not connected\n${notConnectedList}\n`;
}

// --- Intent Analysis (shouldSearchConnections lives in connection-search-decision.ts) ---

export function extractQueryTopic(query: string): string {
  if (!query || query.length < 3) return "your request";
  const q = query.toLowerCase().trim();
  const topicPatterns: [RegExp, string][] = [
    [/\b(my|our|the)?\s*(last|latest|recent)\s*\d*\s*(documents?|docs?|files?|attachments?)\b/i, "recent documents"],
    [/\b(my|our|the)?\s*(last|latest|recent)\s*\d*\s*(emails?|mails?|messages?)\b/i, "recent messages"],
    [/\b(my|our|the)?\s*(last|latest|recent)\s*\d*\s*(meetings?|events?|appointments?|calendar)\b/i, "recent meetings"],
    [/\bcollabs?\b/i, "collaborations & partnerships"],
    [/\b(?:any|are there|check for|find)\b.{0,10}\b(collaborat\w*|partnership\w*)/i, "collaborations & partnerships"],
    [/\b(?:any|are there|check for|find)\b.{0,10}\b(complaint\w*|issue\w*|problem\w*)/i, "complaints & issues"],
    [/\b(?:any|are there|check for)\b.{0,10}\b(meeting\w*|call\w*|appointment\w*)/i, "meetings & calls"],
    [/\b(?:any|are there|check for)\b.{0,10}\b(email\w*|message\w*|mail\w*)/i, "emails & messages"],
    [/\b(?:any|are there|check for)\b.{0,10}\b(file\w*|document\w*|attachment\w*)/i, "files & documents"],
    [/\b(?:any|are there|check for)\b.{0,10}\b(lead\w*|prospect\w*|deal\w*)/i, "leads & deals"],
    [/\b(?:any|are there|check for)\b.{0,10}\b(sale\w*|revenue\w*|order\w*)/i, "sales & revenue"],
    [/\b(improve|optimize|enhance|boost|grow)\b.{0,20}\b(\w+)/i, "$2 improvement"],
    [/\b(strategy|plan|roadmap)\b/i, "strategy planning"],
    [/\b(marketing|campaign|ads?|advertis\w*)/i, "marketing strategy"],
    [/\b(social\s*media|instagram|twitter|linkedin|tiktok|facebook)/i, "social media"],
    [/\b(content|blog|article|post|copy)/i, "content creation"],
    [/\b(brand|branding|identity)/i, "branding"],
    [/\b(compet\w+|market\s*research|industry)/i, "competitive analysis"],
    [/\b(customer|audience|target|persona)/i, "customer insights"],
    [/\b(pricing|price|cost|subscription)/i, "pricing strategy"],
    [/\b(hiring|recruit|team|employee)/i, "team & hiring"],
  ];
  for (const [pattern, topic] of topicPatterns) {
    if (pattern.test(q)) return topic;
  }
  const words = q.replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
  if (words.length >= 2) return words.slice(0, 3).join(" ");
  if (words.length === 1) return words[0];
  return "your request";
}

export function getProviderSearchLabel(provider: string, topic?: string): string {
  const suffix = topic ? ` for ${topic}` : "";
  if (provider === "microsoft") return `Peeking into your Microsoft 365${suffix}`;
  if (provider === "microsoft_outlook") return `Peeking into your Outlook inbox${suffix}`;
  if (provider === "microsoft_onedrive") return `Looking through your OneDrive${suffix}`;
  if (provider === "microsoft_onenote") return `Flipping through your OneNote pages${suffix}`;
  if (provider === "google_gmail") return `Peeking into your Gmail${suffix}`;
  if (provider === "google_calendar") return `Checking your Google Calendar${suffix}`;
  if (provider === "google_drive") return `Looking through your Google Drive${suffix}`;
  if (provider === "google_docs") return `Skimming your Google Docs${suffix}`;
  if (provider === "google_sheets") return `Scanning your Google Sheets${suffix}`;
  if (provider === "google_slides") return `Browsing your Google Slides${suffix}`;
  if (provider === "slack") return `Listening in on your Slack${suffix}`;
  if (provider === "zoom") return `Checking your Zoom meetings${suffix}`;
  if (provider === "hubspot") return `Digging through your HubSpot${suffix}`;
  if (provider === "stripe") return `Pulling your Stripe payments${suffix}`;
  return `Searching ${formatProviderName(provider)}${suffix}`;
}

export function getProviderSkipLabel(provider: string, reason: string): string {
  const friendly = (r: string) => {
    if (r === "not connected") return "not connected yet";
    if (r === "not requested in this query") return "not needed for this one";
    if (r === "token expired or missing") return "needs reconnecting";
    if (r === "search failed") return "couldn't reach it";
    return r;
  };
  const r = friendly(reason);
  if (provider === "microsoft") return `Skipping Microsoft 365 — ${r}`;
  if (provider.startsWith("microsoft_")) return `Skipping ${formatProviderName(provider)} — ${r}`;
  if (provider === "slack") return `Skipping Slack — ${r}`;
  if (provider === "zoom") return `Skipping Zoom — ${r}`;
  if (provider === "hubspot") return `Skipping HubSpot — ${r}`;
  if (provider === "stripe") return `Skipping Stripe — ${r}`;
  if (provider.startsWith("google")) return `Skipping ${formatProviderName(provider)} — ${r}`;
  return `Skipping ${formatProviderName(provider)} — ${r}`;
}

export async function searchConnectedProviders(
  supabase: any,
  userId: string,
  userQuery: string,
  emitProgress?: (step: { label: string; status: "running" | "done" | "error"; action?: string; detail?: string }) => void,
  topic?: string,
): Promise<{ connectionContext: string; searchedProviders: string[]; skippedProviders: string[]; skippedProviderDetails: SkippedProviderDetail[]; connectionDecision: { shouldSearch: boolean; reason: string }; queryTopic: string }> {
  const searchedProviders: string[] = [];
  const skippedProviders: string[] = [];
  const skippedProviderDetails: SkippedProviderDetail[] = [];
  let connectionContext = "";
  const t = topic || extractQueryTopic(userQuery);
  const intentProfile = buildConnectorSearchIntentProfile(userQuery);
  const effectiveQuery = intentProfile.augmentedQuery;
  const searchTopicForApis = intentProfile.topicHint || t;
  const connectionCheckLabel = `Checking your connected tools for ${t}`;

  const decision = shouldSearchConnections(userQuery);
  console.log("[connections] Intent decision:", JSON.stringify(decision), "query:", userQuery?.slice(0, 80));

  if (!decision.shouldSearch) {
    // Even when we skip live search, surface the inventory so the AI never
    // claims to have access to disconnected tools in passing remarks.
    try {
      const { data: invConns } = await supabase
        .from("user_connections")
        .select("provider")
        .eq("user_id", userId)
        .eq("status", "connected");
      const invProviders = (invConns || []).map((c: any) => c.provider);
      connectionContext = buildConnectedToolsInventory(invProviders);
    } catch (_e) { /* non-fatal */ }
    return { connectionContext, searchedProviders, skippedProviders, skippedProviderDetails, connectionDecision: decision, queryTopic: t };
  }

  emitProgress?.({ label: connectionCheckLabel, status: "running", action: "connections", detail: decision.reason });

  const { data: connections, error: connErr } = await supabase
    .from("user_connections")
    .select("provider, status")
    .eq("user_id", userId)
    .eq("status", "connected");

  if (connErr) console.error("[connections] DB error:", connErr.message);
  console.log("[connections] Connected providers:", JSON.stringify(connections));

  if (!connections || connections.length === 0) {
    console.log("[connections] No connected providers found");
    for (const provider of ["microsoft_outlook", "google_gmail", "slack", "zoom", "hubspot"]) {
      skippedProviders.push(provider);
      skippedProviderDetails.push({ provider, reason: "not connected" });
    }
    const emptyInventory = buildConnectedToolsInventory([]);
    connectionContext = emptyInventory + buildNoMatchConnectionContext(
      t,
      searchedProviders,
      skippedProviderDetails,
      "No connected tools are linked yet — I have nothing live to look at",
    );
    emitProgress?.({ label: connectionCheckLabel, status: "done", action: "connections", detail: "Nothing connected yet" });
    return { connectionContext, searchedProviders, skippedProviders, skippedProviderDetails, connectionDecision: decision, queryTopic: t };
  }

  const connectedProviders = connections.map((c: any) => c.provider);
  const inventory = buildConnectedToolsInventory(connectedProviders);
  const searchPromises: Promise<void>[] = [];

  // Per-provider intent: if user names a specific tool, search ONLY that one (saves usage).
  // Generic intent (e.g. "documents", "emails") is narrowed to providers the user actually has connected.
  const rawNamedProviders = detectNamedProviders(userQuery);
  const namedProviders = narrowProvidersByConnections(rawNamedProviders, connectedProviders, userQuery);
  const useTargeted = namedProviders.length > 0;
  const isAllowed = (provider: string) => !useTargeted || namedProviders.includes(provider);
  if (useTargeted) {
    console.log("[connections] Targeted search — raw:", rawNamedProviders, "narrowed:", namedProviders);
  }

  if (intentProfile.omitZoom && connectedProviders.includes("zoom") && isAllowed("zoom")) {
    skippedProviderDetails.push({ provider: "zoom", reason: "not requested for this query type" });
  }

  const hasOutlookConnection = connectedProviders.some((p: string) => p === "microsoft" || p === "microsoft_outlook");
  const hasOnedriveConnection = connectedProviders.includes("microsoft_onedrive");
  const hasOnenoteConnection = connectedProviders.includes("microsoft_onenote");
  // Check for any Microsoft sub-service connection
  const hasMicrosoft = hasOutlookConnection || hasOnedriveConnection || hasOnenoteConnection;
  const hasAnyGoogle = connectedProviders.some((p: string) => p === "google" || p.startsWith("google_"));

  const allKnownProviders = [
    "microsoft_outlook", "microsoft_onedrive", "microsoft_onenote",
    "google_gmail", "google_drive", "google_calendar",
    "slack", "zoom", "hubspot",
  ];
  for (const provider of allKnownProviders) {
    if (isMicrosoftProvider(provider)) {
      const providerConnected = provider === "microsoft_outlook"
        ? hasOutlookConnection
        : provider === "microsoft_onedrive"
          ? hasOnedriveConnection
          : hasOnenoteConnection;

      if (!providerConnected) {
        skippedProviders.push(provider);
        skippedProviderDetails.push({ provider, reason: "not connected" });
      }
    } else if (provider.startsWith("google_")) {
      if (!hasAnyGoogle) {
        skippedProviders.push(provider);
        skippedProviderDetails.push({ provider, reason: "not connected" });
      }
    } else if (!connectedProviders.includes(provider)) {
      skippedProviders.push(provider);
      skippedProviderDetails.push({ provider, reason: "not connected" });
    } else if (useTargeted && !isAllowed(provider)) {
      skippedProviderDetails.push({ provider, reason: "not requested in this query" });
    }
  }

  if (hasMicrosoft) {
    const hasOutlook = isAllowed("microsoft_outlook") && hasOutlookConnection;
    const hasOnedrive = isAllowed("microsoft_onedrive") && hasOnedriveConnection;
    const hasOnenote = isAllowed("microsoft_onenote") && hasOnenoteConnection;

    if (hasOutlook || hasOnedrive) {
      searchPromises.push((async () => {
        try {
          const token = await getAnyMicrosoftToken(supabase, userId);
          if (!token) {
            if (hasOutlook) skippedProviderDetails.push({ provider: "microsoft_outlook", reason: "token expired or missing" });
            if (hasOnedrive) skippedProviderDetails.push({ provider: "microsoft_onedrive", reason: "token expired or missing" });
            return;
          }
          if (hasOutlook) {
            emitProgress?.({ label: `Searching Outlook emails for ${t}`, status: "running", action: "connections" });
            searchedProviders.push("microsoft_outlook");
          }
          if (hasOnedrive) {
            emitProgress?.({ label: `Searching OneDrive files for ${t}`, status: "running", action: "connections" });
            searchedProviders.push("microsoft_onedrive");
          }
          const results = await searchMicrosoftData(token, effectiveQuery, searchTopicForApis, { searchEmails: hasOutlook, searchFiles: hasOnedrive });
          if (results.emails.length > 0) connectionContext += `\n\n### Live Data from Outlook\n#### Recent Emails\n${results.emails.join("\n\n")}\n`;
          if (results.files.length > 0) connectionContext += `\n\n### Live Data from OneDrive\n#### Recent Files\n${results.files.join("\n\n")}\n`;
          if (hasOutlook) emitProgress?.({ label: `Searching Outlook emails for ${t}`, status: "done", action: "connections" });
          if (hasOnedrive) emitProgress?.({ label: `Searching OneDrive files for ${t}`, status: "done", action: "connections" });
        } catch (e) {
          console.error("[connections] Microsoft search failed:", e);
          if (hasOutlook) { skippedProviderDetails.push({ provider: "microsoft_outlook", reason: "search failed" }); emitProgress?.({ label: `Searching Outlook for ${t}`, status: "error", action: "connections" }); }
          if (hasOnedrive) { skippedProviderDetails.push({ provider: "microsoft_onedrive", reason: "search failed" }); emitProgress?.({ label: `Searching OneDrive for ${t}`, status: "error", action: "connections" }); }
        }
      })());
    }

    if (hasOnenote) {
      searchPromises.push((async () => {
        try {
          const token = await getAnyMicrosoftToken(supabase, userId);
          if (!token) {
            skippedProviderDetails.push({ provider: "microsoft_onenote", reason: "token expired or missing" });
            return;
          }
          emitProgress?.({ label: `Searching OneNote pages for ${t}`, status: "running", action: "connections" });
          searchedProviders.push("microsoft_onenote");
          const results = await searchOneNoteData(token, effectiveQuery, searchTopicForApis);
          if (results.length > 0) {
            connectionContext += `\n\n### Live Data from OneNote\n#### Recent Notes\n${results.join("\n\n")}\n`;
          }
          emitProgress?.({ label: `Searching OneNote pages for ${t}`, status: "done", action: "connections" });
        } catch (e) {
          console.error("[connections] OneNote search failed:", e);
          skippedProviderDetails.push({ provider: "microsoft_onenote", reason: "search failed" });
          emitProgress?.({ label: `Searching OneNote for ${t}`, status: "error", action: "connections" });
        }
      })());
    }
  }

  // --- Google Workspace ---
  if (hasAnyGoogle) {
    const hasGmail = isAllowed("google_gmail") && connectedProviders.some((p: string) => p === "google" || p === "google_gmail");
    const hasGDrive = isAllowed("google_drive") && connectedProviders.some((p: string) => p === "google" || p === "google_drive");
    const hasGCal = isAllowed("google_calendar") && connectedProviders.some((p: string) => p === "google" || p === "google_calendar");

    if (hasGmail) {
      searchPromises.push((async () => {
        try {
          const token = await getGoogleTokenForProvider(supabase, userId, "google_gmail");
          if (!token) { skippedProviderDetails.push({ provider: "google_gmail", reason: "token expired or missing" }); return; }
          emitProgress?.({ label: `Searching Gmail for ${t}`, status: "running", action: "connections" });
          searchedProviders.push("google_gmail");
          const results = await searchGmailData(token, effectiveQuery, searchTopicForApis);
          if (results.length > 0) connectionContext += `\n\n### Live Data from Gmail\n${results.join("\n\n")}\n`;
          emitProgress?.({ label: `Searching Gmail for ${t}`, status: "done", action: "connections" });
        } catch (e) {
          console.error("[connections] Gmail search failed:", e);
          skippedProviderDetails.push({ provider: "google_gmail", reason: "search failed" });
          emitProgress?.({ label: `Searching Gmail for ${t}`, status: "error", action: "connections" });
        }
      })());
    }

    if (hasGDrive) {
      searchPromises.push((async () => {
        try {
          const token = await getGoogleTokenForProvider(supabase, userId, "google_drive");
          if (!token) { skippedProviderDetails.push({ provider: "google_drive", reason: "token expired or missing" }); return; }
          emitProgress?.({ label: `Searching Google Drive for ${t}`, status: "running", action: "connections" });
          searchedProviders.push("google_drive");
          const results = await searchGoogleDriveData(token, effectiveQuery, searchTopicForApis);
          if (results.length > 0) connectionContext += `\n\n### Live Data from Google Drive\n${results.join("\n\n")}\n`;
          emitProgress?.({ label: `Searching Google Drive for ${t}`, status: "done", action: "connections" });
        } catch (e) {
          console.error("[connections] Drive search failed:", e);
          const reason = e instanceof Error && e.message === "google_drive_permission_denied"
            ? "needs reconnecting"
            : "search failed";
          skippedProviderDetails.push({ provider: "google_drive", reason });
          emitProgress?.({ label: `Searching Google Drive for ${t}`, status: "error", action: "connections" });
        }
      })());
    }

    if (hasGCal) {
      searchPromises.push((async () => {
        try {
          const token = await getGoogleTokenForProvider(supabase, userId, "google_calendar");
          if (!token) { skippedProviderDetails.push({ provider: "google_calendar", reason: "token expired or missing" }); return; }
          emitProgress?.({ label: `Searching Google Calendar for ${t}`, status: "running", action: "connections" });
          searchedProviders.push("google_calendar");
          const results = await searchGoogleCalendarData(token, effectiveQuery, searchTopicForApis);
          if (results.length > 0) connectionContext += `\n\n### Live Data from Google Calendar\n${results.join("\n\n")}\n`;
          emitProgress?.({ label: `Searching Google Calendar for ${t}`, status: "done", action: "connections" });
        } catch (e) {
          console.error("[connections] Calendar search failed:", e);
          skippedProviderDetails.push({ provider: "google_calendar", reason: "search failed" });
          emitProgress?.({ label: `Searching Google Calendar for ${t}`, status: "error", action: "connections" });
        }
      })());
    }
  }

  if (connectedProviders.includes("slack") && isAllowed("slack")) {
    searchPromises.push((async () => {
      try {
        const token = await getValidProviderToken(supabase, userId, "slack");
        if (!token) {
          skippedProviders.push("slack");
          skippedProviderDetails.push({ provider: "slack", reason: "token expired or missing" });
          return;
        }
        emitProgress?.({ label: getProviderSearchLabel("slack", t), status: "running", action: "connections" });
        searchedProviders.push("slack");
        const results = await searchSlackData(token, effectiveQuery, searchTopicForApis);
        if (results.length > 0) {
          connectionContext += `\n\n### Live Data from Slack\n${results.join("\n\n")}\n`;
        }
        emitProgress?.({ label: getProviderSearchLabel("slack", t), status: "done", action: "connections" });
      } catch (e) {
        console.error("[connections] Slack search failed:", e);
        skippedProviderDetails.push({ provider: "slack", reason: "search failed" });
        emitProgress?.({ label: getProviderSearchLabel("slack", t), status: "error", action: "connections" });
      }
    })());
  }

  if (connectedProviders.includes("hubspot") && isAllowed("hubspot")) {
    searchPromises.push((async () => {
      try {
        const token = await getValidProviderToken(supabase, userId, "hubspot");
        if (!token) {
          skippedProviderDetails.push({ provider: "hubspot", reason: "token expired or missing" });
          return;
        }
        emitProgress?.({ label: getProviderSearchLabel("hubspot", t), status: "running", action: "connections" });
        searchedProviders.push("hubspot");
        const results = await searchHubspotData(token, effectiveQuery, searchTopicForApis);
        if (results.length > 0) {
          connectionContext += `\n\n### Live Data from HubSpot\n${results.join("\n\n")}\n`;
        }
        emitProgress?.({ label: getProviderSearchLabel("hubspot", t), status: "done", action: "connections" });
      } catch (e) {
        console.error("[connections] HubSpot search failed:", e);
        skippedProviderDetails.push({ provider: "hubspot", reason: "search failed" });
        emitProgress?.({ label: getProviderSearchLabel("hubspot", t), status: "error", action: "connections" });
      }
    })());
  }

  if (connectedProviders.includes("zoom") && isAllowed("zoom") && !intentProfile.omitZoom) {
    searchPromises.push((async () => {
      try {
        const token = await getValidProviderToken(supabase, userId, "zoom");
        if (!token) {
          skippedProviderDetails.push({ provider: "zoom", reason: "token expired or missing" });
          return;
        }
        emitProgress?.({ label: getProviderSearchLabel("zoom", t), status: "running", action: "connections" });
        searchedProviders.push("zoom");
        const results = await searchZoomData(token, effectiveQuery, searchTopicForApis);
        if (results.length > 0) {
          connectionContext += `\n\n### Live Data from Zoom\n${results.join("\n\n")}\n`;
        }
        emitProgress?.({ label: getProviderSearchLabel("zoom", t), status: "done", action: "connections" });
      } catch (e) {
        console.error("[connections] Zoom search failed:", e);
        skippedProviderDetails.push({ provider: "zoom", reason: "search failed" });
        emitProgress?.({ label: getProviderSearchLabel("zoom", t), status: "error", action: "connections" });
      }
    })());
  }

  await Promise.all(searchPromises);
  emitProgress?.({ label: connectionCheckLabel, status: "done", action: "connections", detail: decision.reason });

  if (connectionContext) {
    const searchedSummary = searchedProviders.length > 0
      ? searchedProviders.map(formatProviderName).join(", ")
      : "none";
    const skippedSummary = skippedProviderDetails.length > 0
      ? skippedProviderDetails.map(({ provider, reason }) => `${formatProviderName(provider)} (${reason})`).join(", ")
      : "none";

    connectionContext = inventory + `\n\n## Connected Sources (Live Search Results)\nUse this section as the primary source of truth for requests about live emails, messages, files, meetings, or collaboration activity. Answer the lookup request directly before offering any ideas.\n\n- **Searched sources:** ${searchedSummary}\n- **Skipped sources:** ${skippedSummary}\n${connectionContext}`;
  } else {
    connectionContext = inventory + buildNoMatchConnectionContext(
      t,
      searchedProviders,
      skippedProviderDetails,
      "No matching live results were found across the searched connected sources",
    );
  }

  console.log("[connections] Final searchedProviders:", searchedProviders, "skipped:", skippedProviders, "hasContext:", connectionContext.length > 0);
  return { connectionContext, searchedProviders, skippedProviders, skippedProviderDetails, connectionDecision: decision, queryTopic: t };
}
