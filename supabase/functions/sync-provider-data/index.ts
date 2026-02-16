import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

async function fetchMicrosoftData(accessToken: string): Promise<any> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const [mailRes, calRes, filesRes] = await Promise.all([
    fetch("https://graph.microsoft.com/v1.0/me/messages?$top=30&$select=subject,from,receivedDateTime,body&$orderby=receivedDateTime desc", { headers }),
    fetch("https://graph.microsoft.com/v1.0/me/events?$top=30&$select=subject,start,end,organizer,attendees&$orderby=start/dateTime desc", { headers }),
    fetch("https://graph.microsoft.com/v1.0/me/drive/recent?$top=20", { headers }),
  ]);

  const [mail, calendar, files] = await Promise.all([
    mailRes.ok ? mailRes.json() : { value: [] },
    calRes.ok ? calRes.json() : { value: [] },
    filesRes.ok ? filesRes.json() : { value: [] },
  ]);

  // Extract full email body text (strip HTML)
  const emails = (mail.value || []).map((m: any) => {
    let bodyText = m.body?.content || "";
    // Strip HTML tags to get plain text
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
  for (const f of (files.value || []).slice(0, 20)) {
    const fileInfo: any = {
      name: f.name,
      size: f.size,
      lastModified: f.lastModifiedDateTime,
      webUrl: f.webUrl,
      mimeType: f["file"]?.mimeType || "",
    };

    // Try to get file content for text-extractable types
    const mime = fileInfo.mimeType || "";
    const name = (f.name || "").toLowerCase();
    if (name.endsWith(".txt") || name.endsWith(".csv") || mime.includes("text/")) {
      try {
        const contentRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${f.id}/content`, { headers });
        if (contentRes.ok) {
          fileInfo.extractedContent = (await contentRes.text()).slice(0, 10000);
        }
      } catch { /* skip */ }
    }

    fileDetails.push(fileInfo);
  }

  return {
    emails,
    events: (calendar.value || []).map((e: any) => ({
      subject: e.subject,
      start: e.start?.dateTime,
      end: e.end?.dateTime,
      organizer: e.organizer?.emailAddress?.address,
      attendees: e.attendees?.length || 0,
    })),
    files: fileDetails,
  };
}

async function fetchGoogleData(accessToken: string): Promise<any> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const [mailRes, calRes, driveRes] = await Promise.all([
    fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=30", { headers }),
    fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=30&orderBy=startTime&singleEvents=true&timeMin=" + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), { headers }),
    fetch("https://www.googleapis.com/drive/v3/files?pageSize=20&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink)", { headers }),
  ]);

  const [mailList, calendar, drive] = await Promise.all([
    mailRes.ok ? mailRes.json() : { messages: [] },
    calRes.ok ? calRes.json() : { items: [] },
    driveRes.ok ? driveRes.json() : { files: [] },
  ]);

  // Fetch full email body for top 20
  const emailDetails = [];
  const messageIds = (mailList.messages || []).slice(0, 20);
  for (const msg of messageIds) {
    try {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers }
      );
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const getHeader = (name: string) => detail.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;
        
        // Extract body text from parts
        let bodyText = "";
        const extractText = (part: any) => {
          if (part.mimeType === "text/plain" && part.body?.data) {
            bodyText += atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
          } else if (part.parts) {
            for (const p of part.parts) extractText(p);
          }
        };
        
        if (detail.payload) extractText(detail.payload);
        
        // Fallback to snippet if no body extracted
        if (!bodyText && detail.snippet) bodyText = detail.snippet;
        
        emailDetails.push({
          subject: getHeader("Subject"),
          from: getHeader("From"),
          date: getHeader("Date"),
          body: bodyText.slice(0, 5000),
        });
      }
    } catch { /* skip */ }
  }

  // Fetch content from Google Drive files where possible
  const fileDetails = [];
  for (const f of (drive.files || []).slice(0, 20)) {
    const fileInfo: any = {
      name: f.name,
      type: f.mimeType,
      lastModified: f.modifiedTime,
      webUrl: f.webViewLink,
    };

    // Export Google Docs/Sheets/Slides as plain text
    if (f.mimeType === "application/vnd.google-apps.document") {
      try {
        const exportRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=text/plain`,
          { headers }
        );
        if (exportRes.ok) {
          fileInfo.extractedContent = (await exportRes.text()).slice(0, 10000);
        }
      } catch { /* skip */ }
    } else if (f.mimeType === "application/vnd.google-apps.spreadsheet") {
      try {
        const exportRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=text/csv`,
          { headers }
        );
        if (exportRes.ok) {
          fileInfo.extractedContent = (await exportRes.text()).slice(0, 10000);
        }
      } catch { /* skip */ }
    } else if (f.mimeType === "text/plain" || f.mimeType === "text/csv") {
      try {
        const dlRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
          { headers }
        );
        if (dlRes.ok) {
          fileInfo.extractedContent = (await dlRes.text()).slice(0, 10000);
        }
      } catch { /* skip */ }
    }

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

  const [channels, team] = await Promise.all([
    channelsRes.ok ? channelsRes.json() : { channels: [] },
    teamRes.ok ? teamRes.json() : { team: {} },
  ]);

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
    team: team.team?.name || "Unknown",
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
    console.error("Failed to update bucket context:", e);
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

    const { provider } = await req.json();

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
        providerData = await fetchMicrosoftData(accessToken);
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
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-provider-data error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
