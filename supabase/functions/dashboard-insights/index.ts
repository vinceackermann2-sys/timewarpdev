import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

import {
  getValidProviderToken,
} from "../_shared/run-employee/connections.ts";
import {
  buildBusinessBrainContext,
  logBusinessLearningEvent,
} from "../_shared/run-employee/business-brain.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function tryParseJson(value: unknown): any | null {
  if (typeof value !== "string") return value && typeof value === "object" ? value : null;
  try { return JSON.parse(value); } catch { return null; }
}

type NormalizedEvidence = {
  sourceType: string;
  timestamp: string;
  actor: string;
  objectName: string;
  rawUrgency: number;
  revenuePotential: number;
  customerImpact: number;
  ownerRequired: number;
  dnaAudienceFit: number;
  dnaOfferFit: number;
  dnaChannelFit: number;
  objectiveFit: number;
  learningWeight: number;
  detail: string;
};

function clampScore(n: number): number {
  return Math.max(1, Math.min(5, Number.isFinite(n) ? n : 3));
}

function buildWeightLookup(weights: any | null): Record<string, number> {
  if (!weights || typeof weights !== "object") return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(weights)) {
    const num = Number(value);
    if (Number.isFinite(num)) out[key] = num;
  }
  return out;
}

function parseLearningStateRow(row: any) {
  return {
    sourceWeights: buildWeightLookup(row?.source_weights),
    categoryWeights: buildWeightLookup(row?.category_weights),
    tabWeights: buildWeightLookup(row?.tab_weights),
    themeWeights: buildWeightLookup(row?.theme_weights),
  };
}

function scoreEvidence(detail: string, source: string, learningState: ReturnType<typeof parseLearningStateRow>): number {
  const lower = detail.toLowerCase();
  let score = 0;
  if (/\burgent|asap|today|overdue|waiting|blocked\b/.test(lower)) score += 1.3;
  if (/\$\s?\d+|\bdeal\b|\brevenue\b|\bpipeline\b/.test(lower)) score += 1.1;
  if (/\bcustomer|client|account|proposal|renewal\b/.test(lower)) score += 0.8;
  score += learningState.sourceWeights[source] || 0;
  return clampScore(1 + score);
}

function extractHeadline(detail: string): string {
  const cleaned = detail.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Signal detected";
  return cleaned.slice(0, 110);
}

function ensureCardFields(card: any, tabKey: string): any {
  const updated = { ...card };
  if (!updated.whyThisMattersForThisBusiness) {
    updated.whyThisMattersForThisBusiness = "This directly affects your business priorities, target audience, and current operating goals.";
  }
  if (tabKey === "To-Dos" && !updated.expectedOutcome) {
    updated.expectedOutcome = "Improved execution velocity and clearer KPI movement.";
  }
  if (tabKey === "Objectives" && !updated.dnaDrivers) {
    updated.dnaDrivers = ["brand", "audience", "growth"];
  }
  return updated;
}

