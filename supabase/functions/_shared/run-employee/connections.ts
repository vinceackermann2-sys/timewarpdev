// --- Live Connection Search ---

const STOPWORDS = new Set(["this","that","with","from","have","been","were","they","their","what","about","which","when","where","will","would","could","should","there","these","those","some","other","into","more","also","than","then","just","only","very","much","such","like","over","after","before","between","under","each","every","both","most","same","does","doing","done","make","made","know","think","want","need","help","find","give","tell","show","look","come","back","take","well","still","even","here","many","while"]);

export { STOPWORDS };

export async function refreshMicrosoftToken(refreshToken: string): Promise<any> {
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

export async function getValidProviderToken(supabaseAdmin: any, userId: string, provider: string): Promise<string | null> {
  const { data: tokenRow } = await supabaseAdmin
    .from("user_oauth_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (!tokenRow) return null;

  const expiresAt = tokenRow.token_expires_at ? new Date(tokenRow.token_expires_at) : null;
  const isExpired = expiresAt && expiresAt < new Date(Date.now() + 60000);

  if (!isExpired) return tokenRow.access_token;
  if (!tokenRow.refresh_token) return null;

  if (provider === "microsoft") {
    const refreshed = await refreshMicrosoftToken(tokenRow.refresh_token);
    if (refreshed.access_token) {
      await supabaseAdmin.from("user_oauth_tokens").update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || tokenRow.refresh_token,
        token_expires_at: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : tokenRow.token_expires_at,
      }).eq("user_id", userId).eq("provider", provider);
      return refreshed.access_token;
    }
  }

  if (provider === "slack") return tokenRow.access_token;

  return null;
}

export async function searchMicrosoftData(token: string, query: string): Promise<{ emails: string[]; files: string[] }> {
  const results = { emails: [] as string[], files: [] as string[] };
  const keywords = query.split(/\s+/).filter(w => w.length > 2).slice(0, 5).join(" ");
  if (!keywords) return results;

  try {
    const emailRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$search="${encodeURIComponent(keywords)}"&$top=5&$select=subject,bodyPreview,from,receivedDateTime`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (emailRes.ok) {
      const data = await emailRes.json();
      for (const msg of (data.value || [])) {
        if (msg.subject || msg.bodyPreview) {
          results.emails.push(`📧 **${msg.subject || "No subject"}** (from: ${msg.from?.emailAddress?.address || "unknown"}, ${msg.receivedDateTime?.slice(0, 10) || ""})\n${(msg.bodyPreview || "").slice(0, 300)}`);
        }
      }
    }
  } catch (e) {
    console.error("Microsoft email search error:", e);
  }

  try {
    const fileRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(keywords)}')?$top=5&$select=name,webUrl,lastModifiedDateTime,size`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (fileRes.ok) {
      const data = await fileRes.json();
      for (const file of (data.value || [])) {
        results.files.push(`📄 **${file.name}** (modified: ${file.lastModifiedDateTime?.slice(0, 10) || ""}) — [link](${file.webUrl || ""})`);
      }
    }
  } catch (e) {
    console.error("Microsoft file search error:", e);
  }

  return results;
}

export async function searchSlackData(token: string, query: string): Promise<string[]> {
  const results: string[] = [];
  const keywords = query.split(/\s+/).filter(w => w.length > 2).slice(0, 5).join(" ");
  if (!keywords) return results;

  try {
    const res = await fetch(
      `https://slack.com/api/search.messages?query=${encodeURIComponent(keywords)}&count=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.messages?.matches) {
        for (const match of data.messages.matches.slice(0, 5)) {
          const channel = match.channel?.name || "unknown";
          const user = match.username || "unknown";
          const text = (match.text || "").slice(0, 300);
          const ts = match.ts ? new Date(parseFloat(match.ts) * 1000).toISOString().slice(0, 10) : "";
          results.push(`💬 **#${channel}** (${user}, ${ts}): ${text}`);
        }
      }
    }
  } catch (e) {
    console.error("Slack search error:", e);
  }

  return results;
}

