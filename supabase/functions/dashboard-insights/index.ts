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

    // 1b. Load the 6 extended DNA pillars (market, financial, operations, people, growth, strategy).
    // These live as separate user_business_data rows (NOT source='business-dna') and were missing
    // from the dashboard's analysis context until now.
    const EXTENDED_PILLAR_TYPES = ["market", "financial", "operations", "people", "growth", "strategy"];
    let pillarsQuery = supabase
      .from("user_business_data")
      .select("id, title, content, data_type, metadata, created_at")
      .in("data_type", EXTENDED_PILLAR_TYPES);
    if (workspaceId) pillarsQuery = pillarsQuery.eq("workspace_id", workspaceId);
    else pillarsQuery = pillarsQuery.eq("user_id", user.id);
    const { data: extendedPillarRows } = await pillarsQuery.limit(200);
    const extendedPillars: Record<string, any> = {};
    for (const row of (extendedPillarRows || [])) {
      // Scope to the active brand when metadata declares it; otherwise include user-wide rows.
      const rowBrandId = (row as any).metadata?.brandId;
      if (rowBrandId && rowBrandId !== logicalBrandId && rowBrandId !== brandId) continue;
      const parsed = tryParseJson((row as any).content);
      if (parsed && typeof parsed === "object") extendedPillars[(row as any).data_type] = parsed;
    }

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

    if (hasMsCalendar) {
      searchPromises.push((async () => {
        try {
          const msToken = await getMsToken();
          if (!msToken) return;
          // Upcoming Outlook calendar events next 30 days
          const now = new Date().toISOString();
          const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(now)}&endDateTime=${encodeURIComponent(thirtyDaysOut)}&$top=100&$orderby=start/dateTime&$select=subject,start,end,attendees,bodyPreview,isOnlineMeeting,location`;
          const allEvents = await paginateGraph(url, msToken, 250);
          const events = allEvents.slice(0, 100).map((e: any) => {
            const start = e.start?.dateTime?.slice(0, 16)?.replace("T", " ") || "";
            const attendees = (e.attendees || []).length;
            const loc = e.isOnlineMeeting ? "online" : (e.location?.displayName || "");
            return `📅 **${e.subject || "Untitled"}** — ${start} (${attendees} attendees${loc ? ", " + loc : ""})`;
          });
          if (events.length > 0) integrationData += `\n### Outlook Calendar Upcoming (next 30d, ${events.length} of ${allEvents.length})\n${events.join("\n")}\n`;
        } catch (e) { console.error("Outlook Calendar error:", e); }
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
      ? `Connected integrations (${connectedProviders.length}): ${connectedProviders.join(", ")}`
      : "No integrations connected.";

    const employeesSummary = (employees || []).length > 0
      ? (employees || []).map((e: any) => `- ${e.name} (${e.role}) — ${e.status}`).join("\n")
      : "No AI employees linked.";

    // Stringify each extended pillar (capped) so the AI can use it as alignment context.
    const PILLAR_LABELS: Record<string, string> = {
      market: "Market", financial: "Financial", operations: "Operations",
      people: "People", growth: "Growth", strategy: "Strategy",
    };
    const extendedPillarsSummary = EXTENDED_PILLAR_TYPES
      .map((t) => {
        const data = extendedPillars[t];
        if (!data) return `### ${PILLAR_LABELS[t]}\n_(not yet defined)_`;
        const json = JSON.stringify(data, null, 2).slice(0, 2000);
        return `### ${PILLAR_LABELS[t]}\n${json}`;
      })
      .join("\n\n");

    const fullContext = `
## Business Overview
${brandSummary}

## Products
${productsSummary}

## Target Audiences
${audiencesSummary}

## Extended Business DNA (Market / Financial / Operations / People / Growth / Strategy)
${extendedPillarsSummary}

## AI Employees
${employeesSummary}

## Integrations
${connectedSummary}
${integrationData ? `\n## Live Integration Data\n${integrationData}` : ""}
`;

    // 6. Load previous snapshot for the Delta Layer
    const { data: prevSnapshotRow } = await supabase
      .from("dashboard_snapshots")
      .select("cards")
      .eq("user_id", user.id)
      .eq("brand_id", brandId)
      .maybeSingle();
    const prevSnapshot: Record<string, { priority: string; tab: string }> =
      (prevSnapshotRow?.cards as any) || {};

    // 7. Single AI call for ALL 4 tabs + opening summary + health score
    const currentTime = new Date().toISOString();
    const systemPrompt = `You are the executive intelligence engine for "${brandName}". You implement the **Dashboard Intelligence Model v2 (DIM v2)** — a deterministic classification engine that compresses the entire state of the business into the minimum set of decisions required RIGHT NOW.

The current date/time is: ${currentTime}
Use this to calculate accurate "timeAgo" values. Be precise — do NOT guess or fabricate timestamps.

## THE FIRST PRINCIPLE
Every card must answer EXACTLY one of these questions:
- "What has changed that I need to understand?" → Briefing
- "Who or what is blocked waiting on ME?" → Updates
- "What should I be working on RIGHT NOW?" → To-Dos
- "What strategic outcomes must I drive this quarter?" → Objectives

If a piece of intelligence does not answer one of these, OMIT it.

## ALIGNMENT LAYER (Business DNA)
Use the Business Overview, Products, Target Audiences, and AI Employees sections as the ALIGNMENT LAYER. Every insight must be contextualized against this business's identity, goals, products, and audiences. DNA is for tone/context — never as a source of facts.

## DATA SOURCES — STRICT ANTI-HALLUCINATION RULES
You MUST generate cards ONLY from the "## Live Integration Data" section. Every card must trace back to a SPECIFIC item (email subject, message text, deal name, file name, meeting title) that appears VERBATIM in that section.

**ABSOLUTE PROHIBITIONS — VIOLATING THESE IS A CRITICAL FAILURE:**
- DO NOT invent people's names that do not appear verbatim in the integration data.
- DO NOT invent dollar amounts, invoice counts, contract values, or numbers not present.
- DO NOT invent file names, deal names, channels, subjects, or messages.
- DO NOT generate illustrative / example / placeholder / "sample" cards.
- DO NOT use Business DNA as a source of facts.

**IF the "## Live Integration Data" section is EMPTY for a tab → return an EMPTY array.** An empty dashboard is correct and honest. A fabricated dashboard is harmful.
For Objectives: if NO measurable metrics exist in real integration data, return an empty Objectives array.

## SORTING ALGORITHM — IMPACT × URGENCY × CONTEXT
Score every signal on three axes (1–5):
- **Impact (I)**: 5 Critical (revenue/reputation/survival) → 1 Noise (FYI only)
- **Urgency (U)**: 5 Immediate (<4h) → 1 Anytime (14+ days)
- **Context (C)**: 5 Core (maps to active strategic objective) → 1 Unrelated

**Composite Score = (I × 0.45) + (U × 0.35) + (C × 0.20)**
Priority bands: 4.0–5.0 = High · 2.5–3.9 = Medium · 1.0–2.4 = Low

## TAB ASSIGNMENT (Dominant Axis)
- Urgency dominant + external actor waiting → **Updates**
- Impact dominant + strategic alignment → **Objectives**
- Urgency dominant + user is the actor → **To-Dos**
- Impact + Context dominant + no action required → **Briefing**

## WAIT DURATION ESCALATION (Updates only)
- 2–8h: +0.5 urgency · 8–24h: +1.0 · 1–3d: +1.5 (🟡 minimum) · 3–7d: +2.0 (🔴 minimum) · >7d: +3.0 (auto-High)

## CARD COUNTS PER TAB (only when real data supports them)
Briefing: 4–8 · Updates: 3–8 · To-Dos: 6–12 · Objectives: 3–6. Return 0 if no real data.
Hard cap: max 40% of cards in any tab can share the same priority — enforce distribution.

## HEADLINE RULES (all tabs)
- ≤8 words for Briefing/Updates, ≤10 for To-Dos/Objectives
- Must contain ≥1 of: number, name (proper noun), temporal reference, direction word — sourced from REAL integration data
- AVOID: "Important Update", "Action Required", "FYI", "Quick Note", "Sales Update"

## UPDATES — CONSEQUENCE LEADS THE HEADLINE
The most important rule. Headline formula:
\`[CONSEQUENCE + DOLLAR/RISK AMOUNT] — [PERSON] waiting [DURATION] for [ACTION]\`

GOOD: "$42k deal at risk — Sarah Chen waiting 2 days for your reply"
BAD: "Sarah Chen awaiting proposal reply (2d)"

## TO-DOS — LEVERAGE LABEL IS VISIBLE
Every To-Do MUST include a "leverageLabel" field rendered from leverageScore:
- score ≥ 4.0 → "⚡ High Leverage"
- score ≥ 2.5 → "🟠 Deep Work"
- score < 2.5 → "↻ Maintenance"

Every To-Do MUST also include a "howTo" field with 2–3 numbered steps (where to go, what to do, how to know it's done).

## OBJECTIVES — MOMENTUM IS MANDATORY
Every Objective with a quantifiable success metric MUST include a "momentumIndicator" object:
\`{ "state": "on_track" | "behind" | "ahead", "display": "<one-sentence plain-English velocity statement>", "projectedDays": <number>, "daysRemaining": <number>, "delta": <number> }\`

Formula: currentPace = currentValue / daysSinceStart. projectedDays = (target − current) / currentPace. delta = daysRemaining − projectedDays.
- delta within ±5% of daysRemaining → on_track
- delta < −5% → behind
- delta > +5% → ahead

Display sentence example: "At current pace, you'll hit this in 94 days. You need 78. You're 16 days behind."

## QUALITY GATES PER TAB
- **Briefing**: No-Action · Specificity · Source Test (point to exact line in integration data)
- **Updates**: Blocker · Wait (real timestamp) · Person (name in data) · Consequence (in headline) · Non-Fabrication
- **To-Dos**: Verb (start with imperative) · Specificity · Completability (<2h) · How-To (≥2 steps) · Leverage Label visible
- **Objectives**: Outcome (NOT a verb) · Measurability (current+target) · Time-Bound · Momentum populated · Non-Duplication

## SESSION OPENING SUMMARY (REQUIRED)
You MUST also produce an "openingSummary" object — a chief-of-staff brief rendered above all tabs.
Formula:
- Sentence 1 — THE SIGNAL: Single most important Briefing card (highest composite score)
- Sentence 2 — THE FRICTION: Most urgent Updates card (longest wait × highest consequence)
- Sentence 3 — THE FOCUS: Highest-leverage To-Do card (highest leverageScore)

Each sentence must reference REAL names/numbers from the integration data.
If a tab is empty, OMIT that sentence (1–2 sentences is allowed). If ALL tabs are empty, set openingSummary to null.

Example: "Pipeline value dropped 18% overnight — two deals stalled in proposal stage. Sarah Chen at Acme Corp has been waiting 3 days for your reply, putting a $42k deal at risk. Your highest-leverage move today is a 10-minute email to Sarah before your 2pm call."

## DASHBOARD HEALTH SCORE (REQUIRED)
You MUST also produce a "healthScore" object that tells the user how much to trust the dashboard.
\`{ "score": 0–100, "components": { "tabBalance", "sourceDiversity", "specificity", "actionability", "freshness", "crossTabLinking" } (each 0–100), "reason": "<one-line reason if score < 70, else null>" }\`

Weights: tabBalance 25 · sourceDiversity 20 · specificity 20 · actionability 15 · freshness 10 · crossTabLinking 10.

- tabBalance: penalty if any tab has 0 cards or >3× another tab's count
- sourceDiversity: unique sources / total connected sources
- specificity: cards passing the specificity headline test / total
- actionability: actionSuggestion fields with verb + tool/location / total
- freshness: cards with source data <48h old / total
- crossTabLinking: Objectives linked to To-Dos (relatedTodoIds populated) / total objectives

## OUTPUT — RETURN JSON OBJECT WITH EXACTLY THESE TOP-LEVEL KEYS
\`{
  "openingSummary": { "text": "<3-sentence brief>", "signal": "<sentence 1>", "friction": "<sentence 2>", "focus": "<sentence 3>" } | null,
  "healthScore": { "score": 0–100, "components": {...}, "reason": null | "<short reason>" },
  "Briefing": [ ...cards ],
  "Updates": [ ...cards ],
  "To-Dos": [ ...cards ],
  "Objectives": [ ...cards ]
}\`

## CARD SCHEMA — UNIVERSAL FIELDS (all tabs)
- "id": stable string. Reuse the same id if the same underlying source item appears across sessions (e.g. \`outlook:msg:<subject-hash>\`, \`hubspot:deal:<dealname-slug>\`). Stability matters — it powers the Delta Layer.
- "priority": "High" | "Medium" | "Low"
- "title": short headline per the rules above
- "description": 2–3 sentence contextual summary referencing ≥1 Business DNA pillar
- "detail": 3–5 sentence deep-dive with at least one quantified data point
- "category": "Sales" | "Marketing" | "Finance" | "Operations" | "People" | "Product" | "Brand" | "Strategy" | "Market" | "Communication"
- "source": one of "hubspot", "slack", "outlook", "gmail", "google_calendar", "google_drive", "google_docs", "google_sheets", "google_slides", "onedrive", "onenote", "zoom", "teams". Only use "business-dna" for pure DNA-gap cards.
- "icon": one of "building", "trending-up", "users", "plug", "mail", "shopping-bag", "palette", "bot", "target", "lightbulb", "alert", "refresh-cw", "award", "image"
- "timeAgo": accurate relative time string ("12 minutes ago" / "3 hours ago" / "2 days ago" / "Apr 8, 2026")
- "timestamp": ISO 8601 of the original source event
- "actionSuggestion": specific next step (verb + tool/location, completable in <15 min)
- "metadata": source-specific context. **CRITICAL for emails (outlook/gmail)**: when integration data contains "SUBJECT: ..." and "BODY: ...", you MUST copy them VERBATIM into metadata.subject and metadata.bodyPreview — never paraphrase or summarize. Other fields: senderName/senderEmail (from FROM), receivedAt (from DATE) for outlook/gmail; scheduledDate/duration/attendees for zoom/calendar; contactName/dealValue/stage for hubspot; channel/author/messageText (verbatim) for slack/teams; fileName/sharedBy for onedrive/drive; notebook for onenote.

## CARD SCHEMA — TAB-SPECIFIC FIELDS
- **Briefing**: "signalType" (Metric Shift | Competitive Move | Pipeline Change | Team Activity | Integration Digest | DNA Update | Opportunity Detected | Risk Surfaced)
- **Updates**: "waitingParty" (real person/entity), "requestType" (Reply Needed | Decision Required | Document Review | Meeting Prep | Follow-Up Overdue | Deal Action | Task Completion), "waitDuration" (from real timestamp), "consequence" (the cost — already surfaced in headline)
- **To-Dos**: "taskType", "howTo" (≥2 numbered steps), "estimatedDuration" ("⚡ Quick" | "⏱ Medium" | "🟠 Deep Work"), "leverageScore" (1–5, hidden), "leverageLabel" (rendered from score — always populate)
- **Objectives**: "objectiveType", "successMetric" { current, target, gap, source } — REAL data only, "progress" (0–100), "timeHorizon" ("This Sprint" | "This Month" | "This Quarter" | "This Half"), "relatedTodoIds" (linked To-Do ids — populate when possible), "momentumIndicator" (mandatory when metric is quantifiable)

Sort cards within each tab by priority (High first). **Empty tabs are correct when no data supports them. NEVER fabricate.**
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

    let parsed: Record<string, any>;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (e) {
      console.error("Failed to parse AI response:", rawContent.slice(0, 500));
      parsed = {};
    }

    // 8. Normalize tabs and apply Delta Layer (compute deltaState per card vs. previous snapshot)
    const TAB_KEYS: Array<"Briefing" | "Updates" | "To-Dos" | "Objectives"> = ["Briefing", "Updates", "To-Dos", "Objectives"];
    const PRIORITY_ORDER: Record<string, number> = { Low: 1, Medium: 2, High: 3 };

    const annotateDelta = (card: any, tabKey: string) => {
      const prev = prevSnapshot[card.id];
      let deltaState: "new" | "escalated" | "unchanged" = "new";
      if (prev) {
        deltaState = "unchanged";
        if (PRIORITY_ORDER[card.priority] > PRIORITY_ORDER[prev.priority]) {
          deltaState = "escalated";
        }
      }
      return { ...card, deltaState, tab: tabKey };
    };

    // Backfill leverageLabel from leverageScore if AI omitted it on a To-Do
    const backfillLeverage = (card: any) => {
      if (card.leverageLabel) return card;
      if (typeof card.leverageScore !== "number") return card;
      const s = card.leverageScore;
      const label = s >= 4 ? "⚡ High Leverage" : s >= 2.5 ? "🟠 Deep Work" : "↻ Maintenance";
      return { ...card, leverageLabel: label };
    };

    const tabsResult: Record<string, any[]> = {};
    const nextSnapshot: Record<string, { priority: string; tab: string }> = {};
    for (const tabKey of TAB_KEYS) {
      const arr = Array.isArray(parsed[tabKey]) ? parsed[tabKey] : [];
      const annotated = arr.map((c: any) => {
        const enriched = tabKey === "To-Dos" ? backfillLeverage(c) : c;
        const withDelta = annotateDelta(enriched, tabKey);
        nextSnapshot[withDelta.id] = { priority: withDelta.priority, tab: tabKey };
        return withDelta;
      });
      tabsResult[tabKey] = annotated;
    }

    // 9. Resolved cards = present in previous snapshot, missing from next
    const resolvedCardIds: string[] = [];
    for (const id of Object.keys(prevSnapshot)) {
      if (!(id in nextSnapshot)) resolvedCardIds.push(id);
    }

    const openingSummary = parsed.openingSummary && typeof parsed.openingSummary === "object"
      ? parsed.openingSummary
      : null;
    const healthScore = parsed.healthScore && typeof parsed.healthScore === "object"
      ? parsed.healthScore
      : null;

    // 10. Persist new snapshot (upsert by user_id + brand_id)
    try {
      await supabase
        .from("dashboard_snapshots")
        .upsert(
          {
            user_id: user.id,
            brand_id: brandId,
            cards: nextSnapshot,
            opening_summary: openingSummary?.text || null,
            health_score: healthScore,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,brand_id" },
        );
    } catch (snapErr) {
      console.error("Snapshot persist error:", snapErr);
      // Non-fatal — return the dashboard anyway
    }

    return new Response(JSON.stringify({
      tabs: tabsResult,
      brandName,
      openingSummary,
      healthScore,
      resolvedCardIds,
    }), {
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