function validateDashboardPayload(payload: any): { valid: boolean; reason?: string } {
  if (!payload || typeof payload !== "object") return { valid: false, reason: "Top-level payload is not an object." };
  const requiredTop = ["Briefing", "Updates", "To-Dos", "Objectives"];
  for (const key of requiredTop) {
    if (!Array.isArray(payload[key])) return { valid: false, reason: `Missing or invalid array: ${key}` };
  }
  for (const key of requiredTop) {
    for (const card of payload[key]) {
      if (!card?.id || !card?.title || !card?.priority) return { valid: false, reason: `Card in ${key} missing id/title/priority.` };
      if (!card?.metadata || typeof card.metadata !== "object") return { valid: false, reason: `Card ${card.id} in ${key} missing metadata.` };
    }
  }
  return { valid: true };
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

    let brandRow = items.find((item: any) => item.id === brandId);
    if (!brandRow) {
      brandRow = items.find((item: any) => {
        if (item.data_type !== "brand") return false;
        const c = tryParseJson(item.content);
        return c?.id === brandId;
      });
    }
    const brandContent = tryParseJson(brandRow?.content);
    const brandName = brandContent?.name || brandRow?.title || "Business";
    const resolvedBrandRowId = brandRow?.id || brandId;
    const { businessId, profileContext, learningContext } = await buildBusinessBrainContext(supabase, {
      userId: user.id,
      brandId: resolvedBrandRowId,
      workspaceId,
    });
    const { data: learningStateRow } = await supabase
      .from("business_learning_state")
      .select("source_weights, category_weights, tab_weights, theme_weights")
      .eq("business_id", businessId || resolvedBrandRowId)
      .maybeSingle();
    const learningState = parseLearningStateRow(learningStateRow);
    const normalizedEvidence: NormalizedEvidence[] = [];

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

    if (connectedProviders.includes("stripe")) {
      searchPromises.push((async () => {
        try {
          const stripeToken = await getValidProviderToken(supabase, user.id, "stripe");
          if (!stripeToken) return;
          const stripeHeaders = { Authorization: `Bearer ${stripeToken}` };
          const sinceTs = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

          // Recent charges (last 30d, up to 100)
          const chargesRes = await fetch(
            `https://api.stripe.com/v1/charges?limit=100&created[gte]=${sinceTs}`,
            { headers: stripeHeaders }
          );
          if (chargesRes.ok) {
            const data = await chargesRes.json();
            const charges = (data.data || []).slice(0, 50).map((c: any) => {
              const amount = ((c.amount || 0) / 100).toFixed(2);
              const date = c.created ? new Date(c.created * 1000).toISOString().slice(0, 10) : "";
              const status = c.status || "unknown";
              const customer = c.billing_details?.email || c.receipt_email || "anon";
              const desc = c.description || "";
              return `- 💳 ${amount} ${(c.currency || "usd").toUpperCase()} from ${customer} — ${status} on ${date}${desc ? ` (${desc})` : ""}`;
            });
            const totalRevenue = (data.data || [])
              .filter((c: any) => c.status === "succeeded")
              .reduce((sum: number, c: any) => sum + (c.amount || 0), 0) / 100;
            if (charges.length > 0) {
              integrationData += `\n### Stripe Charges (last 30d, ${charges.length} shown, succeeded total: ${totalRevenue.toFixed(2)})\n${charges.join("\n")}\n`;
            }
          }

          // Active subscriptions (up to 100)
          const subsRes = await fetch(
            `https://api.stripe.com/v1/subscriptions?limit=100&status=active`,
            { headers: stripeHeaders }
          );
          if (subsRes.ok) {
            const data = await subsRes.json();
            let mrrCents = 0;
            const subs = (data.data || []).slice(0, 50).map((s: any) => {
              const item = s.items?.data?.[0];
              const unit = item?.price?.unit_amount || 0;
              const qty = item?.quantity || 1;
              const interval = item?.price?.recurring?.interval || "month";
              const monthlyMultiplier = interval === "year" ? 1 / 12 : interval === "week" ? 4.33 : interval === "day" ? 30 : 1;
              mrrCents += unit * qty * monthlyMultiplier;
              const amount = ((unit * qty) / 100).toFixed(2);
              const cust = s.customer || "unknown";
              return `- 🔁 ${amount} ${(item?.price?.currency || "usd").toUpperCase()}/${interval} — customer ${cust} — status ${s.status}`;
            });
            if (subs.length > 0) {
              integrationData += `\n### Stripe Active Subscriptions (${subs.length}, est. MRR: ${(mrrCents / 100).toFixed(2)})\n${subs.join("\n")}\n`;
            }
          }

          // Recent customers (last 30d, up to 50)
          const custRes = await fetch(
            `https://api.stripe.com/v1/customers?limit=50&created[gte]=${sinceTs}`,
            { headers: stripeHeaders }
          );
          if (custRes.ok) {
            const data = await custRes.json();
            const customers = (data.data || []).slice(0, 30).map((c: any) => {
              const date = c.created ? new Date(c.created * 1000).toISOString().slice(0, 10) : "";
              return `- 👤 ${c.name || c.email || c.id} (${c.email || "no email"}) — joined ${date}`;
            });
            if (customers.length > 0) {
              integrationData += `\n### Stripe New Customers (last 30d, ${customers.length})\n${customers.join("\n")}\n`;
            }
          }
        } catch (e) { console.error("Stripe search error:", e); }
      })());
    }

    // Google sub-services — IMPORTANT: each sub-provider has its OWN scope-limited token.
    // Calling Gmail API with the Calendar token (or vice versa) returns 403. So we must
    // resolve the token for the SPECIFIC sub-provider that owns the API being called,
    // and only fall back to the umbrella "google" token if the specific one is missing.
    const getGoogleScopedToken = async (specific: string): Promise<string | null> => {
      const candidates = connectedProviders.includes(specific)
        ? [specific, "google"]
        : ["google"];
      for (const p of candidates) {
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
          const gToken = await getGoogleScopedToken("google_gmail");
          if (!gToken) { console.log("[dashboard-insights] Gmail: no token resolved"); return; }
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
          const gToken = await getGoogleScopedToken("google_calendar");
          if (!gToken) { console.log("[dashboard-insights] GCal: no token resolved"); return; }
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
          const gToken = await getGoogleScopedToken("google_drive");
          if (!gToken) { console.log("[dashboard-insights] Drive: no token resolved"); return; }
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

    // 4b. Normalize evidence lines for ranking context
    const evidenceLines = integrationData
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => /^(📧|💬|📅|📄|📊|📽️|📝|- )/.test(line));
    for (const line of evidenceLines.slice(0, 240)) {
      const sourceType = line.includes("📧") ? "email"
        : line.includes("💬") ? "message"
        : line.includes("📅") ? "meeting"
        : line.includes("📄") || line.includes("📊") || line.includes("📽️") ? "file"
        : line.includes("📝") ? "note"
        : "signal";
      const learningWeight = scoreEvidence(line, sourceType, learningState);
      normalizedEvidence.push({
        sourceType,
        timestamp: new Date().toISOString(),
        actor: sourceType === "email" ? "external_sender" : "integration_actor",
        objectName: extractHeadline(line),
        rawUrgency: learningWeight,
        revenuePotential: /\$\s?\d+|deal|pipeline|revenue/i.test(line) ? 4 : 2,
        customerImpact: /\bcustomer|client|account|proposal|meeting/i.test(line) ? 4 : 2,
        ownerRequired: /\bwaiting|reply|follow.?up|decision|overdue\b/i.test(line) ? 4 : 2,
        dnaAudienceFit: /audience|customer|icp|buyer/i.test(line) ? 4 : 3,
        dnaOfferFit: /offer|plan|pricing|proposal|product/i.test(line) ? 4 : 3,
        dnaChannelFit: /slack|gmail|outlook|calendar|drive|zoom|teams|stripe/i.test(line) ? 4 : 3,
        objectiveFit: /target|kpi|goal|revenue|growth|pipeline/i.test(line) ? 4 : 3,
        learningWeight,
        detail: line,
      });
    }

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
## Business Operating Profile (Canonical)
${profileContext || "No operating profile available."}

## Learning Signals (Personalized Memory)
${learningContext || "No learning signals available yet."}

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

## Normalized Evidence
${normalizedEvidence.length > 0
  ? normalizedEvidence.slice(0, 120).map((e) =>
      `- [${e.sourceType}] ${e.objectName} | urgency:${e.rawUrgency} revenue:${e.revenuePotential} owner:${e.ownerRequired} objectiveFit:${e.objectiveFit} learning:${e.learningWeight}`
    ).join("\n")
  : "No normalized evidence available."}
`;

    // 6. Load previous snapshot for the Delta Layer
    const { data: prevSnapshotRow } = await supabase
      .from("dashboard_snapshots")
      .select("cards")
      .eq("user_id", user.id)
      .eq("brand_id", resolvedBrandRowId)
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

## ALIGNMENT LAYER (Full 9-Pillar Business DNA + Connections)
Use ALL of these sections as the ALIGNMENT LAYER: Business Overview, Products, Target Audiences, **Extended Business DNA (Market, Financial, Operations, People, Growth, Strategy)**, AI Employees, and connected Integrations. Every insight must be contextualized against this business's identity, goals, products, audiences, market position, financials, ops, team, growth motion, and strategy. When the Extended DNA defines an OKR, KPI, target, milestone, or risk, you MUST surface it as an Objective (with momentumIndicator) when there is real signal in Live Integration Data. DNA is for tone/context/alignment — never as a source of fabricated facts.

You are operating in CEO cockpit mode. Prefer strategic clarity and executive actionability over noisy activity summaries.

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
- "source": one of "hubspot", "slack", "outlook", "gmail", "google_calendar", "google_drive", "google_docs", "google_sheets", "google_slides", "onedrive", "onenote", "zoom", "teams", "stripe". Only use "business-dna" for pure DNA-gap cards.
- "icon": one of "building", "trending-up", "users", "plug", "mail", "shopping-bag", "palette", "bot", "target", "lightbulb", "alert", "refresh-cw", "award", "image"
- "timeAgo": accurate relative time string ("12 minutes ago" / "3 hours ago" / "2 days ago" / "Apr 8, 2026")
- "timestamp": ISO 8601 of the original source event
- "actionSuggestion": specific next step (verb + tool/location, completable in <15 min)
- "metadata": source-specific context. **CRITICAL for emails (outlook/gmail)**: when integration data contains "SUBJECT: ..." and "BODY: ...", you MUST copy them VERBATIM into metadata.subject and metadata.bodyPreview — never paraphrase or summarize. Other fields: senderName/senderEmail (from FROM), receivedAt (from DATE) for outlook/gmail; scheduledDate/duration/attendees for zoom/calendar; contactName/dealValue/stage for hubspot; channel/author/messageText (verbatim) for slack/teams; fileName/sharedBy for onedrive/drive; notebook for onenote; amount/currency/customerEmail/status for stripe charges; mrr/interval/customerId for stripe subscriptions.

## CARD SCHEMA — TAB-SPECIFIC FIELDS
- **Briefing**: "signalType" (Metric Shift | Competitive Move | Pipeline Change | Team Activity | Integration Digest | DNA Update | Opportunity Detected | Risk Surfaced)
- **Updates**: "waitingParty" (real person/entity), "requestType" (Reply Needed | Decision Required | Document Review | Meeting Prep | Follow-Up Overdue | Deal Action | Task Completion), "waitDuration" (from real timestamp), "consequence" (the cost — already surfaced in headline)
- **To-Dos**: "taskType", "howTo" (≥2 numbered steps), "estimatedDuration" ("⚡ Quick" | "⏱ Medium" | "🟠 Deep Work"), "leverageScore" (1–5, hidden), "leverageLabel" (rendered from score — always populate)
- **Objectives**: "objectiveType", "successMetric" { current, target, gap, source } — REAL data only, "progress" (0–100), "timeHorizon" ("This Sprint" | "This Month" | "This Quarter" | "This Half"), "relatedTodoIds" (linked To-Do ids — populate when possible), "momentumIndicator" (mandatory when metric is quantifiable)

## BUSINESS BRAIN FIELDS (MANDATORY ON EVERY CARD)
- "whyThisMattersForThisBusiness": one sentence on why this specific business should care right now
- For To-Dos add "expectedOutcome": one sentence outcome
- For Objectives add "dnaDrivers": array of relevant pillars (e.g. ["audience","growth","financial"])

Sort cards within each tab by priority (High first). **Empty tabs are correct when no data supports them. NEVER fabricate.**
Return ONLY a valid JSON object, no markdown fences.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Helper: fetch with timeout to prevent the function from hitting the 150s edge idle limit.
    const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    };

    const aiResponse = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
    }, 140_000);

    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => "");
      console.error("AI gateway error:", aiResponse.status, errText.slice(0, 200));
      const err: any = new Error(
        aiResponse.status === 402
          ? "Your Lovable AI workspace is out of credits. Add funds in Settings → Workspace → Usage."
          : aiResponse.status === 429
            ? "AI rate limit reached. Please try again in a moment."
            : `AI service error: ${aiResponse.status}`,
      );
      err.status = aiResponse.status;
      throw err;
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

    const initialValidation = validateDashboardPayload(parsed);
    if (!initialValidation.valid) {
      const repairPrompt = `Repair this dashboard JSON so it follows schema exactly. Error: ${initialValidation.reason}. Return only JSON object with Briefing, Updates, To-Dos, Objectives, openingSummary, healthScore.`;
      const repairResponse = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You repair malformed dashboard JSON outputs. Output only JSON." },
            { role: "user", content: `${repairPrompt}\n\nInvalid JSON:\n${rawContent}` },
          ],
          stream: false,
        }),
      }, 30_000);
      if (repairResponse.ok) {
        const repairData = await repairResponse.json();
        const repairContent = repairData?.choices?.[0]?.message?.content || "{}";
        try {
          const jsonMatch = repairContent.match(/\{[\s\S]*\}/);
          const repaired = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
          if (validateDashboardPayload(repaired).valid) parsed = repaired;
        } catch {
          // keep original parsed
        }
      }
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
        const enriched = ensureCardFields(tabKey === "To-Dos" ? backfillLeverage(c) : c, tabKey);
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
    let strategicSuggestions = Array.isArray(parsed.Suggestions)
      ? parsed.Suggestions.slice(0, 3)
      : [];
    if (strategicSuggestions.length === 0) {
      const topTodo = Array.isArray(parsed["To-Dos"]) ? parsed["To-Dos"][0] : null;
      const topObjective = Array.isArray(parsed["Objectives"]) ? parsed["Objectives"][0] : null;
      const fallback: any[] = [];
      if (topTodo?.title) {
        fallback.push({
          id: `suggestion-todo-${String(topTodo.id || "top").slice(0, 24)}`,
          title: `Execute: ${topTodo.title}`,
          rationale: topTodo.whyThisMattersForThisBusiness || "High leverage action from live integration signals.",
          expectedImpact: topTodo.expectedOutcome || "Near-term execution and momentum improvement.",
          confidence: "medium",
        });
      }
      if (topObjective?.title) {
        fallback.push({
          id: `suggestion-objective-${String(topObjective.id || "top").slice(0, 24)}`,
          title: `Advance Objective: ${topObjective.title}`,
          rationale: topObjective.whyThisMattersForThisBusiness || "Strategic objective aligned with business DNA.",
          expectedImpact: "Improved objective momentum and KPI clarity.",
          confidence: "medium",
        });
      }
      strategicSuggestions = fallback.slice(0, 3);
    }

    // 10. Persist new snapshot (upsert by user_id + brand_id)
    try {
      await supabase
        .from("dashboard_snapshots")
        .upsert(
          {
            user_id: user.id,
            brand_id: resolvedBrandRowId,
            cards: nextSnapshot,
            tab_cards: tabsResult,
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

    // 11. Log learning event for dashboard generation
    await logBusinessLearningEvent(supabase, {
      userId: user.id,
      workspaceId,
      businessId: businessId || resolvedBrandRowId,
      agentSurface: "run-employee",
      mode: "chat",
      userMessage: `dashboard-insights:${brandName}`,
      assistantResponse: JSON.stringify({
        openingSummary,
        healthScore,
        briefingCount: tabsResult["Briefing"]?.length || 0,
        updatesCount: tabsResult["Updates"]?.length || 0,
        todosCount: tabsResult["To-Dos"]?.length || 0,
        objectivesCount: tabsResult["Objectives"]?.length || 0,
      }),
      profileContext,
      metadata: {
        normalizedEvidenceCount: normalizedEvidence.length,
        connectedProviders,
        dashboard_health_score: healthScore,
        outcome: healthScore >= 70 ? "positive" : healthScore <= 45 ? "negative" : "neutral",
      },
    });

    // 12. Record shown events for ranking feedback loop
    const shownRows: any[] = [];
    for (const tabKey of TAB_KEYS) {
      for (const card of tabsResult[tabKey]) {
        shownRows.push({
          user_id: user.id,
          workspace_id: workspaceId || null,
          business_id: businessId || resolvedBrandRowId,
          card_id: card.id,
          tab: tabKey,
          event_type: "shown",
          source: card.source || null,
          category: card.category || null,
          priority: card.priority || null,
          metadata: { deltaState: card.deltaState || "new" },
        });
      }
    }
    if (shownRows.length > 0) {
      await supabase.from("dashboard_card_events").insert(shownRows).then(() => {}).catch(() => {});
    }

    return new Response(JSON.stringify({
      tabs: tabsResult,
      brandName,
      openingSummary,
      healthScore,
      suggestions: strategicSuggestions,
      resolvedCardIds,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Dashboard insights error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const isAbort = error instanceof Error && (error.name === "AbortError" || /aborted|timeout/i.test(msg));
    if (isAbort) {
      // Graceful degradation: AI took too long. Return empty insights so the UI doesn't blank out.
      return new Response(
        JSON.stringify({
          openingSummary: null,
          tabCards: { briefing: [], updates: [], todos: [], objectives: [] },
          warning: "Insights are taking longer than expected. Please try again in a moment.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const status =
      (error as any)?.status === 402 ? 402 :
      (error as any)?.status === 429 ? 429 :
      msg === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
