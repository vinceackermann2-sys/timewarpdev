import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function refreshMicrosoftToken(refreshToken: string): Promise<any> {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("MICROSOFT_CLIENT_ID")!,
      client_secret: Deno.env.get("MICROSOFT_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

async function refreshGoogleToken(refreshToken: string): Promise<any> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

async function refreshHubSpotToken(refreshToken: string): Promise<any> {
  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("HUBSPOT_CLIENT_ID")!,
      client_secret: Deno.env.get("HUBSPOT_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

async function getValidToken(supabaseAdmin: any, userId: string, provider: string): Promise<string | null> {
  const { data: tokenRow } = await supabaseAdmin
    .from("user_oauth_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (!tokenRow) return null;

  // Check if token is expired
  const expiresAt = tokenRow.token_expires_at ? new Date(tokenRow.token_expires_at) : null;
  const isExpired = expiresAt && expiresAt < new Date(Date.now() + 60000); // 1 min buffer

  if (!isExpired) return tokenRow.access_token;

  // Try refresh
  if (!tokenRow.refresh_token) return null;

  let refreshed: any;
  if (provider === "microsoft") {
    refreshed = await refreshMicrosoftToken(tokenRow.refresh_token);
  } else if (provider === "google") {
    refreshed = await refreshGoogleToken(tokenRow.refresh_token);
  } else if (provider === "hubspot") {
    refreshed = await refreshHubSpotToken(tokenRow.refresh_token);
  } else {
    return tokenRow.access_token; // Slack tokens don't expire typically
  }

  if (refreshed.access_token) {
    await supabaseAdmin
      .from("user_oauth_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || tokenRow.refresh_token,
        token_expires_at: refreshed.expires_in
          ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
          : tokenRow.token_expires_at,
      })
      .eq("user_id", userId)
      .eq("provider", provider);

    return refreshed.access_token;
  }

  return null;
}

// Extract text from a PDF using the AI gateway (Gemini multimodal)
async function extractPdfText(pdfBytes: Uint8Array, fileName: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return "";

  const b64 = base64Encode(pdfBytes);
  const dataUrl = `data:application/pdf;base64,${b64}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a document text extractor. Extract ALL text content from the document. Return ONLY the extracted text, no commentary." },
          {
            role: "user",
            content: [
              { type: "text", text: `Extract all text from this PDF document "${fileName}". Return the complete text content.` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return (data.choices?.[0]?.message?.content || "").slice(0, 15000);
    }
  } catch (e) {
    console.error("PDF extraction failed");
  }
  return "";
}

// Extract content from a video using the AI gateway (Gemini multimodal)
async function extractVideoContent(videoBytes: Uint8Array, fileName: string, mimeType: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return "";

  const b64 = base64Encode(videoBytes);
  const mime = mimeType || "video/mp4";
  const dataUrl = `data:${mime};base64,${b64}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a video content analyst. Transcribe all spoken audio and describe key visual content. Return structured results." },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyze this video "${fileName}". Transcribe all spoken content word-for-word, describe key visual scenes, and extract any on-screen text, numbers, or data. Format with ## Transcript, ## Visual Content, ## Key Findings sections.` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return (data.choices?.[0]?.message?.content || "").slice(0, 15000);
    }
  } catch (e) {
    console.error("Video extraction failed");
  }
  return "";
}

const VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/avi", "video/mpeg"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".avi", ".mpeg", ".mpg"];

function isVideoFile(name: string, mime: string): boolean {
  const lname = (name || "").toLowerCase();
  return VIDEO_MIMES.includes(mime) || mime.startsWith("video/") || VIDEO_EXTENSIONS.some(ext => lname.endsWith(ext));
}

interface SyncLimits {
  emails?: number;
  events?: number;
  files?: number;
  contacts?: number;
  notes?: number;
  tasks?: number;
}

interface SyncCategories {
  emails?: boolean;
  events?: boolean;
  files?: boolean;
  contacts?: boolean;
  notes?: boolean;
  tasks?: boolean;
}

async function fetchAllMicrosoftEmails(accessToken: string): Promise<any[]> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const allEmails: any[] = [];
  let url: string | null = `https://graph.microsoft.com/v1.0/me/messages?$top=500&$orderby=receivedDateTime desc`;

  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`Microsoft mail pagination failed (${res.status}): ${errText.slice(0, 500)}`);
      break;
    }
    const data = await res.json();
    const items = data.value || [];
    allEmails.push(...items);
    console.log(`Microsoft mail page: ${items.length} items, total so far: ${allEmails.length}`);
    url = data["@odata.nextLink"] || null;
    // Safety cap at 5000 to avoid edge function timeout
    if (allEmails.length >= 5000) break;
  }
  return allEmails;
}

