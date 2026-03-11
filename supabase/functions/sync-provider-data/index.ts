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
        model: "google/gemini-2.5-flash-lite",
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
        model: "google/gemini-2.5-flash",
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
}

interface SyncCategories {
  emails?: boolean;
  events?: boolean;
  files?: boolean;
}

async function fetchMicrosoftData(accessToken: string, categories?: SyncCategories, limits?: SyncLimits): Promise<any> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const cats = categories || { emails: true, events: true, files: true };
  const lims = limits || { emails: 50, events: 50, files: 50 };

  const fetches: Promise<Response>[] = [];
  const fetchKeys: string[] = [];

  if (cats.emails !== false) {
    const emailLimit = Math.min(Math.max(lims.emails || 50, 1), 200);
    fetches.push(fetch(`https://graph.microsoft.com/v1.0/me/messages?$top=${emailLimit}&$select=subject,from,receivedDateTime,body&$orderby=receivedDateTime desc`, { headers }));
    fetchKeys.push("mail");
  }
  if (cats.events !== false) {
    const eventLimit = Math.min(Math.max(lims.events || 50, 1), 200);
    fetches.push(fetch(`https://graph.microsoft.com/v1.0/me/events?$top=${eventLimit}&$select=subject,start,end,organizer,attendees&$orderby=start/dateTime desc`, { headers }));
    fetchKeys.push("cal");
  }
  if (cats.files !== false) {
    const fileLimit = Math.min(Math.max(lims.files || 50, 1), 200);
    fetches.push(fetch(`https://graph.microsoft.com/v1.0/me/drive/recent?$top=${fileLimit}`, { headers }));
    fetchKeys.push("files");
  }

  const responses = await Promise.all(fetches);
  const results: Record<string, any> = {};
  for (let i = 0; i < fetchKeys.length; i++) {
    results[fetchKeys[i]] = responses[i].ok ? await responses[i].json() : { value: [] };
  }

  const mail = results.mail || { value: [] };
  const calendar = results.cal || { value: [] };
  const files = results.files || { value: [] };

  // Extract full email body text (strip HTML)
  const emails = (mail.value || []).map((m: any) => {
    let bodyText = m.body?.content || "";
    bodyText = bodyText
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);
    return {
      subject: m.subject,
      from: m.from?.emailAddress?.address,
      date: m.receivedDateTime,
      body: bodyText,
    };
  });

  // Try to download text content from files (PDFs, docs, etc.)
  const fileDetails = [];
  const fileLimit = Math.min(Math.max(lims.files || 50, 1), 200);
  for (const f of (files.value || []).slice(0, fileLimit)) {
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

async function fetchSlackData(accessToken: string): Promise<any> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const [channelsRes, teamRes] = await Promise.all([
    fetch("https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=50", { headers }),
    fetch("https://slack.com/api/team.info", { headers }),
  ]);

  const channels = await channelsRes.json();
  const team = await teamRes.json();

  console.log("Slack data fetched, channels:", channels.channels?.length || 0);

  if (!channels.ok) {
    console.error("Slack conversations.list failed");
  }

  // Fetch recent messages from top 5 active channels
  const channelList = (channels.channels || []).slice(0, 5);
  const channelMessages: any[] = [];

  for (const ch of channelList) {
    try {
      const histRes = await fetch(`https://slack.com/api/conversations.history?channel=${ch.id}&limit=10`, { headers });
      if (histRes.ok) {
        const hist = await histRes.json();
        channelMessages.push({
          channel: ch.name,
          messages: (hist.messages || []).map((m: any) => ({
            text: m.text?.slice(0, 200),
            ts: m.ts,
            user: m.user,
          })),
        });
      }
    } catch { /* skip */ }
  }

  return {
    team: team.team?.name || team.name || "Unknown",
    channels: (channels.channels || []).map((c: any) => ({
      name: c.name,
      memberCount: c.num_members,
      topic: c.topic?.value?.slice(0, 100),
    })),
    recentMessages: channelMessages,
  };
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

    const { provider, categories, limits } = await req.json();

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

      if (dataItems.length > 0) {
        await supabaseAdmin.from("user_business_data").delete().eq("user_id", user.id).eq("source", "wordpress");
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
        dataItems.push({
          user_id: user.id,
          data_type: "email",
          source: provider,
          title: email.subject || "No subject",
          content: email.body || email.preview || email.snippet || null,
          metadata: { from: email.from, date: email.date },
          is_analyzed: false,
        });
      }
    }

    if (providerData.events) {
      for (const event of providerData.events) {
        dataItems.push({
          user_id: user.id,
          data_type: "calendar",
          source: provider,
          title: event.subject || event.summary || "No title",
          content: null,
          metadata: { start: event.start, end: event.end, attendees: event.attendees },
          is_analyzed: false,
        });
      }
    }

    if (providerData.files) {
      for (const file of providerData.files) {
        dataItems.push({
          user_id: user.id,
          data_type: "document",
          source: provider,
          title: file.name || "Untitled",
          content: file.extractedContent || null,
          metadata: { size: file.size, type: file.type || file.mimeType, webUrl: file.webUrl, lastModified: file.lastModified },
          is_analyzed: !!file.extractedContent,
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

    // Persist Slack team info
    if (providerData.team) {
      dataItems.push({
        user_id: user.id,
        data_type: "integration",
        source: provider,
        title: `Slack Workspace: ${providerData.team}`,
        content: `Workspace "${providerData.team}" with ${providerData.channels?.length || 0} channels`,
        metadata: { team: providerData.team },
        is_analyzed: false,
      });
    }

    // Batch insert (clear old data from this provider first)
    if (dataItems.length > 0) {
      await supabaseAdmin
        .from("user_business_data")
        .delete()
        .eq("user_id", user.id)
        .eq("source", provider);

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
        channels: providerData.channels?.length || 0,
        messages: providerData.recentMessages?.length || 0,
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
