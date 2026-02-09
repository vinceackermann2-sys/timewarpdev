import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Google helpers ───

async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret,
        refresh_token: refreshToken, grant_type: "refresh_token",
      }),
    });
    if (!res.ok) { console.error("Google token refresh failed:", await res.text()); return null; }
    return (await res.json()).access_token;
  } catch (e) { console.error("Google token refresh error:", e); return null; }
}

async function fetchGmailEmails(token: string) {
  try {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=500",
      { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const msgs = (await res.json()).messages || [];
    const details: any[] = [];
    for (let i = 0; i < Math.min(msgs.length, 500); i += 10) {
      const batch = msgs.slice(i, i + 10);
      const results = await Promise.all(batch.map(async (m: any) => {
        try {
          const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${token}` } });
          if (!r.ok) return null;
          const d = await r.json();
          const h = d.payload?.headers || [];
          return { id: m.id, subject: h.find((x:any)=>x.name==="Subject")?.value||"", from: h.find((x:any)=>x.name==="From")?.value||"", to: h.find((x:any)=>x.name==="To")?.value||"", date: h.find((x:any)=>x.name==="Date")?.value||"", snippet: d.snippet||"", labels: d.labelIds||[] };
        } catch { return null; }
      }));
      details.push(...results.filter(Boolean));
      if (i + 10 < msgs.length) await new Promise(r => setTimeout(r, 100));
    }
    return details;
  } catch (e) { console.error("Gmail error:", e); return []; }
}

async function fetchGoogleCalendar(token: string) {
  try {
    const now = new Date().toISOString();
    const yearAgo = new Date(Date.now() - 365*24*60*60*1000).toISOString();
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${yearAgo}&timeMax=${now}&maxResults=2500&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    return ((await res.json()).items||[]).map((e:any)=>({ id: e.id, summary: e.summary||"Untitled", start: e.start?.dateTime||e.start?.date||"", end: e.end?.dateTime||e.end?.date||"", attendees: e.attendees?.length||0, hasConferencing: !!e.conferenceData }));
  } catch (e) { console.error("Google Calendar error:", e); return []; }
}

async function fetchGoogleDocs(token: string) {
  try {
    const res = await fetch("https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.document' or mimeType='application/pdf' or mimeType='application/vnd.google-apps.presentation' or mimeType='application/vnd.google-apps.form'&fields=files(id,name,mimeType,modifiedTime,shared)&pageSize=200",
      { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    return (await res.json()).files || [];
  } catch (e) { console.error("Drive docs error:", e); return []; }
}

async function fetchGoogleSheets(token: string) {
  try {
    const res = await fetch("https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,modifiedTime,shared)&pageSize=100",
      { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    return (await res.json()).files || [];
  } catch (e) { console.error("Drive sheets error:", e); return []; }
}

// ─── Microsoft helpers ───

async function refreshMicrosoftToken(refreshToken: string): Promise<string | null> {
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret,
        refresh_token: refreshToken, grant_type: "refresh_token",
      }),
    });
    if (!res.ok) { console.error("Microsoft token refresh failed:", await res.text()); return null; }
    const data = await res.json();
    return data.access_token;
  } catch (e) { console.error("Microsoft token refresh error:", e); return null; }
}

async function fetchOutlookEmails(token: string) {
  try {
    const res = await fetch("https://graph.microsoft.com/v1.0/me/messages?$top=500&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,categories&$orderby=receivedDateTime desc",
      { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { console.error("Outlook error:", res.status); return []; }
    return ((await res.json()).value || []).map((m: any) => ({
      id: m.id,
      subject: m.subject || "",
      from: m.from?.emailAddress?.address || m.from?.emailAddress?.name || "",
      to: (m.toRecipients || []).map((r:any) => r.emailAddress?.address).join(", "),
      date: m.receivedDateTime || "",
      snippet: (m.bodyPreview || "").slice(0, 200),
      labels: m.categories || [],
    }));
  } catch (e) { console.error("Outlook error:", e); return []; }
}

async function fetchOutlookCalendar(token: string) {
  try {
    const now = new Date().toISOString();
    const yearAgo = new Date(Date.now() - 365*24*60*60*1000).toISOString();
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/events?$top=500&$select=id,subject,start,end,attendees,isOnlineMeeting&$filter=start/dateTime ge '${yearAgo}' and start/dateTime le '${now}'&$orderby=start/dateTime desc`,
      { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { console.error("Outlook calendar error:", res.status); return []; }
    return ((await res.json()).value || []).map((e: any) => ({
      id: e.id,
      summary: e.subject || "Untitled",
      start: e.start?.dateTime || "",
      end: e.end?.dateTime || "",
      attendees: e.attendees?.length || 0,
      hasConferencing: !!e.isOnlineMeeting,
    }));
  } catch (e) { console.error("Outlook calendar error:", e); return []; }
}

async function fetchOneDriveFiles(token: string) {
  try {
    const res = await fetch("https://graph.microsoft.com/v1.0/me/drive/root/children?$top=200&$select=id,name,lastModifiedDateTime,shared,file",
      { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { console.error("OneDrive error:", res.status); return []; }
    return ((await res.json()).value || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.file?.mimeType || "",
      modifiedTime: f.lastModifiedDateTime || "",
      shared: !!f.shared,
    }));
  } catch (e) { console.error("OneDrive error:", e); return []; }
}

// ─── Slack helpers ───

async function fetchSlackData(botToken: string) {
  const headers = { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" };
  const channels: any[] = [];
  const recentMessages: any[] = [];

  try {
    // Fetch public channels
    const chRes = await fetch("https://slack.com/api/conversations.list?types=public_channel&limit=200", { headers });
    if (chRes.ok) {
      const chData = await chRes.json();
      if (chData.ok) {
        for (const ch of (chData.channels || []).slice(0, 50)) {
          channels.push({ id: ch.id, name: ch.name, memberCount: ch.num_members || 0, topic: ch.topic?.value || "", purpose: ch.purpose?.value || "" });
          // Fetch recent messages from each channel (up to 20)
          try {
            const msgRes = await fetch(`https://slack.com/api/conversations.history?channel=${ch.id}&limit=20`, { headers });
            if (msgRes.ok) {
              const msgData = await msgRes.json();
              if (msgData.ok) {
                for (const msg of (msgData.messages || [])) {
                  if (msg.subtype && msg.subtype !== "bot_message") continue;
                  recentMessages.push({ channel: ch.name, user: msg.user || msg.username || "bot", text: (msg.text || "").slice(0, 300), ts: msg.ts });
                }
              }
            }
          } catch {}
        }
      }
    }
  } catch (e) { console.error("Slack fetch error:", e); }

  return { channels, recentMessages };
}

// ─── Main handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting background research sync...");

    // Get all users with any connected service
    const { data: googleConns } = await supabase.from("google_workspace_connections").select("user_id").eq("connected", true);
    const { data: msConns } = await supabase.from("microsoft_workspace_connections").select("user_id").eq("connected", true);
    const { data: slackLinks } = await supabase.from("slack_user_links").select("user_id, slack_team_id");

    // Deduplicate user IDs
    const userIds = new Set<string>();
    for (const c of (googleConns || [])) userIds.add(c.user_id);
    for (const c of (msConns || [])) userIds.add(c.user_id);
    for (const c of (slackLinks || [])) userIds.add(c.user_id);

    if (userIds.size === 0) {
      console.log("No connected users found");
      return new Response(JSON.stringify({ message: "No users to sync", synced: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Found ${userIds.size} unique users to sync`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const userId of userIds) {
      try {
        let allEmails: any[] = [];
        let allCalendarEvents: any[] = [];
        let allDocuments: any[] = [];
        let allSpreadsheets: any[] = [];
        let slackChannels: any[] = [];
        let slackMessages: any[] = [];
        const sources: string[] = [];

        // ── Google ──
        const isGoogleUser = (googleConns || []).some(c => c.user_id === userId);
        if (isGoogleUser) {
          const { data: tokenData } = await supabase.from("google_workspace_tokens").select("refresh_token").eq("user_id", userId).single();
          if (tokenData?.refresh_token) {
            const token = await refreshGoogleToken(tokenData.refresh_token);
            if (token) {
              const [emails, cal, docs, sheets] = await Promise.all([
                fetchGmailEmails(token), fetchGoogleCalendar(token), fetchGoogleDocs(token), fetchGoogleSheets(token),
              ]);
              allEmails.push(...emails);
              allCalendarEvents.push(...cal);
              allDocuments.push(...docs);
              allSpreadsheets.push(...sheets);
              sources.push("Google");
              console.log(`User ${userId} Google: ${emails.length} emails, ${cal.length} events, ${docs.length} docs`);
            }
          }
        }

        // ── Microsoft ──
        const isMsUser = (msConns || []).some(c => c.user_id === userId);
        if (isMsUser) {
          const { data: tokenData } = await supabase.from("microsoft_workspace_tokens").select("refresh_token, access_token, expires_at").eq("user_id", userId).single();
          if (tokenData) {
            let token = tokenData.access_token;
            // Refresh if expired
            if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
              if (tokenData.refresh_token) {
                const refreshed = await refreshMicrosoftToken(tokenData.refresh_token);
                if (refreshed) token = refreshed;
              }
            }
            if (token) {
              const [emails, cal, files] = await Promise.all([
                fetchOutlookEmails(token), fetchOutlookCalendar(token), fetchOneDriveFiles(token),
              ]);
              allEmails.push(...emails);
              allCalendarEvents.push(...cal);
              allDocuments.push(...files);
              sources.push("Microsoft");
              console.log(`User ${userId} Microsoft: ${emails.length} emails, ${cal.length} events, ${files.length} files`);
            }
          }
        }

        // ── Slack ──
        const userSlackLinks = (slackLinks || []).filter(l => l.user_id === userId);
        if (userSlackLinks.length > 0) {
          for (const link of userSlackLinks) {
            const { data: installation } = await supabase.from("slack_installations").select("bot_token").eq("team_id", link.slack_team_id).single();
            if (installation?.bot_token) {
              const slackData = await fetchSlackData(installation.bot_token);
              slackChannels.push(...slackData.channels);
              slackMessages.push(...slackData.recentMessages);
              sources.push("Slack");
              console.log(`User ${userId} Slack: ${slackData.channels.length} channels, ${slackData.recentMessages.length} messages`);
            }
          }
        }

        // Build top contacts
        const contactCounts: Record<string, number> = {};
        for (const email of allEmails) {
          const from = email.from?.match(/<(.+)>/)?.[1] || email.from?.trim();
          if (from) contactCounts[from] = (contactCounts[from] || 0) + 1;
        }
        const topContacts = Object.entries(contactCounts).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([email, count]) => ({ email, count }));

        const researchSummary = {
          lastUpdated: new Date().toISOString(),
          sources,
          emailPatterns: allEmails.map((e: any) => ({ subject: e.subject, from: e.from, labels: e.labels })),
          calendarSummary: allCalendarEvents.map((e: any) => ({ summary: e.summary, start: e.start, attendees: e.attendees })),
          documentList: allDocuments.map((d: any) => ({ name: d.name, modified: d.modifiedTime })),
        };

        const { error: upsertError } = await supabase.from("workspace_research").upsert({
          user_id: userId,
          research_summary: researchSummary,
          raw_data: { emails: allEmails, calendarEvents: allCalendarEvents, documents: allDocuments, spreadsheets: allSpreadsheets, topContacts, slackChannels, slackMessages, sources },
          findings: [],
          emails_analyzed: allEmails.length,
          events_analyzed: allCalendarEvents.length,
          documents_analyzed: allDocuments.length,
          sheets_analyzed: allSpreadsheets.length,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        if (upsertError) { console.error(`Upsert error for ${userId}:`, upsertError); errorCount++; }
        else { syncedCount++; }
      } catch (e) { console.error(`Error for user ${userId}:`, e); errorCount++; }
    }

    console.log(`Sync complete: ${syncedCount} synced, ${errorCount} errors`);
    return new Response(JSON.stringify({ message: "Sync complete", synced: syncedCount, errors: errorCount, totalUsers: userIds.size }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Sync function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