async function fetchMicrosoftData(accessToken: string, categories?: SyncCategories, limits?: SyncLimits): Promise<any> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const cats = categories || { emails: true, events: true, files: true, contacts: true, notes: true, tasks: true };
  const lims = limits || {};

  const fetches: Promise<Response>[] = [];
  const fetchKeys: string[] = [];

  // Emails are fetched separately with pagination below
  if (cats.events !== false) {
    // Fetch all events with pagination
    const allEvents: any[] = [];
    let evUrl: string | null = `https://graph.microsoft.com/v1.0/me/events?$top=500&$select=subject,start,end,organizer,attendees&$orderby=start/dateTime desc`;
    while (evUrl) {
      const r = await fetch(evUrl, { headers });
      if (!r.ok) break;
      const d = await r.json();
      allEvents.push(...(d.value || []));
      evUrl = d["@odata.nextLink"] || null;
      if (allEvents.length >= 5000) break;
    }
    console.log(`Microsoft cal total: ${allEvents.length} events`);
    fetches.push(Promise.resolve(new Response(JSON.stringify({ value: allEvents }), { status: 200 })));
    fetchKeys.push("cal");
  }
  if (cats.files !== false) {
    // Fetch all files with pagination
    const allFiles: any[] = [];
    let fUrl: string | null = `https://graph.microsoft.com/v1.0/me/drive/root/children?$top=500`;
    while (fUrl) {
      const r = await fetch(fUrl, { headers });
      if (!r.ok) break;
      const d = await r.json();
      allFiles.push(...(d.value || []));
      fUrl = d["@odata.nextLink"] || null;
      if (allFiles.length >= 5000) break;
    }
    // Also fetch recent files
    const recentRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/recent?$top=200`, { headers });
    if (recentRes.ok) {
      const recentData = await recentRes.json();
      const existingIds = new Set(allFiles.map((f: any) => f.id));
      for (const f of (recentData.value || [])) {
        if (!existingIds.has(f.id)) allFiles.push(f);
      }
    }
    console.log(`Microsoft files total: ${allFiles.length} files`);
    fetches.push(Promise.resolve(new Response(JSON.stringify({ value: allFiles }), { status: 200 })));
    fetchKeys.push("files");
  }
  if (cats.contacts !== false) {
    const contactLimit = Math.min(Math.max(lims.contacts || 200, 1), 500);
    fetches.push(fetch(`https://graph.microsoft.com/v1.0/me/contacts?$top=${contactLimit}&$select=displayName,emailAddresses,businessPhones,companyName,jobTitle,department`, { headers }));
    fetchKeys.push("contacts");
  }
  if (cats.notes !== false) {
    fetches.push(fetch(`https://graph.microsoft.com/v1.0/me/onenote/pages?$top=100&$select=title,createdDateTime,lastModifiedDateTime,contentUrl&$orderby=lastModifiedDateTime desc`, { headers }));
    fetchKeys.push("notes");
  }
  if (cats.tasks !== false) {
    fetches.push(fetch(`https://graph.microsoft.com/v1.0/me/todo/lists`, { headers }));
    fetchKeys.push("tasks");
  }

  // Fetch emails with full pagination in parallel with other requests
  const emailPromise = cats.emails !== false ? fetchAllMicrosoftEmails(accessToken) : Promise.resolve([]);

  const responses = await Promise.all(fetches);
  const results: Record<string, any> = {};
  for (let i = 0; i < fetchKeys.length; i++) {
    if (responses[i].ok) {
      results[fetchKeys[i]] = await responses[i].json();
      console.log(`Microsoft ${fetchKeys[i]}: ${(results[fetchKeys[i]].value || []).length} items`);
    } else {
      const errText = await responses[i].text().catch(() => "");
      console.error(`Microsoft ${fetchKeys[i]} failed (${responses[i].status}): ${errText.slice(0, 500)}`);
      results[fetchKeys[i]] = { value: [] };
    }
  }

  const rawEmails = await emailPromise;
  console.log(`Microsoft mail total: ${rawEmails.length} emails`);

  const calendar = results.cal || { value: [] };
  const files = results.files || { value: [] };
  const contactsData = results.contacts || { value: [] };
  const notesData = results.notes || { value: [] };
  const tasksListData = results.tasks || { value: [] };

  // Extract full email body text (strip HTML)
  if (rawEmails.length > 0) {
    console.log("Sample email object keys:", JSON.stringify(Object.keys(rawEmails[0])));
  }
  const emails = rawEmails.map((m: any) => {
    let bodyText = m.body?.content || "";
    if (bodyText) {
      bodyText = bodyText
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 5000);
    }
    if (!bodyText && m.bodyPreview) {
      bodyText = m.bodyPreview.slice(0, 5000);
    }
    let subject = m.subject;
    if (!subject || subject.trim() === "") {
      if (m.bodyPreview) {
        subject = m.bodyPreview.slice(0, 80).trim();
        if (m.bodyPreview.length > 80) subject += "…";
      } else if (m.from?.emailAddress?.name) {
        subject = `Email from ${m.from.emailAddress.name}`;
      } else if (m.from?.emailAddress?.address) {
        subject = `Email from ${m.from.emailAddress.address}`;
      } else {
        subject = `Email (${m.receivedDateTime ? new Date(m.receivedDateTime).toLocaleDateString() : "no date"})`;
      }
    }
    return {
      subject,
      from: m.from?.emailAddress?.address,
      date: m.receivedDateTime,
      body: bodyText,
    };
  });

  // Contacts
  const contacts = (contactsData.value || []).map((c: any) => ({
    name: c.displayName,
    emails: (c.emailAddresses || []).map((e: any) => e.address),
    phones: c.businessPhones || [],
    company: c.companyName,
    jobTitle: c.jobTitle,
    department: c.department,
  }));

  // OneNote pages
  const notes = (notesData.value || []).map((p: any) => ({
    title: p.title,
    created: p.createdDateTime,
    lastModified: p.lastModifiedDateTime,
  }));

  // Fetch OneNote page content for top pages
  for (let i = 0; i < Math.min(notes.length, 50); i++) {
    const page = notesData.value[i];
    if (page?.contentUrl) {
      try {
        const contentRes = await fetch(page.contentUrl, { headers });
        if (contentRes.ok) {
          let html = await contentRes.text();
          html = html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          notes[i].content = html.slice(0, 8000);
        }
      } catch { /* skip */ }
    }
  }

  // To Do tasks - fetch tasks from each list
  const todoTasks: any[] = [];
  for (const list of (tasksListData.value || []).slice(0, 10)) {
    try {
      const tasksRes = await fetch(`https://graph.microsoft.com/v1.0/me/todo/lists/${list.id}/tasks?$top=100`, { headers });
      if (tasksRes.ok) {
        const tasksJson = await tasksRes.json();
        for (const t of (tasksJson.value || [])) {
          todoTasks.push({
            title: t.title,
            status: t.status,
            importance: t.importance,
            dueDate: t.dueDateTime?.dateTime,
            listName: list.displayName,
            body: t.body?.content?.replace(/<[^>]+>/g, " ").trim().slice(0, 1000) || null,
          });
        }
      }
    } catch { /* skip */ }
  }

  // Try to download text content from files (PDFs, docs, etc.)
  const fileDetails = [];
  for (const f of (files.value || [])) {
    const fileInfo: any = {
      name: f.name,
      size: f.size,
      lastModified: f.lastModifiedDateTime,
      webUrl: f.webUrl,
      mimeType: f["file"]?.mimeType || "",
    };

    const mime = fileInfo.mimeType || "";
    const name = (f.name || "").toLowerCase();
    if (name.endsWith(".txt") || name.endsWith(".csv") || mime.includes("text/")) {
      try {
        const contentRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${f.id}/content`, { headers });
        if (contentRes.ok) {
          fileInfo.extractedContent = (await contentRes.text()).slice(0, 10000);
        }
      } catch { /* skip */ }
    } else if (name.endsWith(".pdf") || mime === "application/pdf") {
      try {
        const contentRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${f.id}/content`, { headers });
        if (contentRes.ok) {
          const buf = new Uint8Array(await contentRes.arrayBuffer());
          if (buf.length < 5 * 1024 * 1024) {
            fileInfo.extractedContent = await extractPdfText(buf, f.name);
          }
        }
      } catch { /* skip */ }
    } else if (isVideoFile(f.name, mime)) {
      try {
        const contentRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${f.id}/content`, { headers });
        if (contentRes.ok) {
          const buf = new Uint8Array(await contentRes.arrayBuffer());
          if (buf.length < 10 * 1024 * 1024) {
            fileInfo.extractedContent = await extractVideoContent(buf, f.name, mime);
          }
        }
      } catch { /* skip */ }
    }

    fileDetails.push(fileInfo);
  }

  return {
    emails: cats.emails !== false ? emails : [],
    events: cats.events !== false ? (calendar.value || []).map((e: any) => ({
      subject: e.subject,
      start: e.start?.dateTime,
      end: e.end?.dateTime,
      organizer: e.organizer?.emailAddress?.address,
      attendees: e.attendees?.length || 0,
    })) : [],
    files: cats.files !== false ? fileDetails : [],
    contacts: cats.contacts !== false ? contacts : [],
    notes: cats.notes !== false ? notes : [],
    tasks: cats.tasks !== false ? todoTasks : [],
  };
}

async function fetchGoogleData(accessToken: string): Promise<any> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const [mailRes, calRes, driveRes] = await Promise.all([
    fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15", { headers }),
    fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=20&orderBy=startTime&singleEvents=true&timeMin=" + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), { headers }),
    fetch("https://www.googleapis.com/drive/v3/files?pageSize=10&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink)", { headers }),
  ]);

  const [mailList, calendar, drive] = await Promise.all([
    mailRes.ok ? mailRes.json() : { messages: [] },
    calRes.ok ? calRes.json() : { items: [] },
    driveRes.ok ? driveRes.json() : { files: [] },
  ]);

  // Fetch full email body for top 10 (in parallel batches to stay fast)
  const emailDetails = [];
  const messageIds = (mailList.messages || []).slice(0, 10);
  const emailFetches = messageIds.map(async (msg: any) => {
    try {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers }
      );
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const getHeader = (name: string) => detail.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;
        
        let bodyText = "";
        const extractText = (part: any) => {
          if (part.mimeType === "text/plain" && part.body?.data) {
            bodyText += atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
          } else if (part.parts) {
            for (const p of part.parts) extractText(p);
          }
        };
        
        if (detail.payload) extractText(detail.payload);
        if (!bodyText && detail.snippet) bodyText = detail.snippet;
        
        return {
          subject: getHeader("Subject"),
          from: getHeader("From"),
          date: getHeader("Date"),
          body: bodyText.slice(0, 3000),
        };
      }
    } catch { /* skip */ }
    return null;
  });
  const emailResults = await Promise.all(emailFetches);
  emailDetails.push(...emailResults.filter(Boolean));

  // Fetch content from Google Drive files where possible
  // Process drive files (limit to 10, skip heavy video extraction)
  const fileDetails = [];
  for (const f of (drive.files || []).slice(0, 10)) {
    const fileInfo: any = {
      name: f.name,
      type: f.mimeType,
      lastModified: f.modifiedTime,
      webUrl: f.webViewLink,
    };

    // Export Google Docs/Sheets as plain text
    if (f.mimeType === "application/vnd.google-apps.document") {
      try {
        const exportRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=text/plain`,
          { headers }
        );
        if (exportRes.ok) {
          fileInfo.extractedContent = (await exportRes.text()).slice(0, 8000);
        }
      } catch { /* skip */ }
    } else if (f.mimeType === "application/vnd.google-apps.spreadsheet") {
      try {
        const exportRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=text/csv`,
          { headers }
        );
        if (exportRes.ok) {
          fileInfo.extractedContent = (await exportRes.text()).slice(0, 8000);
        }
      } catch { /* skip */ }
    } else if (f.mimeType === "text/plain" || f.mimeType === "text/csv") {
      try {
        const dlRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
          { headers }
        );
        if (dlRes.ok) {
          fileInfo.extractedContent = (await dlRes.text()).slice(0, 8000);
        }
      } catch { /* skip */ }
    } else if (f.mimeType === "application/pdf") {
      // Only process small PDFs (under 2MB) to avoid timeout
      try {
        const dlRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
          { headers }
        );
        if (dlRes.ok) {
          const buf = new Uint8Array(await dlRes.arrayBuffer());
          if (buf.length < 2 * 1024 * 1024) {
            fileInfo.extractedContent = await extractPdfText(buf, f.name);
          }
        }
      } catch { /* skip */ }
    }
    // Skip video extraction during sync to avoid timeouts

    fileDetails.push(fileInfo);
  }

  return {
    emails: emailDetails,
    events: (calendar.items || []).map((e: any) => ({
      summary: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      attendees: e.attendees?.length || 0,
    })),
    files: fileDetails,
  };
}

async function paginateSlack(url: string, headers: Record<string, string>, key: string, maxPages = 20): Promise<any[]> {
  let all: any[] = [];
  let cursor = "";
  for (let page = 0; page < maxPages; page++) {
    const sep = url.includes("?") ? "&" : "?";
    const pageUrl = cursor ? `${url}${sep}cursor=${encodeURIComponent(cursor)}` : url;
    try {
      const res = await fetch(pageUrl, { headers });
      if (!res.ok) break;
      const data = await res.json();
      if (!data.ok) break;
      all = all.concat(data[key] || []);
      cursor = data.response_metadata?.next_cursor || "";
      if (!cursor) break;
    } catch { break; }
  }
  return all;
}

async function fetchSlackData(accessToken: string): Promise<any> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Paginate all channels and users; fetch team info
  const [allChannels, allMembers, teamRes] = await Promise.all([
    paginateSlack("https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200", headers, "channels"),
    paginateSlack("https://slack.com/api/users.list?limit=200", headers, "members"),
    fetch("https://slack.com/api/team.info", { headers }),
  ]);

  const team = await teamRes.json();

  console.log("Slack data fetched, channels:", allChannels.length, "users:", allMembers.length);

  // Parse users (skip bots and deleted)
  const users = allMembers
    .filter((u: any) => !u.deleted && !u.is_bot && u.id !== "USLACKBOT")
    .map((u: any) => ({
      id: u.id,
      name: u.real_name || u.name,
      displayName: u.profile?.display_name || null,
      title: u.profile?.title || null,
      email: u.profile?.email || null,
      phone: u.profile?.phone || null,
      timezone: u.tz_label || null,
      isAdmin: u.is_admin || false,
      isOwner: u.is_owner || false,
      status: u.profile?.status_text || null,
    }));

  // Build a user ID → name lookup
  const userMap: Record<string, string> = {};
  for (const u of users) userMap[u.id] = u.name;

  const channelMessages: any[] = [];
  const pinnedMessages: any[] = [];

  // Fetch ALL messages from ALL channels (paginate history, up to 1000 msgs per channel)
  // Process in batches of 5 to avoid rate limits
  for (let i = 0; i < allChannels.length; i += 5) {
    const batch = allChannels.slice(i, i + 5);
    const channelFetches = batch.map(async (ch: any) => {
      // Paginate full history (up to 1000 messages per channel)
      const allMsgs = await paginateSlack(
        `https://slack.com/api/conversations.history?channel=${ch.id}&limit=200`,
        headers, "messages", 5
      );

      // Fetch pins
      let pins: any[] = [];
      try {
        const pinsRes = await fetch(`https://slack.com/api/pins.list?channel=${ch.id}`, { headers });
        if (pinsRes.ok) {
          const pinsData = await pinsRes.json();
          if (pinsData.ok) pins = pinsData.items || [];
        }
      } catch { /* skip */ }

      return { ch, allMsgs, pins };
    });

    const results = await Promise.all(channelFetches);

    for (const { ch, allMsgs, pins } of results) {
      if (allMsgs.length) {
        channelMessages.push({
          channel: ch.name,
          messages: allMsgs.map((m: any) => ({
            text: m.text?.slice(0, 500),
            ts: m.ts,
            user: userMap[m.user] || m.user,
            subtype: m.subtype || null,
          })),
        });
      }

      for (const pin of pins) {
        const msg = pin.message || pin;
        pinnedMessages.push({
          channel: ch.name,
          text: (msg.text || "").slice(0, 1000),
          user: userMap[msg.user] || msg.user,
          ts: msg.ts,
        });
      }
    }
  }

  // Paginate all shared files
  let sharedFiles: any[] = [];
  try {
    const allFiles = await paginateSlack("https://slack.com/api/files.list?count=100", headers, "files", 10);
    sharedFiles = allFiles.map((f: any) => ({
      name: f.name,
      title: f.title,
      type: f.filetype,
      size: f.size,
      user: userMap[f.user] || f.user,
      created: f.created,
      url: f.url_private,
      channels: f.channels?.map((cid: string) => {
        const found = allChannels.find((c: any) => c.id === cid);
        return found?.name || cid;
      }),
    }));
  } catch { /* skip */ }

  return {
    team: team.team?.name || team.name || "Unknown",
    teamDomain: team.team?.domain || null,
    teamIcon: team.team?.icon?.image_132 || null,
    channels: allChannels.map((c: any) => ({
      name: c.name,
      id: c.id,
      memberCount: c.num_members,
      topic: c.topic?.value?.slice(0, 200),
      purpose: c.purpose?.value?.slice(0, 200),
      isPrivate: c.is_private || false,
    })),
    recentMessages: channelMessages,
    pinnedMessages,
    users,
    files: sharedFiles,
  };
}