// --- Intent Analysis ---
const CONNECTION_TRIGGER_PATTERNS = [
  /\b(collab\w*|collaboration\w*|partnership\w*|partner\w*|meeting\w*|follow.?up|agenda)\b/i,
  /\b(complaint|issue|ticket|support|bug|problem|incident)\b/i,
  /\b(email|mail|inbox|message|slack|teams|chat|dm|thread)\b/i,
  /\b(file|document|doc|sheet|drive|onedrive|sharepoint)\b/i,
  /\b(calendar|schedule|event|appointment|invite)\b/i,
  /\b(customer|client)\s+(said|wrote|asked|mentioned|replied|responded)\b/i,
  /\b(recent|latest|new|incoming|pending|unread)\b/i,
  /\b(check|search|find|look\s+up|pull)\s+(my|our|the)\s+(email|slack|message|file|drive)\b/i,
  /\b(what|any)\b.{0,30}\b(coming\s+up|scheduled|planned|pending)\b/i,
];

export function shouldSearchConnections(query: string): { shouldSearch: boolean; reason: string } {
  if (!query || query.length < 3) return { shouldSearch: false, reason: "Query too short" };
  const q = query.toLowerCase();
  for (const pattern of CONNECTION_TRIGGER_PATTERNS) {
    if (pattern.test(q)) {
      return { shouldSearch: true, reason: "Your request points to live communications, files, or connected work activity" };
    }
  }
  return { shouldSearch: false, reason: "This looks like a strategy or knowledge question that can be answered from existing business context" };
}

