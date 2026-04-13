import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

import {
  getValidProviderToken,
  searchMicrosoftData,
  searchOneNoteData,
  searchSlackData,
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

    const { tab, brandId, workspaceId } = await req.json();
    if (!tab || !brandId) throw new Error("tab and brandId required");

    // 1. Load business DNA data scoped to brand
    let query = supabase
      .from("user_business_data")
      .select("id, title, content, data_type, metadata, created_at")
      .eq("source", "business-dna");

    if (workspaceId) query = query.eq("workspace_id", workspaceId);
    else query = query.eq("user_id", user.id);

    const { data: allItems } = await query.limit(500);
    const items = allItems || [];

    // Find the brand row
    const brandRow = items.find((item: any) => item.id === brandId);
    const brandContent = tryParseJson(brandRow?.content);
    const brandName = brandContent?.name || brandRow?.title || "Business";

    // Get brand-scoped items
    const logicalBrandId = brandContent?.id || brandId;
    const brandProducts = items.filter((item: any) => {
      if (item.data_type !== "product") return false;
      const parsed = tryParseJson(item.content);
      const meta = item.metadata;
      return parsed?.brandId === logicalBrandId || meta?.brandId === logicalBrandId;
    });

    const brandAudiences = items.filter((item: any) => {
      if (item.data_type !== "audience") return false;
      const parsed = tryParseJson(item.content);
      const meta = item.metadata;
      return parsed?.brandId === logicalBrandId || meta?.brandId === logicalBrandId;
    });

    // 2. Load connections
    const { data: connections } = await supabase
      .from("user_connections")
      .select("provider, status, metadata, connected_at")
      .eq("user_id", user.id)
      .eq("status", "connected");

    const connectedProviders = (connections || []).map((c: any) => c.provider);

    // 3. Load AI employees linked to this brand
    const { data: employees } = await supabase
      .from("ai_employees")
      .select("id, name, role, status, linked_business_id")
      .eq("user_id", user.id)
      .eq("linked_business_id", brandId);

    // 4. Pull recent data from connected integrations
    let integrationData = "";

    // Search connected providers for recent activity
    const searchQuery = brandName;

    const searchPromises: Promise<void>[] = [];

    // Microsoft
    const hasMsOutlook = connectedProviders.some((p: string) => p === "microsoft" || p === "microsoft_outlook");
    const hasMsOnedrive = connectedProviders.some((p: string) => p === "microsoft" || p === "microsoft_onedrive");
    const hasMsOnenote = connectedProviders.some((p: string) => p === "microsoft" || p === "microsoft_onenote");

    const msProviders = ["microsoft", "microsoft_outlook", "microsoft_onedrive", "microsoft_onenote"];
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
          const results = await searchMicrosoftData(msToken, searchQuery, brandName, {
            searchEmails: hasMsOutlook,
            searchFiles: hasMsOnedrive,
          });
          if (results.emails.length > 0) integrationData += `\n### Recent Emails (Outlook)\n${results.emails.join("\n")}\n`;
          if (results.files.length > 0) integrationData += `\n### Recent Files (OneDrive)\n${results.files.join("\n")}\n`;
        } catch (e) {
          console.error("MS search error:", e);
        }
      })());
    }

    if (hasMsOnenote) {
      searchPromises.push((async () => {
        try {
          const msToken = await getMsToken();
          if (!msToken) return;
          const results = await searchOneNoteData(msToken, searchQuery, brandName);
          if (results.length > 0) integrationData += `\n### Recent Notes (OneNote)\n${results.join("\n")}\n`;
        } catch (e) {
          console.error("OneNote search error:", e);
        }
      })());
    }

    if (connectedProviders.includes("slack")) {
      searchPromises.push((async () => {
        try {
          const slackToken = await getValidProviderToken(supabase, user.id, "slack");
          if (!slackToken) return;
          const results = await searchSlackData(slackToken, searchQuery, brandName);
          if (results.length > 0) integrationData += `\n### Recent Slack Activity\n${results.join("\n")}\n`;
        } catch (e) {
          console.error("Slack search error:", e);
        }
      })());
    }

    // HubSpot - check if connected and pull summary
    if (connectedProviders.includes("hubspot")) {
      searchPromises.push((async () => {
        try {
          const hsToken = await getValidProviderToken(supabase, user.id, "hubspot");
          if (!hsToken) return;
          // Get recent contacts
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

          // Get recent deals
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
        } catch (e) {
          console.error("HubSpot search error:", e);
        }
      })());
    }

    await Promise.all(searchPromises);

    // 5. Build context summary
    const productsSummary = brandProducts.map((p: any) => {
      const parsed = tryParseJson(p.content);
      return `- ${parsed?.name || p.title || "Unnamed Product"}`;
    }).join("\n") || "No products registered.";

    const audiencesSummary = brandAudiences.map((a: any) => {
      const parsed = tryParseJson(a.content);
      return `- ${parsed?.name || a.title || "Unnamed Audience"}: ${parsed?.demographics || ""}`;
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

    // 6. Build tab-specific AI prompt
    const tabPrompts: Record<string, string> = {
      Briefing: `You are a business analyst. Based on the business data and live integration data below, create a concise executive briefing for "${brandName}".

Generate 4-6 briefing cards as a JSON array. Each card should have:
- "id": unique string
- "priority": "High" | "Medium" | "Low"
- "title": short title (max 8 words)
- "description": 2-3 sentence insight or status update
- "category": one of "Brand", "Sales", "Marketing", "Operations", "Integrations", "Team"
- "icon": one of "building", "trending-up", "users", "plug", "mail", "shopping-bag", "palette", "bot", "target", "lightbulb", "alert"

Focus on:
- Overall business health and readiness
- Integration status and what data is flowing in
- Key metrics from HubSpot (deals, contacts) if available
- Recent communications/activity from emails and Slack
- Brand completeness and gaps
- Product and audience coverage

Return ONLY a valid JSON array, no markdown fences.`,

      Updates: `You are a business analyst. Based on the business data and live integration data below, identify recent internal updates and changes for "${brandName}".

Generate 3-6 update cards as a JSON array. Each card should have:
- "id": unique string
- "priority": "High" | "Medium" | "Low"  
- "title": short title (max 8 words)
- "description": 2-3 sentence description of the update
- "category": one of "Brand", "Product", "Audience", "Team", "Integration", "Sales"
- "icon": one of "building", "trending-up", "users", "plug", "mail", "shopping-bag", "palette", "bot", "refresh-cw"
- "timeAgo": approximate time reference like "today", "this week", "recently"

Focus on:
- Recent brand profile changes
- New products or audiences added
- Integration activity (new emails, deals, messages)
- Any changes detected from connected tools
- Team/employee updates

Return ONLY a valid JSON array, no markdown fences.`,

      "To-Dos": `You are a strategic business advisor. Based on the business data and live integration data below, identify problems that need solving and strategic levers to pull for "${brandName}".

Generate 5-8 cards as a JSON array. Each card should have:
- "id": unique string
- "priority": "High" | "Medium" | "Low"
- "title": short actionable title (max 8 words)
- "description": 2-3 sentence explanation of the problem or opportunity
- "category": one of "Problem", "Opportunity", "Suggestion", "Integration"
- "icon": one of "alert", "lightbulb", "trending-up", "users", "plug", "shopping-bag", "palette", "target", "bot"

Split into:
1. PROBLEMS (High/Medium priority): Missing data, incomplete profiles, gaps in brand/product/audience setup, unresponded emails or messages, stale deals
2. SUGGESTIONS (Low/Medium priority): Strategic levers to pull using existing integrations and business DNA — e.g. "Use HubSpot deal data to refine pricing", "Leverage Slack activity to identify collaboration opportunities", "Use audience data to create targeted email campaigns via Outlook"

Return ONLY a valid JSON array, no markdown fences.`,

      Objectives: `You are a strategic business advisor. Based on the business data and live integration data below, suggest smart business objectives for "${brandName}".

Generate 4-6 objective cards as a JSON array. Each card should have:
- "id": unique string
- "priority": "High" | "Medium" | "Low"
- "title": short objective title (max 8 words)
- "description": 2-3 sentence description of the objective, including how to achieve it using the available tools and data
- "category": one of "Growth", "Operations", "Brand", "Sales", "Marketing", "Team"
- "icon": one of "target", "trending-up", "users", "plug", "shopping-bag", "palette", "bot", "award", "lightbulb"

Objectives should be:
- Data-driven: based on actual business state (e.g. if 0 products, objective is to catalog products)
- Integration-aware: leverage connected tools (e.g. "Use HubSpot pipeline to close 3 deals this month")
- Measurable where possible
- Mix of short-term (this week) and medium-term (this month)

Return ONLY a valid JSON array, no markdown fences.`,
    };

    const systemPrompt = tabPrompts[tab] || tabPrompts["Briefing"];

    // 7. Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
    const rawContent = aiData.choices?.[0]?.message?.content || "[]";

    // Parse JSON from response (handle potential markdown wrapping)
    let cards: any[];
    try {
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
      cards = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (e) {
      console.error("Failed to parse AI response:", rawContent.slice(0, 500));
      cards = [];
    }

    return new Response(JSON.stringify({ cards, brandName }), {
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