async function paginateHubSpot(url: string, accessToken: string, resultsKey: string, maxPages = 10): Promise<any[]> {
  let all: any[] = [];
  let after = "";
  for (let page = 0; page < maxPages; page++) {
    const sep = url.includes("?") ? "&" : "?";
    const pageUrl = after ? `${url}${sep}after=${after}` : url;
    try {
      const res = await fetch(pageUrl, {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });
      if (!res.ok) break;
      const data = await res.json();
      all = all.concat(data[resultsKey] || []);
      after = data.paging?.next?.after || "";
      if (!after) break;
    } catch { break; }
  }
  return all;
}

async function fetchHubSpotData(accessToken: string): Promise<any> {
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  // Fetch contacts, companies, deals in parallel with pagination
  const [contacts, companies, deals, owners] = await Promise.all([
    paginateHubSpot(
      "https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,company,jobtitle,lifecyclestage,hs_lead_status,createdate,lastmodifieddate",
      accessToken, "results"
    ),
    paginateHubSpot(
      "https://api.hubapi.com/crm/v3/objects/companies?limit=100&properties=name,domain,industry,city,state,country,numberofemployees,annualrevenue,phone,description,createdate",
      accessToken, "results"
    ),
    paginateHubSpot(
      "https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,pipeline,closedate,createdate,hs_lastmodifieddate,hubspot_owner_id",
      accessToken, "results"
    ),
    (async () => {
      try {
        const res = await fetch("https://api.hubapi.com/crm/v3/owners/?limit=100", { headers });
        if (res.ok) { const d = await res.json(); return d.results || []; }
      } catch { /* skip */ }
      return [];
    })(),
  ]);

  // Fetch recent emails (engagement)
  let emails: any[] = [];
  try {
    const emailRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/emails?limit=100&properties=hs_email_subject,hs_email_text,hs_email_direction,hs_email_status,hs_timestamp,hs_email_sender_email,hs_email_to_email",
      { headers }
    );
    if (emailRes.ok) {
      const emailData = await emailRes.json();
      emails = emailData.results || [];
    }
  } catch { /* skip */ }

  // Fetch notes
  let notes: any[] = [];
  try {
    const notesRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/notes?limit=100&properties=hs_note_body,hs_timestamp,hubspot_owner_id",
      { headers }
    );
    if (notesRes.ok) {
      const notesData = await notesRes.json();
      notes = notesData.results || [];
    }
  } catch { /* skip */ }

  // Fetch tasks
  let tasks: any[] = [];
  try {
    const tasksRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/tasks?limit=100&properties=hs_task_subject,hs_task_body,hs_task_status,hs_task_priority,hs_timestamp,hs_task_completion_date,hubspot_owner_id",
      { headers }
    );
    if (tasksRes.ok) {
      const tasksData = await tasksRes.json();
      tasks = tasksData.results || [];
    }
  } catch { /* skip */ }

  // Build owner lookup
  const ownerMap: Record<string, string> = {};
  for (const o of owners) {
    ownerMap[o.id] = `${o.firstName || ""} ${o.lastName || ""}`.trim() || o.email || o.id;
  }

  return { contacts, companies, deals, emails, notes, tasks, owners, ownerMap };
}

