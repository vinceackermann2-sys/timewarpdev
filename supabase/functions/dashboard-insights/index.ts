import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

import {
  getValidProviderToken,
} from "../_shared/run-employee/connections.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function tryParseJson(value: unknown): any | null {
  if (typeof value !== "string") return value && typeof value === "object" ? value : null;
  try { return JSON.parse(value); } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { brandId, workspaceId } = await req.json();
    if (!brandId) throw new Error("brandId required");

    // 1. Load business DNA data
    let query = supabase
      .from("user_business_data")
      .select("id, title, content, data_type, metadata, created_at")
      .eq("source", "business-dna");

    if (workspaceId) query = query.eq("workspace_id", workspaceId);
    else query = query.eq("user_id", user.id);

    const { data: allItems } = await query.limit(500);
    const items = allItems || [];

    const brandRow = items.find((item: any) => item.id === brandId);
    const brandContent = tryParseJson(brandRow?.content);
    const brandName = brandContent?.name || brandRow?.title || "Business";

    const logicalBrandId = brandContent?.id || brandId;
    const brandProducts = items.filter((item: any) => {
      if (item.data_type !== "product") return false;
      const parsed = tryParseJson(item.content);
      return parsed?.brandId === logicalBrandId || item.metadata?.brandId === logicalBrandId;
    });

    const brandAudiences = items.filter((item: any) => {
      if (item.data_type !== "audience") return false;
      const parsed = tryParseJson(item.content);
      return parsed?.brandId === logicalBrandId || item.metadata?.brandId === logicalBrandId;
    });

    // 2. Load connections
    const { data: connections } = await supabase
      .from("user_connections")
      .select("provider, status, metadata, connected_at")
      .eq("user_id", user.id)
      .eq("status", "connected");

    const connectedProviders = (connections || []).map((c: any) => c.provider);

    // 3. Load AI employees
    const { data: employees } = await supabase
      .from("ai_employees")
      .select("id, name, role, status, linked_business_id")
      .eq("user_id", user.id)
      .eq("linked_business_id", brandId);

    // 4. Pull integration data
    let integrationData = "";
    const searchQuery2 = brandName;
    const searchPromises: Promise<void>[] = [];

    const hasMsOutlook = connectedProviders.some((p: string) => p === "microsoft" || p === "microsoft_outlook");
    const hasMsOnedrive = connectedProviders.some((p: string) => p === "microsoft" || p === "microsoft_onedrive");
    const hasMsOnenote = connectedProviders.some((p: string) => p === "microsoft" || p === "microsoft_onenote");
    const hasMsTeams = connectedProviders.some((p: string) => p === "microsoft" || p === "microsoft_teams");
    const hasMsCalendar = connectedProviders.some((p: string) => p === "microsoft" || p === "microsoft_calendar" || p === "microsoft_outlook");

    const msProviders = ["microsoft", "microsoft_outlook", "microsoft_calendar", "microsoft_onedrive", "microsoft_onenote", "microsoft_teams"];
    const getMsToken = async () => {
      for (const p of msProviders) {
        const t = await getValidProviderToken(supabase, user.id, p);
        if (t) return t;
      }
      return null;
    };

    // Helper: paginated fetch with caps
    const paginateGraph = async (initialUrl: string, token: string, cap: number, timeoutMs = 25000) => {
      const items: any[] = [];
      let url: string | null = initialUrl;
      const startedAt = Date.now();
      while (url && items.length < cap && Date.now() - startedAt < timeoutMs) {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, ConsistencyLevel: "eventual" } });
        if (!res.ok) break;
        const data = await res.json();
        const page = data.value || [];
        items.push(...page);
        url = data["@odata.nextLink"] || null;
      }
      return items.slice(0, cap);
    };

    if (hasMsOutlook) {
      searchPromises.push((async () => {
        try {
          const msToken = await getMsToken();
          if (!msToken) return;
          // ALL inbox last 7 days + all unread, cap 500. Fetch FULL body (not just preview).
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const url = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=100&$filter=${encodeURIComponent(`receivedDateTime ge ${sevenDaysAgo} or isRead eq false`)}&$orderby=receivedDateTime desc&$select=subject,bodyPreview,body,from,receivedDateTime,isRead`;
          const messages = await paginateGraph(url, msToken, 500);
          // Sort by recency, trim to top 100 for AI
          const top = messages
            .sort((a, b) => (b.receivedDateTime || "").localeCompare(a.receivedDateTime || ""))
            .slice(0, 100)
            .map((msg: any) => {
              const subject = msg.subject || "No subject";
              const from = msg.from?.emailAddress?.address || "unknown";
              const receivedAt = msg.receivedDateTime?.slice(0, 16)?.replace("T", " ") || "";
              // Prefer full body content (strip HTML), fallback to bodyPreview
              const rawBody = msg.body?.content || "";
              const stripped = msg.body?.contentType === "html"
                ? rawBody.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
                : rawBody.trim();
              const body = (stripped || msg.bodyPreview || "").slice(0, 800);
              return `📧 SUBJECT: "${subject}" | FROM: ${from} | DATE: ${receivedAt} | UNREAD: ${msg.isRead === false}\nBODY: ${body}`;
            });
          if (top.length > 0) integrationData += `\n### Outlook Inbox (last 7 days + all unread, ${messages.length} fetched, top ${top.length} shown) — use SUBJECT verbatim as metadata.subject, BODY verbatim as metadata.bodyPreview\n${top.join("\n\n")}\n`;
        } catch (e) { console.error("Outlook fetch error:", e); }
      })());
    }

    if (hasMsOnedrive) {
      searchPromises.push((async () => {
        try {
          const msToken = await getMsToken();
          if (!msToken) return;
          // ALL files modified last 30 days, cap 500
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const url = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='')?$top=200&$select=name,webUrl,lastModifiedDateTime,size,createdBy`;
          const allFiles = await paginateGraph(url, msToken, 500);
          const recent = allFiles
            .filter((f: any) => f.lastModifiedDateTime && f.lastModifiedDateTime >= thirtyDaysAgo)
            .sort((a, b) => (b.lastModifiedDateTime || "").localeCompare(a.lastModifiedDateTime || ""))
            .slice(0, 100)
            .map((file: any) => `📄 **${file.name}** (modified: ${file.lastModifiedDateTime?.slice(0, 10) || ""}) — [link](${file.webUrl || ""})`);
          if (recent.length > 0) integrationData += `\n### OneDrive Files (last 30 days, top ${recent.length} of ${allFiles.length})\n${recent.join("\n")}\n`;
        } catch (e) { console.error("OneDrive fetch error:", e); }
      })());
    }

    if (hasMsOnenote) {
      searchPromises.push((async () => {
        try {
          const msToken = await getMsToken();
          if (!msToken) return;
          // ALL notebooks → all recent pages, cap 300
          const url = `https://graph.microsoft.com/v1.0/me/onenote/pages?$top=100&$orderby=lastModifiedDateTime desc&$select=title,createdDateTime,lastModifiedDateTime,links,parentNotebook`;
          const pages = await paginateGraph(url, msToken, 300);
          const formatted = pages.slice(0, 100).map((page: any) => {
            const title = page.title || "Untitled";
            const modified = page.lastModifiedDateTime?.slice(0, 10) || page.createdDateTime?.slice(0, 10) || "";
            const link = page.links?.oneNoteWebUrl?.href || "";
            const notebook = page.parentNotebook?.displayName || "";
            return `📝 **${title}** (notebook: ${notebook}, modified: ${modified})${link ? ` — [link](${link})` : ""}`;
          });
          if (formatted.length > 0) integrationData += `\n### OneNote Pages (top ${formatted.length} of ${pages.length})\n${formatted.join("\n")}\n`;
        } catch (e) { console.error("OneNote fetch error:", e); }
      })());
    }

    if (connectedProviders.includes("slack")) {
      searchPromises.push((async () => {
        try {
          const slackToken = await getValidProviderToken(supabase, user.id, "slack");
          if (!slackToken) return;
          // ALL channels (paginated), ALL messages last 7 days, cap 1000
          const allChannels: any[] = [];
          let cursor = "";
          for (let i = 0; i < 5; i++) {
            const url = `https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200&exclude_archived=true${cursor ? `&cursor=${cursor}` : ""}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${slackToken}` } });
            if (!res.ok) break;
            const d = await res.json();
            if (!d.ok) break;
            allChannels.push(...(d.channels || []));
            cursor = d.response_metadata?.next_cursor || "";
            if (!cursor) break;
          }
          const sevenDaysAgo = (Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000;
          const slackMessages: string[] = [];
          const startedAt = Date.now();
          await Promise.all(allChannels.slice(0, 100).map(async (channel: any) => {
            if (slackMessages.length >= 1000 || Date.now() - startedAt > 25000) return;
            try {
              const histRes = await fetch(
                `https://slack.com/api/conversations.history?channel=${channel.id}&limit=50&oldest=${sevenDaysAgo}`,
                { headers: { Authorization: `Bearer ${slackToken}` } },
              );
              if (!histRes.ok) return;
              const histData = await histRes.json();
              if (!histData.ok || !histData.messages) return;
              for (const msg of histData.messages) {
                if (slackMessages.length >= 1000) break;
                if (msg.subtype === "channel_join" || msg.subtype === "channel_leave") continue;
                const ts = msg.ts ? new Date(parseFloat(msg.ts) * 1000).toISOString().slice(0, 16).replace("T", " ") : "";
                const preview = (msg.text || "").slice(0, 200);
                if (!preview.trim()) continue;
                slackMessages.push(`💬 **#${channel.name}** (${ts}): ${preview}`);
              }
            } catch (_e) { /* skip channel */ }
          }));
          const top = slackMessages.slice(0, 100);
          if (top.length > 0) integrationData += `\n### Slack Messages (last 7d, ${slackMessages.length} fetched, top ${top.length})\n${top.join("\n")}\n`;
        } catch (e) { console.error("Slack search error:", e); }
      })());
    }

    if (connectedProviders.includes("hubspot")) {
      searchPromises.push((async () => {
        try {
          const hsToken = await getValidProviderToken(supabase, user.id, "hubspot");
          if (!hsToken) return;
          // Top 50 recent contacts
          const contactsRes = await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,createdate,lifecyclestage&sorts=-createdate`,
            { headers: { Authorization: `Bearer ${hsToken}` } }
          );
          if (contactsRes.ok) {
            const data = await contactsRes.json();
            const contacts = (data.results || []).slice(0, 50).map((c: any) =>
              `- ${c.properties?.firstname || ""} ${c.properties?.lastname || ""} (${c.properties?.email || "no email"}) — stage: ${c.properties?.lifecyclestage || "unknown"} — added ${c.properties?.createdate?.slice(0, 10) || ""}`
            );
            if (contacts.length > 0) integrationData += `\n### HubSpot Contacts (top ${contacts.length})\n${contacts.join("\n")}\n`;
          }
          // ALL deals paginated, cap 500
          const allDeals: any[] = [];
          let after: string | undefined = undefined;
          for (let i = 0; i < 5; i++) {
            const url = `https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,closedate,pipeline,hs_lastmodifieddate&sorts=-hs_lastmodifieddate${after ? `&after=${after}` : ""}`;
            const r = await fetch(url, { headers: { Authorization: `Bearer ${hsToken}` } });
            if (!r.ok) break;
            const d = await r.json();
            allDeals.push(...(d.results || []));
            after = d.paging?.next?.after;
            if (!after || allDeals.length >= 500) break;
          }
          const openDeals = allDeals
            .filter((d: any) => {
              const stage = (d.properties?.dealstage || "").toLowerCase();
              return !stage.includes("closedwon") && !stage.includes("closedlost") && !stage.includes("closed_won") && !stage.includes("closed_lost");
            })
            .slice(0, 100)
            .map((d: any) =>
              `- ${d.properties?.dealname || "Unnamed"} — $${d.properties?.amount || "0"} (${d.properties?.dealstage || "unknown stage"}) — modified ${d.properties?.hs_lastmodifieddate?.slice(0, 10) || ""}`
            );
          if (openDeals.length > 0) integrationData += `\n### HubSpot Open Deals (${openDeals.length} of ${allDeals.length} total)\n${openDeals.join("\n")}\n`;
        } catch (e) { console.error("HubSpot search error:", e); }
      })());
    }

    if (connectedProviders.includes("zoom")) {
      searchPromises.push((async () => {
        try {
          const zoomToken = await getValidProviderToken(supabase, user.id, "zoom");
          if (!zoomToken) return;
          // ALL upcoming meetings (paginated, cap 250) filtered to next 30d
          const allMeetings: any[] = [];
          let nextPageToken = "";
          for (let i = 0; i < 5; i++) {
            const url = `https://api.zoom.us/v2/users/me/meetings?type=upcoming&page_size=100${nextPageToken ? `&next_page_token=${nextPageToken}` : ""}`;
            const r = await fetch(url, { headers: { Authorization: `Bearer ${zoomToken}` } });
            if (!r.ok) break;
            const d = await r.json();
            allMeetings.push(...(d.meetings || []));
            nextPageToken = d.next_page_token || "";
            if (!nextPageToken || allMeetings.length >= 250) break;
          }
          const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          const upcoming = allMeetings
            .filter((m: any) => !m.start_time || m.start_time <= thirtyDaysOut)
            .slice(0, 100)
            .map((m: any) =>
              `- ${m.topic || "Untitled"} — ${m.start_time?.slice(0, 16)?.replace("T", " ") || "no date"} (${m.duration || 0} min)`
            );
          if (upcoming.length > 0) integrationData += `\n### Zoom Upcoming Meetings (next 30d, ${upcoming.length} of ${allMeetings.length})\n${upcoming.join("\n")}\n`;
        } catch (e) { console.error("Zoom search error:", e); }
      })());
    }

    // Google sub-services
    const googleProviders = ["google", "google_calendar", "google_drive", "google_docs", "google_sheets", "google_slides", "google_gmail"];
    const getGoogleToken = async () => {
      for (const p of googleProviders) {
        if (!connectedProviders.includes(p)) continue;
        const t = await getValidProviderToken(supabase, user.id, p);
        if (t) return t;
      }
      return null;
    };

    const hasGoogleCalendar = connectedProviders.some((p: string) => p === "google" || p === "google_calendar");
    const hasGmail = connectedProviders.some((p: string) => p === "google" || p === "google_gmail");
    const hasGoogleDrive = connectedProviders.some((p: string) => p === "google" || p === "google_drive" || p === "google_docs" || p === "google_sheets" || p === "google_slides");

    if (hasGmail) {
      searchPromises.push((async () => {
        try {
          const gToken = await getGoogleToken();
          if (!gToken) return;
          // ALL unread + last 100 read in past 7 days, cap 500 ids, fetch top 100 details
          const ids: string[] = [];
          let pageToken = "";
          for (let i = 0; i < 5; i++) {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=${encodeURIComponent("(is:unread OR newer_than:7d)")}${pageToken ? `&pageToken=${pageToken}` : ""}`;
            const r = await fetch(url, { headers: { Authorization: `Bearer ${gToken}` } });
            if (!r.ok) break;
            const d = await r.json();
            ids.push(...((d.messages || []).map((m: any) => m.id)));
            pageToken = d.nextPageToken || "";
            if (!pageToken || ids.length >= 500) break;
          }
          const gmailMessages: string[] = [];
          const startedAt = Date.now();
          // Fetch top 100 details in parallel batches of 20
          const top = ids.slice(0, 100);
          for (let i = 0; i < top.length; i += 20) {
            if (Date.now() - startedAt > 25000) break;
            const batch = top.slice(i, i + 20);
            await Promise.all(batch.map(async (id: string) => {
              try {
                // Use format=full to retrieve the actual body content (not just snippet)
                const detailRes = await fetch(
                  `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
                  { headers: { Authorization: `Bearer ${gToken}` } },
                );
                if (!detailRes.ok) return;
                const detail = await detailRes.json();
                const headers = detail.payload?.headers || [];
                const subject = headers.find((h: any) => h.name === "Subject")?.value || "No Subject";
                const from = headers.find((h: any) => h.name === "From")?.value || "Unknown";
                const date = headers.find((h: any) => h.name === "Date")?.value || "";
                const isUnread = (detail.labelIds || []).includes("UNREAD");

                // Walk MIME parts to find text/plain (preferred) or text/html, decode base64url
                const decodeB64Url = (s: string) => {
                  try {
                    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
                    const bin = atob(b64);
                    const bytes = new Uint8Array(bin.length);
                    for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
                    return new TextDecoder("utf-8").decode(bytes);
                  } catch { return ""; }
                };
                const findPart = (part: any, mime: string): string => {
                  if (!part) return "";
                  if (part.mimeType === mime && part.body?.data) return decodeB64Url(part.body.data);
                  for (const p of (part.parts || [])) {
                    const r = findPart(p, mime);
                    if (r) return r;
                  }
                  return "";
                };
                let body = findPart(detail.payload, "text/plain");
                if (!body) {
                  const html = findPart(detail.payload, "text/html");
                  body = html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
                }
                if (!body) body = (detail.snippet || "").trim();
                body = body.slice(0, 800);

                gmailMessages.push(`📧 SUBJECT: "${subject}" | FROM: ${from} | DATE: ${date} | UNREAD: ${isUnread}\nBODY: ${body}`);
              } catch { /* skip */ }
            }));
          }
          if (gmailMessages.length > 0) integrationData += `\n### Gmail Messages (unread + last 7d, ${ids.length} ids, ${gmailMessages.length} detailed) — use SUBJECT verbatim as metadata.subject, BODY verbatim as metadata.bodyPreview\n${gmailMessages.join("\n\n")}\n`;
        } catch (e) { console.error("Gmail search error:", e); }
      })());
    }

    if (hasGoogleCalendar) {
      searchPromises.push((async () => {
        try {
          const gToken = await getGoogleToken();
          if (!gToken) return;
          // ALL upcoming events next 30 days (paginated, cap 250)
          const now = new Date().toISOString();
          const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          const allEvents: any[] = [];
          let pageToken = "";
          for (let i = 0; i < 5; i++) {
            const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(thirtyDaysOut)}&maxResults=100&singleEvents=true&orderBy=startTime${pageToken ? `&pageToken=${pageToken}` : ""}`;
            const r = await fetch(url, { headers: { Authorization: `Bearer ${gToken}` } });
            if (!r.ok) break;
            const d = await r.json();
            allEvents.push(...(d.items || []));
            pageToken = d.nextPageToken || "";
            if (!pageToken || allEvents.length >= 250) break;
          }
          const events = allEvents.slice(0, 100).map((e: any) => {
            const start = e.start?.dateTime || e.start?.date || "";
            const attendees = (e.attendees || []).length;
            return `📅 **${e.summary || "Untitled"}** — ${start.slice(0, 16).replace("T", " ")} (${attendees} attendees)`;
          });
          if (events.length > 0) integrationData += `\n### Google Calendar Upcoming (next 30d, ${events.length} of ${allEvents.length})\n${events.join("\n")}\n`;
        } catch (e) { console.error("Google Calendar error:", e); }
      })());
    }

    if (hasGoogleDrive) {
      searchPromises.push((async () => {
        try {
          const gToken = await getGoogleToken();
          if (!gToken) return;
          // ALL files modified last 30 days (paginated, cap 500)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const allFiles: any[] = [];
          let pageToken = "";
          for (let i = 0; i < 5; i++) {
            const q = encodeURIComponent(`trashed=false and modifiedTime > '${thirtyDaysAgo}'`);
            const url = `https://www.googleapis.com/drive/v3/files?pageSize=100&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink),nextPageToken&q=${q}${pageToken ? `&pageToken=${pageToken}` : ""}`;
            const r = await fetch(url, { headers: { Authorization: `Bearer ${gToken}` } });
            if (!r.ok) break;
            const d = await r.json();
            allFiles.push(...(d.files || []));
            pageToken = d.nextPageToken || "";
            if (!pageToken || allFiles.length >= 500) break;
          }
          const files = allFiles.slice(0, 100).map((f: any) => {
            const type = f.mimeType?.includes("document") ? "📄" : f.mimeType?.includes("spreadsheet") ? "📊" : f.mimeType?.includes("presentation") ? "📽️" : "📁";
            return `${type} **${f.name}** — modified ${f.modifiedTime?.slice(0, 16)?.replace("T", " ") || ""}`;
          });
          if (files.length > 0) integrationData += `\n### Google Drive Files (last 30d, ${files.length} of ${allFiles.length})\n${files.join("\n")}\n`;
        } catch (e) { console.error("Google Drive error:", e); }
      })());
    }

    if (hasMsTeams) {
      searchPromises.push((async () => {
        try {
          const msToken = await getMsToken();
          if (!msToken) return;
          // ALL chats (paginated, cap 100), ALL messages last 7 days from each, cap 1000 total
          const allChats: any[] = [];
          let chatsUrl: string | null = `https://graph.microsoft.com/v1.0/me/chats?$top=50&$orderby=lastMessagePreview/createdDateTime desc`;
          for (let i = 0; i < 3 && chatsUrl; i++) {
            const r: Response = await fetch(chatsUrl, { headers: { Authorization: `Bearer ${msToken}` } });
            if (!r.ok) break;
            const d = await r.json();
            allChats.push(...(d.value || []));
            chatsUrl = d["@odata.nextLink"] || null;
            if (allChats.length >= 100) break;
          }
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const teamsMessages: string[] = [];
          const startedAt = Date.now();
          await Promise.all(allChats.slice(0, 50).map(async (chat: any) => {
            if (teamsMessages.length >= 1000 || Date.now() - startedAt > 25000) return;
            try {
              const msgRes = await fetch(
                `https://graph.microsoft.com/v1.0/me/chats/${chat.id}/messages?$top=50&$orderby=createdDateTime desc`,
                { headers: { Authorization: `Bearer ${msToken}` } },
              );
              if (!msgRes.ok) return;
              const msgData = await msgRes.json();
              for (const msg of (msgData.value || [])) {
                if (teamsMessages.length >= 1000) break;
                if (msg.createdDateTime && msg.createdDateTime < sevenDaysAgo) break;
                if (!msg.body?.content) continue;
                const preview = msg.body.content.replace(/<[^>]*>/g, "").slice(0, 200).trim();
                if (!preview) continue;
                const ts = msg.createdDateTime ? new Date(msg.createdDateTime).toISOString().slice(0, 16).replace("T", " ") : "";
                const sender = msg.from?.user?.displayName || "Unknown";
                const chatTopic = chat.topic || "Direct Message";
                teamsMessages.push(`💬 **${chatTopic}** (${ts}) from ${sender}: ${preview}`);
              }
            } catch (_e) { /* skip chat */ }
          }));

          // Upcoming online meetings (next 30d)
          const now = new Date().toISOString();
          const meetingsRes = await fetch(
            `https://graph.microsoft.com/v1.0/me/onlineMeetings?$top=50&$filter=startDateTime ge '${now}'&$orderby=startDateTime`,
            { headers: { Authorization: `Bearer ${msToken}` } },
          );
          if (meetingsRes.ok) {
            const meetData = await meetingsRes.json();
            const meetings = (meetData.value || []).slice(0, 50).map((m: any) =>
              `- ${m.subject || "Untitled"} — ${m.startDateTime?.slice(0, 16)?.replace("T", " ") || "no date"}`
            );
            if (meetings.length > 0) teamsMessages.push(`\n**Upcoming Teams Meetings:**\n${meetings.join("\n")}`);
          }

          const top = teamsMessages.slice(0, 100);
          if (top.length > 0) integrationData += `\n### Microsoft Teams (last 7d messages + upcoming meetings, ${teamsMessages.length} fetched, top ${top.length})\n${top.join("\n")}\n`;
        } catch (e) { console.error("Teams search error:", e); }
      })());
    }

    await Promise.all(searchPromises);

    // 5. Build context
    const productsSummary = brandProducts.map((p: any) => {
      const parsed = tryParseJson(p.content);
      return `- ${parsed?.name || p.title || "Unnamed Product"} (added ${p.created_at?.slice(0, 10) || "unknown"})`;
    }).join("\n") || "No products registered.";

    const audiencesSummary = brandAudiences.map((a: any) => {
      const parsed = tryParseJson(a.content);
      return `- ${parsed?.name || a.title || "Unnamed Audience"}: ${parsed?.demographics || ""} (added ${a.created_at?.slice(0, 10) || "unknown"})`;
    }).join("\n") || "No audiences defined.";

    const brandSummary = brandContent ? `
Brand: ${brandContent.name || "Unknown"}
Category: ${brandContent.category || "Not set"}
Has Logo: ${brandContent.logoUrls?.length > 0 ? "Yes" : "No"}
Has Colors: ${brandContent.colors ? "Yes" : "No"}
Has Typography: ${brandContent.typography ? "Yes" : "No"}
Visual Assets: ${((brandContent.visualIdentity?.moodboardUrls?.length || 0) + (brandContent.visualIdentity?.illustrationUrls?.length || 0))} generated
AI Agent: ${brandContent.agentName || "Not configured"}
` : "Brand data not available.";

    const connectedSummary = connectedProviders.length > 0
      ? `Connected integrations: ${connectedProviders.join(", ")}`
      : "No integrations connected.";

    const employeesSummary = (employees || []).length > 0
      ? (employees || []).map((e: any) => `- ${e.name} (${e.role}) — ${e.status}`).join("\n")
      : "No AI employees linked.";

    const fullContext = `
## Business Overview
${brandSummary}

## Products
${productsSummary}

## Target Audiences
${audiencesSummary}

## AI Employees
${employeesSummary}

## Integrations
${connectedSummary}
${integrationData ? `\n## Live Integration Data\n${integrationData}` : ""}
`;

    // 6. Single AI call for ALL 4 tabs
    const currentTime = new Date().toISOString();
    const systemPrompt = `You are a business analyst and strategic advisor for "${brandName}". You implement the Dashboard Intelligence Model (DIM) — a deterministic classification engine that sorts every signal into exactly 4 tabs.