export function extractQueryTopic(query: string): string {
  if (!query || query.length < 3) return "your request";
  const q = query.toLowerCase().trim();
  const topicPatterns: [RegExp, string][] = [
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
  if (provider === "microsoft") return `Searching Microsoft 365 emails & files${suffix}`;
  if (provider === "slack") return `Searching Slack messages & channels${suffix}`;
  if (provider === "hubspot") return `Searching HubSpot records${suffix}`;
  return `Searching ${provider}${suffix}`;
}

export function getProviderSkipLabel(provider: string, reason: string): string {
  if (provider === "microsoft") return `Skipped Microsoft — ${reason}`;
  if (provider === "slack") return `Skipped Slack — ${reason}`;
  if (provider === "hubspot") return `Skipped HubSpot — ${reason}`;
  return `Skipped ${provider} — ${reason}`;
}

export interface SkippedProviderDetail {
  provider: string;
  reason: string;
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

  const decision = shouldSearchConnections(userQuery);
  console.log("[connections] Intent decision:", JSON.stringify(decision), "query:", userQuery?.slice(0, 80));

  if (!decision.shouldSearch) {
    emitProgress?.({
      label: `Skipping connected sources for ${t} — ${decision.reason}`,
      status: "done",
      action: "connections",
    });
    return { connectionContext, searchedProviders, skippedProviders, skippedProviderDetails, connectionDecision: decision, queryTopic: t };
  }

  emitProgress?.({ label: `Checking connected sources for ${t}`, status: "done", action: "connections" });

  const { data: connections, error: connErr } = await supabase
    .from("user_connections")
    .select("provider, status")
    .eq("user_id", userId)
    .eq("status", "connected");

  if (connErr) console.error("[connections] DB error:", connErr.message);
  console.log("[connections] Connected providers:", JSON.stringify(connections));

  if (!connections || connections.length === 0) {
    console.log("[connections] No connected providers found");
    for (const provider of ["microsoft", "slack", "hubspot"]) {
      skippedProviders.push(provider);
      skippedProviderDetails.push({ provider, reason: "not connected" });
    }
    emitProgress?.({ label: `No connected sources available for ${t}`, status: "done", action: "connections", detail: "No integrations are currently connected" });
    return { connectionContext, searchedProviders, skippedProviders, skippedProviderDetails, connectionDecision: decision, queryTopic: t };
  }

  const connectedProviders = connections.map((c: any) => c.provider);
  const searchPromises: Promise<void>[] = [];

  const allKnownProviders = ["microsoft", "slack", "hubspot"];
  for (const p of allKnownProviders) {
    if (!connectedProviders.includes(p)) {
      skippedProviders.push(p);
      skippedProviderDetails.push({ provider: p, reason: "not connected" });
      if (p === "microsoft" || p === "slack") {
        emitProgress?.({ label: getProviderSkipLabel(p, "not connected"), status: "done", action: "connections" });
      }
    }
  }

  if (connectedProviders.includes("microsoft")) {
    searchPromises.push((async () => {
      try {
        const token = await getValidProviderToken(supabase, userId, "microsoft");
        if (!token) {
          skippedProviders.push("microsoft");
          skippedProviderDetails.push({ provider: "microsoft", reason: "token expired or missing" });
          emitProgress?.({ label: getProviderSkipLabel("microsoft", "token expired"), status: "done", action: "connections" });
          return;
        }
        emitProgress?.({ label: getProviderSearchLabel("microsoft", t), status: "running", action: "connections" });
        searchedProviders.push("microsoft");
        console.log("[connections] Searching Microsoft with query:", userQuery.slice(0, 60));
        const results = await searchMicrosoftData(token, userQuery);
        console.log("[connections] Microsoft results: emails=", results.emails.length, "files=", results.files.length);
        if (results.emails.length > 0 || results.files.length > 0) {
          connectionContext += `\n\n## Live Data from Microsoft 365\n`;
          if (results.emails.length > 0) connectionContext += `### Recent Emails\n${results.emails.join("\n\n")}\n`;
          if (results.files.length > 0) connectionContext += `### Recent Files\n${results.files.join("\n\n")}\n`;
        }
        emitProgress?.({ label: getProviderSearchLabel("microsoft", t), status: "done", action: "connections" });
      } catch (e) {
        console.error("[connections] Microsoft search failed:", e);
        emitProgress?.({ label: getProviderSearchLabel("microsoft", t), status: "error", action: "connections" });
      }
    })());
  }

  if (connectedProviders.includes("slack")) {
    searchPromises.push((async () => {
      try {
        const token = await getValidProviderToken(supabase, userId, "slack");
        if (!token) {
          skippedProviders.push("slack");
          skippedProviderDetails.push({ provider: "slack", reason: "token expired or missing" });
          emitProgress?.({ label: getProviderSkipLabel("slack", "token expired"), status: "done", action: "connections" });
          return;
        }
        emitProgress?.({ label: getProviderSearchLabel("slack", t), status: "running", action: "connections" });
        searchedProviders.push("slack");
        console.log("[connections] Searching Slack with query:", userQuery.slice(0, 60));
        const results = await searchSlackData(token, userQuery);
        console.log("[connections] Slack results:", results.length);
        if (results.length > 0) {
          connectionContext += `\n\n## Live Data from Slack\n${results.join("\n\n")}\n`;
        }
        emitProgress?.({ label: getProviderSearchLabel("slack", t), status: "done", action: "connections" });
      } catch (e) {
        console.error("[connections] Slack search failed:", e);
        emitProgress?.({ label: getProviderSearchLabel("slack", t), status: "error", action: "connections" });
      }
    })());
  }

  await Promise.all(searchPromises);

  if (connectionContext) {
    connectionContext = `\n\n## Connected Sources (Live Search Results)\nThe following data was retrieved in real-time from the user's connected integrations. Use it to provide more informed answers when relevant.\n${connectionContext}`;
  }

  console.log("[connections] Final searchedProviders:", searchedProviders, "skipped:", skippedProviders, "hasContext:", connectionContext.length > 0);
  return { connectionContext, searchedProviders, skippedProviders, skippedProviderDetails, connectionDecision: decision, queryTopic: t };
}
