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
    const systemPrompt = `You are a business analyst and strategic advisor for "${brandName}". Generate insights across 4 categories by combining INTEGRATION data with the BUSINESS DNA alignment layer.

The current date/time is: ${currentTime}
Use this to calculate accurate "timeAgo" values. Be precise — do NOT guess or fabricate timestamps.

## ALIGNMENT LAYER (Business DNA)
Use the Business Overview, Products, Target Audiences, and AI Employees sections below as the alignment layer. Every insight you generate should be contextualized against this business's identity, goals, products, and audiences. This ensures all cards are strategically relevant — not generic.

## DATA SOURCES
Generate cards primarily from CONNECTED INTEGRATION data (HubSpot, Slack, Outlook, OneDrive, OneNote, Zoom). When integration data is available, every card must trace back to a specific integration source. When NO integration data is available, generate cards from the Business DNA alignment layer using source "business-dna" — these should be strategic suggestions based on the business's products, audiences, and brand identity.

Return a JSON object with exactly these 4 keys: "Briefing", "Updates", "To-Dos", "Objectives". Each key maps to an array of cards.

Each card has:
- "id": unique string
- "priority": "High" | "Medium" | "Low"
- "title": short title (max 8 words)
- "description": 2-3 sentence insight
- "detail": 3-5 sentence deep-dive with specific data, recommendations, or solutions. Be actionable.
- "category": contextual label (e.g. "Sales", "Marketing", "Operations", "Problem", "Opportunity", "Growth", "Communication", "Strategy")
- "source": MUST be one of: "hubspot", "slack", "outlook", "onedrive", "onenote", "zoom", "business-dna". Use "business-dna" only when no integration data is available for that insight.
- "icon": one of "building", "trending-up", "users", "plug", "mail", "shopping-bag", "palette", "bot", "target", "lightbulb", "alert", "refresh-cw", "award", "image"
- "timeAgo": accurate relative time string. For integration data, calculate from source timestamps. For business-dna cards, omit or use "just now".
- "timestamp": ISO 8601 timestamp of the original event. For business-dna cards, use "${currentTime}".
- "actionSuggestion": A specific, actionable next step. Be concrete.
- "metadata": An object with source-specific context fields:
  - For "outlook": { "senderName", "senderEmail", "subject" }
  - For "zoom": { "scheduledDate", "duration", "attendees" }
  - For "hubspot": { "contactName", "dealValue", "stage" }
  - For "slack": { "channel", "author" }
  - For "onedrive": { "fileName", "sharedBy" }
  - For "onenote": { "notebook" }
  - For "business-dna": { "category": "brand|product|audience|employee" }

Sort cards by priority (High first). Do NOT fabricate integration data.

**Briefing** (3-6 cards): The critical signals — what's on track, what's slipping, and what deserves attention. Synthesize integration health and key metrics through the lens of the business's goals and audience.

**Updates** (3-6 cards): People, decisions, approvals, and blockers. Surface recent activity from integrations (emails, deals, messages, files) instantly so nothing slows the user down. Include "timeAgo".

**To-Dos** (6-10 cards): The user's highest-leverage actions — clearly defined, prioritized, and ready to execute. Include TWO types:
  1. PROBLEMS detected in integrations (unresponded emails, stale deals, gaps)
  2. STRATEGIC SUGGESTIONS: High-leverage tasks based on the business's DNA. Identify the biggest levers to pull — e.g. "Your audience segment X has no targeted product — create one", "Your brand lacks social proof — collect 5 testimonials this week", "No content pipeline for audience Y — draft 3 blog post outlines". These should be the moves that create disproportionate impact.

**Objectives** (3-6 cards): Preps meetings, reorganizes priorities, and protects time for the work that matters most. Measurable goals aligned to the business's products, audiences, and growth trajectory.

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