The current date/time is: ${currentTime}
Use this to calculate accurate "timeAgo" values. Be precise — do NOT guess or fabricate timestamps.

## ALIGNMENT LAYER (Business DNA)
Use the Business Overview, Products, Target Audiences, and AI Employees sections as the alignment layer. Every insight must be contextualized against this business's identity, goals, products, and audiences.

## DATA SOURCES
Generate cards primarily from CONNECTED INTEGRATION data (HubSpot, Slack, Outlook, OneDrive, OneNote, Zoom, Microsoft Teams). When integration data is available, every card must trace back to a specific integration source. When NO integration data is available, generate cards from the Business DNA alignment layer using source "business-dna".

## COMPOSITE SCORING ALGORITHM
For each signal, score three axes (1-5 scale):
- Impact (I): How much does this affect revenue, reputation, or strategic position?
- Urgency (U): How time-sensitive? What's the cost of delay?
- Context (C): How relevant to current business priorities and connected data?

**Composite Score** = (I × 0.45) + (U × 0.35) + (C × 0.20)

**Priority Mapping:**
- 4.0–5.0 → High
- 2.5–3.9 → Medium
- 1.0–2.4 → Low

## TAB ASSIGNMENT RULES (Dominant Axis)
- **Briefing**: Impact + Context dominant, no immediate action required. The signal informs.
- **Updates**: Urgency dominant + external actor is waiting. Someone/something is blocked on the user.
- **To-Dos**: Urgency dominant + user is the actor. The user must do something.
- **Objectives**: Impact dominant + strategic/long-term. Measured outcomes over weeks/quarters.

