import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

import {
  getValidProviderToken,
  searchMicrosoftData,
  searchOneNoteData,
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

    const msProviders = ["microsoft", "microsoft_outlook", "microsoft_onedrive", "microsoft_onenote", "microsoft_teams"];
    const getMsToken = async () => {
      for (const p of msProviders) {
        const t = await getValidProviderToken(supabase, user.id, p);
        if (t) return t;
      }
      return null;
    };

    if (hasMsOutlook || hasMsOnedrive) {
      searchPromises.push((async () => {
        try {
          const msToken = await getMsToken();
          if (!msToken) return;
          const results = await searchMicrosoftData(msToken, searchQuery2, brandName, {
            searchEmails: hasMsOutlook, searchFiles: hasMsOnedrive,
          });
          if (results.emails.length > 0) integrationData += `\n### Recent Emails (Outlook)\n${results.emails.join("\n")}\n`;
          if (results.files.length > 0) integrationData += `\n### Recent Files (OneDrive)\n${results.files.join("\n")}\n`;
        } catch (e) { console.error("MS search error:", e); }
      })());
    }

    if (hasMsOnenote) {
      searchPromises.push((async () => {
        try {
          const msToken = await getMsToken();
          if (!msToken) return;
          const results = await searchOneNoteData(msToken, searchQuery2, brandName);
          if (results.length > 0) integrationData += `\n### Recent Notes (OneNote)\n${results.join("\n")}\n`;
        } catch (e) { console.error("OneNote search error:", e); }
      })());
    }

    if (connectedProviders.includes("slack")) {
      searchPromises.push((async () => {
        try {
          const slackToken = await getValidProviderToken(supabase, user.id, "slack");
          if (!slackToken) return;
          // Fetch recent messages from the whole workspace (no brand filter)
          const channelsRes = await fetch(
            `https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=20&exclude_archived=true`,
            { headers: { Authorization: `Bearer ${slackToken}` } },
          );
          if (!channelsRes.ok) return;
          const channelsData = await channelsRes.json();
          if (!channelsData.ok || !channelsData.channels) return;

          const slackMessages: string[] = [];
          const channels = channelsData.channels.slice(0, 15);
          await Promise.all(channels.map(async (channel: any) => {
            try {
              if (slackMessages.length >= 10) return;
              const histRes = await fetch(
                `https://slack.com/api/conversations.history?channel=${channel.id}&limit=5`,
                { headers: { Authorization: `Bearer ${slackToken}` } },
              );
              if (!histRes.ok) return;
              const histData = await histRes.json();
              if (!histData.ok || !histData.messages) return;
              for (const msg of histData.messages) {
                if (slackMessages.length >= 10) break;
                if (msg.subtype === "channel_join" || msg.subtype === "channel_leave") continue;
                const ts = msg.ts ? new Date(parseFloat(msg.ts) * 1000).toISOString().slice(0, 16).replace("T", " ") : "";
                const preview = (msg.text || "").slice(0, 200);
                if (!preview.trim()) continue;
                slackMessages.push(`💬 **#${channel.name}** (${ts}): ${preview}`);
              }
            } catch (_e) { /* skip channel */ }
          }));
          if (slackMessages.length > 0) integrationData += `\n### Recent Slack Activity\n${slackMessages.join("\n")}\n`;
        } catch (e) { console.error("Slack search error:", e); }
      })());
    }

    if (connectedProviders.includes("hubspot")) {
      searchPromises.push((async () => {
        try {
          const hsToken = await getValidProviderToken(supabase, user.id, "hubspot");
          if (!hsToken) return;
          const contactsRes = await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts?limit=5&properties=firstname,lastname,email,createdate&sorts=-createdate`,
            { headers: { Authorization: `Bearer ${hsToken}` } }
          );
          if (contactsRes.ok) {
            const data = await contactsRes.json();
            const contacts = (data.results || []).map((c: any) =>
              `- ${c.properties?.firstname || ""} ${c.properties?.lastname || ""} (${c.properties?.email || "no email"}) — added ${c.properties?.createdate?.slice(0, 10) || ""}`
            );
            if (contacts.length > 0) integrationData += `\n### Recent HubSpot Contacts\n${contacts.join("\n")}\n`;
          }
          const dealsRes = await fetch(
            `https://api.hubapi.com/crm/v3/objects/deals?limit=5&properties=dealname,amount,dealstage,closedate&sorts=-createdate`,
            { headers: { Authorization: `Bearer ${hsToken}` } }
          );
          if (dealsRes.ok) {
            const data = await dealsRes.json();
            const deals = (data.results || []).map((d: any) =>
              `- ${d.properties?.dealname || "Unnamed"} — $${d.properties?.amount || "0"} (${d.properties?.dealstage || "unknown stage"})`
            );
            if (deals.length > 0) integrationData += `\n### Recent HubSpot Deals\n${deals.join("\n")}\n`;
          }
        } catch (e) { console.error("HubSpot search error:", e); }
      })());
    }

    if (connectedProviders.includes("zoom")) {
      searchPromises.push((async () => {
        try {
          const zoomToken = await getValidProviderToken(supabase, user.id, "zoom");
          if (!zoomToken) return;
          const meetingsRes = await fetch(
            `https://api.zoom.us/v2/users/me/meetings?type=scheduled&page_size=5`,
            { headers: { Authorization: `Bearer ${zoomToken}` } }
          );
          if (meetingsRes.ok) {
            const data = await meetingsRes.json();
            const meetings = (data.meetings || []).map((m: any) =>
              `- ${m.topic || "Untitled"} — ${m.start_time?.slice(0, 16)?.replace("T", " ") || "no date"} (${m.duration || 0} min, ${m.type === 2 ? "scheduled" : "recurring"})`
            );
            if (meetings.length > 0) integrationData += `\n### Upcoming Zoom Meetings\n${meetings.join("\n")}\n`;
          }
          const pastRes = await fetch(
            `https://api.zoom.us/v2/users/me/meetings?type=previous_meetings&page_size=5`,
            { headers: { Authorization: `Bearer ${zoomToken}` } }
          );
          if (pastRes.ok) {
            const data = await pastRes.json();
            const past = (data.meetings || []).map((m: any) =>
              `- ${m.topic || "Untitled"} — ${m.start_time?.slice(0, 16)?.replace("T", " ") || "no date"} (${m.duration || 0} min)`
            );
            if (past.length > 0) integrationData += `\n### Recent Zoom Meetings\n${past.join("\n")}\n`;
          }
        } catch (e) { console.error("Zoom search error:", e); }
      })());
    }

    if (hasMsTeams) {
      searchPromises.push((async () => {
        try {
          const msToken = await getMsToken();
          if (!msToken) return;
          // Fetch recent Teams chats / messages
          const chatsRes = await fetch(
            `https://graph.microsoft.com/v1.0/me/chats?$top=10&$orderby=lastMessagePreview/createdDateTime desc`,
            { headers: { Authorization: `Bearer ${msToken}` } },
          );
          if (!chatsRes.ok) return;
          const chatsData = await chatsRes.json();
          const teamsMessages: string[] = [];
          const chats = (chatsData.value || []).slice(0, 8);
          await Promise.all(chats.map(async (chat: any) => {
            if (teamsMessages.length >= 10) return;
            try {
              const msgRes = await fetch(
                `https://graph.microsoft.com/v1.0/me/chats/${chat.id}/messages?$top=3&$orderby=createdDateTime desc`,
                { headers: { Authorization: `Bearer ${msToken}` } },
              );
              if (!msgRes.ok) return;
              const msgData = await msgRes.json();
              for (const msg of (msgData.value || [])) {
                if (teamsMessages.length >= 10) break;
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

          // Also fetch upcoming online meetings
          const now = new Date().toISOString();
          const meetingsRes = await fetch(
            `https://graph.microsoft.com/v1.0/me/onlineMeetings?$top=5&$filter=startDateTime ge '${now}'&$orderby=startDateTime`,
            { headers: { Authorization: `Bearer ${msToken}` } },
          );
          if (meetingsRes.ok) {
            const meetData = await meetingsRes.json();
            const meetings = (meetData.value || []).map((m: any) =>
              `- ${m.subject || "Untitled"} — ${m.startDateTime?.slice(0, 16)?.replace("T", " ") || "no date"}`
            );
            if (meetings.length > 0) teamsMessages.push(`\n**Upcoming Teams Meetings:**\n${meetings.join("\n")}`);
          }

          if (teamsMessages.length > 0) integrationData += `\n### Recent Microsoft Teams Activity\n${teamsMessages.join("\n")}\n`;
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
- "metadata": source-specific context (same as before: senderName/senderEmail/subject for outlook, scheduledDate/duration/attendees for zoom, contactName/dealValue/stage for hubspot, channel/author for slack/teams, fileName/sharedBy for onedrive, notebook for onenote)

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

  } catch (error: unknown) {
    console.error("Dashboard insights error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: msg === "Unauthorized" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