async function fetchWordPressData(siteUrl: string, basicAuth: string): Promise<any> {
  const headers = { Authorization: `Basic ${basicAuth}` };

  const [postsRes, pagesRes, mediaRes] = await Promise.all([
    fetch(`${siteUrl}/wp-json/wp/v2/posts?per_page=50&_fields=id,title,excerpt,status,date,link`, { headers }),
    fetch(`${siteUrl}/wp-json/wp/v2/pages?per_page=50&_fields=id,title,excerpt,status,date,link`, { headers }),
    fetch(`${siteUrl}/wp-json/wp/v2/media?per_page=30&_fields=id,title,date,mime_type,source_url`, { headers }),
  ]);

  const [posts, pages, media] = await Promise.all([
    postsRes.ok ? postsRes.json() : [],
    pagesRes.ok ? pagesRes.json() : [],
    mediaRes.ok ? mediaRes.json() : [],
  ]);

  return {
    posts: (posts || []).map((p: any) => ({
      title: p.title?.rendered,
      excerpt: p.excerpt?.rendered?.replace(/<[^>]+>/g, ""),
      status: p.status,
      date: p.date,
      link: p.link,
    })),
    pages: (pages || []).map((p: any) => ({
      title: p.title?.rendered,
      excerpt: p.excerpt?.rendered?.replace(/<[^>]+>/g, ""),
      status: p.status,
      date: p.date,
      link: p.link,
    })),
    media: (media || []).map((m: any) => ({
      title: m.title?.rendered,
      mimeType: m.mime_type,
      url: m.source_url,
      date: m.date,
    })),
  };
}