## WAIT DURATION ESCALATION (Updates only)
When an external party has been waiting, apply urgency modifiers:
- 2–8 hours: +0.5 urgency
- 8–24 hours: +1.0 urgency
- 1–3 days: +1.5 urgency → yellow minimum priority
- 3–7 days: +2.0 urgency → red/High minimum priority
- >7 days: +3.0 urgency → critical/High priority

## CARD COUNTS PER TAB
- Briefing: 4–8 cards
- Updates: 3–8 cards
- To-Dos: 6–12 cards
- Objectives: 3–6 cards

## HEADLINE RULES
- ≤8 words per title
- Must contain at least one of: a number, a name, a temporal reference, or a direction word
- Anti-patterns to AVOID: "Important Update", "Action Required", "FYI", "Quick Note" — these are too vague

## QUALITY GATES PER TAB

**Briefing Quality Tests:**
1. No-Action Test: Does this card require NO immediate action? If action is needed, move to To-Dos or Updates.
2. Specificity Test: Does it contain a specific data point, name, or metric? Generic observations fail.

**Updates Quality Tests:**
1. Blocker Test: Is someone/something actually blocked?
2. Wait Test: Can you identify HOW LONG they've been waiting?
3. Person Test: Can you name WHO is waiting?

**To-Dos Quality Tests:**
1. Verb Test: Does the title start with an action verb?
2. Completability Test: Could this be completed in a single work session?
3. How-To Test: Can you describe specific steps to complete it?