async function updateBucketContext(supabaseAdmin: any, userId: string) {
  try {
    const { data: allData } = await supabaseAdmin
      .from("user_business_data")
      .select("data_type, source, title, content, analyzed_content, metadata, is_analyzed")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    const contextJson = JSON.stringify({
      updated_at: new Date().toISOString(),
      total: allData?.length || 0,
      items: (allData || []).map((item: any) => ({
        data_type: item.data_type,
        source: item.source,
        title: item.title,
        content: item.content?.slice(0, 500) || null,
        analyzed_content: item.analyzed_content?.slice(0, 500) || null,
        is_analyzed: item.is_analyzed,
      })),
    });

    await supabaseAdmin.storage
      .from("business-data")
      .upload(`${userId}/context.json`, new Blob([contextJson], { type: "application/json" }), {
        upsert: true,
        contentType: "application/json",
      });
  } catch (e) {
    console.error("Failed to update bucket context");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider, categories, limits, brandId, workspaceId } = await req.json();

    // WordPress uses credentials stored differently
    if (provider === "wordpress") {
      const { data: tokenRow } = await supabaseAdmin
        .from("user_oauth_tokens")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "wordpress")
        .maybeSingle();

      if (!tokenRow) {
        return new Response(JSON.stringify({ error: "WordPress not connected" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: connRow } = await supabaseAdmin
        .from("user_connections")
        .select("metadata")
        .eq("user_id", user.id)
        .eq("provider", "wordpress")
        .maybeSingle();

      const siteUrl = (connRow?.metadata as any)?.siteUrl;
      if (!siteUrl) {
        return new Response(JSON.stringify({ error: "WordPress site URL not found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const wpData = await fetchWordPressData(siteUrl, tokenRow.access_token);
      const dataItems: any[] = [];

      for (const post of wpData.posts || []) {
        dataItems.push({
          user_id: user.id,
          data_type: "document",
          source: "wordpress",
          title: post.title || "Untitled Post",
          content: post.excerpt?.slice(0, 500) || null,
          metadata: { type: "post", status: post.status, date: post.date, link: post.link },
          is_analyzed: false,
        });
      }

      for (const page of wpData.pages || []) {
        dataItems.push({
          user_id: user.id,
          data_type: "document",
          source: "wordpress",
          title: page.title || "Untitled Page",
          content: page.excerpt?.slice(0, 500) || null,
          metadata: { type: "page", status: page.status, date: page.date, link: page.link },
          is_analyzed: false,
        });
      }

      for (const media of wpData.media || []) {
        dataItems.push({
          user_id: user.id,
          data_type: "document",
          source: "wordpress",
          title: media.title || "Untitled Media",
          content: null,
          metadata: { type: "media", mimeType: media.mimeType, url: media.url, date: media.date },
          is_analyzed: false,
        });
      }

    // Inject brandId and workspaceId into all items
    for (const item of dataItems) {
      if (brandId) {
        item.metadata = { ...item.metadata, brandId };
      }
      if (workspaceId) {
        item.workspace_id = workspaceId;
      }
    }

      if (dataItems.length > 0) {
        if (brandId) {
          await supabaseAdmin.from("user_business_data").delete().eq("user_id", user.id).eq("source", "wordpress").eq("metadata->>brandId", brandId);
        }
        for (let i = 0; i < dataItems.length; i += 50) {
          await supabaseAdmin.from("user_business_data").insert(dataItems.slice(i, i + 50));
        }
      }

      // Update consolidated context in bucket
      await updateBucketContext(supabaseAdmin, user.id);

      return new Response(JSON.stringify({
        success: true,
        provider: "wordpress",
        summary: { posts: wpData.posts?.length || 0, pages: wpData.pages?.length || 0, media: wpData.media?.length || 0 },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accessToken = await getValidToken(supabaseAdmin, user.id, provider);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Not connected or token expired. Please reconnect." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let providerData: any;
    switch (provider) {
      case "microsoft":
        providerData = await fetchMicrosoftData(accessToken, categories, limits);
        break;
      case "google":
        providerData = await fetchGoogleData(accessToken);
        break;
      case "slack":
        providerData = await fetchSlackData(accessToken);
        break;
      case "hubspot":
        providerData = await fetchHubSpotData(accessToken);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unsupported provider: ${provider}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Persist synced data to user_business_data
    const dataItems: any[] = [];

    if (providerData.emails) {
      for (const email of providerData.emails) {
        // Skip emails with no meaningful subject AND no body content
        const hasSubject = email.subject && email.subject.trim() !== "" && email.subject !== "No subject";
        const hasBody = !!(email.body || email.preview || email.snippet);
        if (!hasSubject && !hasBody) continue;
        dataItems.push({
          user_id: user.id,
          data_type: "email",
          source: provider,
          title: (hasSubject ? email.subject : (email.body || email.preview || email.snippet || "").slice(0, 80).trim()) || "Email",
          content: email.body || email.preview || email.snippet || null,
          metadata: { from: email.from, date: email.date },
          is_analyzed: false,
        });
      }
    }

    if (providerData.events) {
      for (const event of providerData.events) {
        const title = event.subject || event.summary;
        if (!title || title.trim() === "") continue;
        dataItems.push({
          user_id: user.id,
          data_type: "calendar",
          source: provider,
          title,
          content: null,
          metadata: { start: event.start, end: event.end, attendees: event.attendees },
          is_analyzed: false,
        });
      }
    }

    if (providerData.files) {
      for (const file of providerData.files) {
        if (!file.name || file.name.trim() === "") continue;
        dataItems.push({
          user_id: user.id,
          data_type: "document",
          source: provider,
          title: file.name,
          content: file.extractedContent || null,
          metadata: { size: file.size, type: file.type || file.mimeType, webUrl: file.webUrl, lastModified: file.lastModified },
          is_analyzed: !!file.extractedContent,
        });
      }
    }

    // Contacts
    if (providerData.contacts) {
      for (const contact of providerData.contacts) {
        dataItems.push({
          user_id: user.id,
          data_type: "contact",
          source: provider,
          title: contact.name || "Unnamed Contact",
          content: [
            contact.company ? `Company: ${contact.company}` : null,
            contact.jobTitle ? `Title: ${contact.jobTitle}` : null,
            contact.department ? `Department: ${contact.department}` : null,
            (contact.emails || []).length ? `Email: ${contact.emails.join(", ")}` : null,
            (contact.phones || []).length ? `Phone: ${contact.phones.join(", ")}` : null,
          ].filter(Boolean).join("\n") || null,
          metadata: { company: contact.company, jobTitle: contact.jobTitle, emails: contact.emails, phones: contact.phones },
          is_analyzed: false,
        });
      }
    }

    // OneNote pages
    if (providerData.notes) {
      for (const note of providerData.notes) {
        dataItems.push({
          user_id: user.id,
          data_type: "document",
          source: provider,
          title: note.title || "Untitled Note",
          content: note.content || null,
          metadata: { type: "onenote", created: note.created, lastModified: note.lastModified },
          is_analyzed: !!note.content,
        });
      }
    }

    // To Do tasks
    if (providerData.tasks) {
      for (const task of providerData.tasks) {
        dataItems.push({
          user_id: user.id,
          data_type: "task",
          source: provider,
          title: task.title || "Untitled Task",
          content: [
            `Status: ${task.status || "unknown"}`,
            task.importance ? `Importance: ${task.importance}` : null,
            task.dueDate ? `Due: ${task.dueDate}` : null,
            task.listName ? `List: ${task.listName}` : null,
            task.body || null,
          ].filter(Boolean).join("\n"),
          metadata: { status: task.status, importance: task.importance, dueDate: task.dueDate, listName: task.listName },
          is_analyzed: false,
        });
      }
    }

    if (providerData.channels) {
      for (const channel of providerData.channels) {
        dataItems.push({
          user_id: user.id,
          data_type: "integration",
          source: provider,
          title: `#${channel.name}`,
          content: channel.topic || null,
          metadata: { memberCount: channel.memberCount },
          is_analyzed: false,
        });
      }
    }

    // Persist Slack messages
    if (providerData.recentMessages) {
      for (const ch of providerData.recentMessages) {
        const messagesText = (ch.messages || [])
          .map((m: any) => `[${m.user || "unknown"}] ${m.text || ""}`)
          .join("\n");
        if (messagesText) {
          dataItems.push({
            user_id: user.id,
            data_type: "message",
            source: provider,
            title: `Slack messages from #${ch.channel}`,
            content: messagesText.slice(0, 10000),
            metadata: { channel: ch.channel, messageCount: ch.messages?.length || 0 },
            is_analyzed: false,
          });
        }
      }
    }

    // Persist Slack pinned messages
    if (providerData.pinnedMessages?.length) {
      for (const pin of providerData.pinnedMessages) {
        dataItems.push({
          user_id: user.id,
          data_type: "message",
          source: provider,
          title: `📌 Pinned in #${pin.channel}`,
          content: pin.text || null,
          metadata: { channel: pin.channel, user: pin.user, ts: pin.ts, pinned: true },
          is_analyzed: false,
        });
      }
    }

    // Persist Slack users
    if (providerData.users?.length) {
      for (const u of providerData.users) {
        dataItems.push({
          user_id: user.id,
          data_type: "contact",
          source: provider,
          title: u.name || u.displayName || "Unknown User",
          content: [
            u.title ? `Title: ${u.title}` : null,
            u.email ? `Email: ${u.email}` : null,
            u.phone ? `Phone: ${u.phone}` : null,
            u.timezone ? `Timezone: ${u.timezone}` : null,
            u.isAdmin ? "Role: Admin" : u.isOwner ? "Role: Owner" : null,
            u.status ? `Status: ${u.status}` : null,
          ].filter(Boolean).join("\n") || null,
          metadata: { slackId: u.id, email: u.email, title: u.title, isAdmin: u.isAdmin, isOwner: u.isOwner },
          is_analyzed: false,
        });
      }
    }

    // Persist Slack shared files
    if (providerData.files?.length) {
      for (const f of providerData.files) {
        dataItems.push({
          user_id: user.id,
          data_type: "document",
          source: provider,
          title: f.title || f.name || "Untitled File",
          content: null,
          metadata: { fileType: f.type, size: f.size, user: f.user, created: f.created, channels: f.channels },
          is_analyzed: false,
        });
      }
    }

    // Persist Slack team info
    if (providerData.team) {
      dataItems.push({
        user_id: user.id,
        data_type: "integration",
        source: provider,
        title: `Slack Workspace: ${providerData.team}`,
        content: [
          `Workspace "${providerData.team}"`,
          providerData.teamDomain ? `Domain: ${providerData.teamDomain}.slack.com` : null,
          `${providerData.channels?.length || 0} channels`,
          `${providerData.users?.length || 0} team members`,
        ].filter(Boolean).join("\n"),
        metadata: { team: providerData.team, domain: providerData.teamDomain, icon: providerData.teamIcon },
        is_analyzed: false,
      });
    }

    // HubSpot contacts
    if (providerData.contacts?.length) {
      for (const c of providerData.contacts) {
        const p = c.properties || {};
        dataItems.push({
          user_id: user.id,
          data_type: "contact",
          source: provider,
          title: `${p.firstname || ""} ${p.lastname || ""}`.trim() || "Unnamed Contact",
          content: [
            p.email ? `Email: ${p.email}` : null,
            p.phone ? `Phone: ${p.phone}` : null,
            p.company ? `Company: ${p.company}` : null,
            p.jobtitle ? `Title: ${p.jobtitle}` : null,
            p.lifecyclestage ? `Stage: ${p.lifecyclestage}` : null,
            p.hs_lead_status ? `Lead Status: ${p.hs_lead_status}` : null,
          ].filter(Boolean).join("\n") || null,
          metadata: { hubspotId: c.id, email: p.email, company: p.company, jobtitle: p.jobtitle, lifecyclestage: p.lifecyclestage, leadStatus: p.hs_lead_status },
          is_analyzed: false,
        });
      }
    }

    // HubSpot companies
    if (providerData.companies?.length) {
      for (const c of providerData.companies) {
        const p = c.properties || {};
        dataItems.push({
          user_id: user.id,
          data_type: "contact",
          source: provider,
          title: p.name || "Unnamed Company",
          content: [
            p.domain ? `Domain: ${p.domain}` : null,
            p.industry ? `Industry: ${p.industry}` : null,
            p.annualrevenue ? `Revenue: $${p.annualrevenue}` : null,
            p.numberofemployees ? `Employees: ${p.numberofemployees}` : null,
            p.city && p.state ? `Location: ${p.city}, ${p.state}` : p.city || p.state || null,
            p.country ? `Country: ${p.country}` : null,
            p.phone ? `Phone: ${p.phone}` : null,
            p.description ? `Description: ${p.description}` : null,
          ].filter(Boolean).join("\n") || null,
          metadata: { hubspotId: c.id, type: "company", domain: p.domain, industry: p.industry, revenue: p.annualrevenue, employees: p.numberofemployees },
          is_analyzed: false,
        });
      }
    }

    // HubSpot deals
    if (providerData.deals?.length) {
      const ownerMap = providerData.ownerMap || {};
      for (const d of providerData.deals) {
        const p = d.properties || {};
        dataItems.push({
          user_id: user.id,
          data_type: "document",
          source: provider,
          title: p.dealname || "Untitled Deal",
          content: [
            p.amount ? `Amount: $${p.amount}` : null,
            p.dealstage ? `Stage: ${p.dealstage}` : null,
            p.pipeline ? `Pipeline: ${p.pipeline}` : null,
            p.closedate ? `Close Date: ${p.closedate}` : null,
            p.hubspot_owner_id ? `Owner: ${ownerMap[p.hubspot_owner_id] || p.hubspot_owner_id}` : null,
          ].filter(Boolean).join("\n") || null,
          metadata: { hubspotId: d.id, type: "deal", amount: p.amount, stage: p.dealstage, pipeline: p.pipeline, closeDate: p.closedate },
          is_analyzed: false,
        });
      }
    }

    // HubSpot emails
    if (providerData.emails?.length) {
      for (const e of providerData.emails) {
        const p = e.properties || {};
        dataItems.push({
          user_id: user.id,
          data_type: "email",
          source: provider,
          title: p.hs_email_subject || "No subject",
          content: (p.hs_email_text || "").slice(0, 5000) || null,
          metadata: { hubspotId: e.id, direction: p.hs_email_direction, status: p.hs_email_status, from: p.hs_email_sender_email, to: p.hs_email_to_email, date: p.hs_timestamp },
          is_analyzed: false,
        });
      }
    }

    // HubSpot notes
    if (providerData.notes?.length) {
      const ownerMap = providerData.ownerMap || {};
      for (const n of providerData.notes) {
        const p = n.properties || {};
        const body = (p.hs_note_body || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        dataItems.push({
          user_id: user.id,
          data_type: "document",
          source: provider,
          title: body.slice(0, 80) || "Note",
          content: body.slice(0, 5000) || null,
          metadata: { hubspotId: n.id, type: "note", date: p.hs_timestamp, owner: ownerMap[p.hubspot_owner_id] || p.hubspot_owner_id || null },
          is_analyzed: false,
        });
      }
    }

    // HubSpot tasks
    if (providerData.tasks?.length) {
      const ownerMap = providerData.ownerMap || {};
      for (const t of providerData.tasks) {
        const p = t.properties || {};
        dataItems.push({
          user_id: user.id,
          data_type: "task",
          source: provider,
          title: p.hs_task_subject || "Untitled Task",
          content: [
            p.hs_task_status ? `Status: ${p.hs_task_status}` : null,
            p.hs_task_priority ? `Priority: ${p.hs_task_priority}` : null,
            p.hs_task_completion_date ? `Completed: ${p.hs_task_completion_date}` : null,
            p.hubspot_owner_id ? `Owner: ${ownerMap[p.hubspot_owner_id] || p.hubspot_owner_id}` : null,
            p.hs_task_body ? p.hs_task_body.replace(/<[^>]+>/g, " ").trim().slice(0, 2000) : null,
          ].filter(Boolean).join("\n") || null,
          metadata: { hubspotId: t.id, status: p.hs_task_status, priority: p.hs_task_priority },
          is_analyzed: false,
        });
      }
    }

    for (const item of dataItems) {
      if (brandId) {
        item.metadata = { ...item.metadata, brandId };
      }
      if (workspaceId) {
        item.workspace_id = workspaceId;
      }
    }

    // Batch insert (clear old data from this provider first, scoped to brand)
    if (dataItems.length > 0) {
      // IMPORTANT: Always scope delete by brandId to avoid wiping data from other businesses.
      // If no brandId is provided, skip delete to preserve existing data.
      if (brandId) {
        await supabaseAdmin
          .from("user_business_data")
          .delete()
          .eq("user_id", user.id)
          .eq("source", provider)
          .eq("metadata->>brandId", brandId);
      }

      // Insert in batches of 50
      for (let i = 0; i < dataItems.length; i += 50) {
        await supabaseAdmin
          .from("user_business_data")
          .insert(dataItems.slice(i, i + 50));
      }
    }

    // Update consolidated context in bucket
    await updateBucketContext(supabaseAdmin, user.id);

    return new Response(JSON.stringify({
      success: true,
      provider,
      summary: {
        emails: providerData.emails?.length || 0,
        events: providerData.events?.length || 0,
        files: providerData.files?.length || 0,
        contacts: providerData.contacts?.length || 0,
        companies: providerData.companies?.length || 0,
        deals: providerData.deals?.length || 0,
        notes: providerData.notes?.length || 0,
        tasks: providerData.tasks?.length || 0,
        channels: providerData.channels?.length || 0,
        messages: providerData.recentMessages?.length || 0,
        pinnedMessages: providerData.pinnedMessages?.length || 0,
        users: providerData.users?.length || 0,
        owners: providerData.owners?.length || 0,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-provider-data error occurred");
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