**Objectives Quality Tests:**
1. Outcome Test: Is this a measurable outcome, not an activity?
2. Measurability Test: Can you define current state, target state, and gap?
3. Time-Bound Test: Does it have a clear time horizon?

Return a JSON object with exactly these 4 keys: "Briefing", "Updates", "To-Dos", "Objectives". Each key maps to an array of cards.

## CARD SCHEMA — ALL TABS
Every card has these base fields:
- "id": unique string (e.g. "briefing-1", "update-1", "todo-1", "obj-1")
- "priority": "High" | "Medium" | "Low" (from Composite Score)
- "title": short title (max 8 words, follow headline rules)
- "description": 2-3 sentence insight
- "detail": 3-5 sentence deep-dive with specific data, recommendations, or solutions
- "category": contextual label (e.g. "Sales", "Marketing", "Operations", "Problem", "Opportunity", "Growth", "Communication", "Strategy")
- "source": one of "hubspot", "slack", "outlook", "onedrive", "onenote", "zoom", "teams", "business-dna"
- "icon": one of "building", "trending-up", "users", "plug", "mail", "shopping-bag", "palette", "bot", "target", "lightbulb", "alert", "refresh-cw", "award", "image"
- "timeAgo": accurate relative time string
- "timestamp": ISO 8601 timestamp of the original event
- "actionSuggestion": A specific, actionable next step
- "metadata": source-specific context. **CRITICAL for emails (outlook/gmail)**: when the integration data contains "SUBJECT: ..." and "BODY: ...", you MUST copy them VERBATIM into metadata.subject and metadata.bodyPreview — never paraphrase or summarize the body. Other fields: senderName/senderEmail (parse from FROM), receivedAt (from DATE) for outlook/gmail; scheduledDate/duration/attendees for zoom; contactName/dealValue/stage for hubspot; channel/author/messageText (verbatim message text) for slack/teams; fileName/sharedBy for onedrive; notebook for onenote

## TAB-SPECIFIC FIELDS

**Briefing cards** also include:
- "signalType": string — the type of signal (e.g. "Market Shift", "Competitor Move", "Metric Change", "Integration Health", "Trend", "Risk")

**Updates cards** also include:
- "waitingParty": string — name of person/entity waiting on the user
- "requestType": string — what they need (e.g. "Approval", "Response", "Decision", "Review", "Information")
- "waitDuration": string — how long they've been waiting (e.g. "2 hours", "1 day", "3 days", ">1 week")
- "consequence": string — what happens if the user doesn't act (1 sentence)

**To-Dos cards** also include:
- "taskType": string — category (e.g. "Follow-up", "Meeting Prep", "Deep Work", "Communication", "Review", "Calendar")
- "howTo": string — numbered steps to complete (e.g. "1. Open the deal in HubSpot\\n2. Review latest notes\\n3. Send follow-up email")
- "estimatedDuration": string — time estimate (e.g. "5 min", "15 min", "30 min", "1 hour", "2 hours", "Half day")
- "leverageScore": number 1-5 — how much impact completing this has

**Objectives cards** also include:
- "objectiveType": string — category (e.g. "Revenue", "Growth", "Efficiency", "Quality", "Retention", "Expansion")
- "successMetric": { "current": string, "target": string, "gap": string, "source": string } — measurable metric
- "progress": number 0-100 — current progress percentage
- "timeHorizon": string — time frame (e.g. "This Week", "This Month", "This Quarter", "This Year")
- "relatedTodoIds": string[] — IDs of To-Do cards that contribute to this objective

Sort cards by priority (High first) within each tab. Do NOT fabricate integration data.
Return ONLY a valid JSON object, no markdown fences.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: fullContext },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => "");
      console.error("AI gateway error:", aiResponse.status, errText.slice(0, 200));
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "{}";

    let allTabs: Record<string, any[]>;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      allTabs = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (e) {
      console.error("Failed to parse AI response:", rawContent.slice(0, 500));
      allTabs = {};
    }

    // Normalize
    const result = {
      Briefing: Array.isArray(allTabs.Briefing) ? allTabs.Briefing : [],
      Updates: Array.isArray(allTabs.Updates) ? allTabs.Updates : [],
      "To-Dos": Array.isArray(allTabs["To-Dos"]) ? allTabs["To-Dos"] : [],
      Objectives: Array.isArray(allTabs.Objectives) ? allTabs.Objectives : [],
    };

    return new Response(JSON.stringify({ tabs: result, brandName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Dashboard insights error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: msg === "Unauthorized" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
