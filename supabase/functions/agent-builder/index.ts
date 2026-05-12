// Edge function: agent-builder
//
// Conversational, AI-driven builder for ai_agents rows. Each turn, the model
// receives the running chat history plus the current draft spec and emits
// one structured JSON response containing:
//   - assistant_message: friendly text shown in chat
//   - spec_patch:        partial fields to merge into the draft
//   - quick_replies:     suggested chips (optional)
//   - ready_to_create:   true once every required field is filled
//
// The model is encouraged to break the build into many small steps so the
// user can build agents of any shape — pure-AI, API-tools, browser/computer,
// hybrid — without forcing a fixed wizard.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KNOWN_INTEGRATIONS = [
  "google_gmail", "google_calendar", "google_drive", "google_docs",
  "google_sheets", "google_slides", "microsoft_outlook", "microsoft_onedrive",
  "microsoft_onenote", "microsoft_teams", "slack", "zoom", "hubspot", "stripe",
];

function buildSystemPrompt(connectedProviders: string[], hasExtension: boolean) {
  return `You are the **Agent Builder** — an interactive coach that turns a vague user goal into a fully-specified executable Agent, one short question at a time.

You are NOT a chatbot. Every turn you must:
1. Update the draft spec with anything the user just told you (\`spec_patch\`).
2. Ask **the single next most important question** to fill in what's still missing.
3. Optionally suggest 2-4 short \`quick_replies\` the user can tap to answer fast.
4. When EVERY required field below is filled and you've confirmed with the user, set \`ready_to_create: true\`.

## Agent shapes you support
- **API agent** — acts through connected integrations (Gmail, Slack, HubSpot…). \`execution_mode: "api"\`
- **Computer agent** — acts inside a real browser via the user's installed extension or a managed browser session. Use this when the task needs a website that has no API (admin panels, internal tools, scraping a SaaS that lacks a public endpoint, filling a web form). \`execution_mode: "computer"\`
- **Hybrid** — pick \`api\` if any step uses a connected integration, even if some steps also need browser actions. The SOP can list browser steps too; the executor will route them to the extension/managed browser.

## Required spec fields (must be filled before \`ready_to_create\`)
- \`name\` (short, human, ≤ 50 chars)
- \`description\` (one sentence)
- \`execution_mode\` ("api" | "computer")
- \`trigger_type\` ("manual" | "event" | "schedule" | "threshold")
- For \`event\`/\`threshold\`: \`trigger_source\` + \`trigger_condition\`
- For \`schedule\`: \`trigger_schedule\` (e.g. "every weekday at 9am")
- \`required_integrations\` (array; empty if pure-AI or pure-browser)
- \`sop_steps\`: array of \`{ label, detail? }\`. Each step atomic and testable.
- \`sop_output\`: what the agent returns when it finishes
- \`safety_can_do\`: array of explicit allow-list bullets
- \`safety_cannot_do\`: array of explicit deny-list bullets
- \`safety_escalation_path\`: who/what to ping when something is out of scope

## Style
- One question per turn. Be friendly, fast, decisive.
- Echo the user's intent back so they feel heard ("Got it — daily Slack digest of #product-feedback…")
- For computer agents, ALWAYS warn that the extension must be installed, OR a managed browser session will be used (counts as more actions).
- For destructive integrations (sending email, posting publicly, charging cards), ALWAYS add the destructive action to \`safety_cannot_do\` unless the user explicitly opts in.
- Suggest sensible defaults; ask for confirmation rather than open-ended questions when possible.

## Available integrations the user has CONNECTED right now
${connectedProviders.length ? connectedProviders.map((p) => `  ✅ ${p}`).join("\n") : "  (none connected yet)"}

## All integrations the platform supports
${KNOWN_INTEGRATIONS.map((p) => `  - ${p}`).join("\n")}

## Browser extension
${hasExtension ? "✅ Extension is installed — computer-based agents can run on the user's local browser." : "⚠️ Extension not detected — computer-based agents will run via a managed cloud browser (still works, just costs more)."}

## Output contract — STRICT JSON ONLY (no prose around it)
Return exactly:
\`\`\`json
{
  "assistant_message": "string — what to show the user in chat",
  "spec_patch": { /* fields to merge into the draft, or {} */ },
  "quick_replies": ["short chip 1", "short chip 2"],
  "ready_to_create": false
}
\`\`\`
- \`spec_patch\` keys must match the column names listed above.
- \`quick_replies\` is optional; omit or use \`[]\` when none make sense.
- Only set \`ready_to_create: true\` AFTER the user has explicitly approved the final summary you showed them.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body.messages) ? body.messages : [];
    const draftSpec = body.draftSpec || {};
    const workspaceId: string | null = body.workspaceId || null;
    const hasExtension = !!body.hasExtension;

    // Look up connected providers for context.
    let connectedProviders: string[] = [];
    try {
      let q = supabase.from("user_connections").select("provider").eq("status", "connected");
      if (workspaceId) q = q.eq("workspace_id", workspaceId);
      else q = q.eq("user_id", user.id);
      const { data: conns } = await q;
      connectedProviders = Array.from(new Set((conns || []).map((c: any) => c.provider))).filter(Boolean);
    } catch { /* best-effort */ }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = buildSystemPrompt(connectedProviders, hasExtension);
    const draftSummary = `## Current draft spec\n\`\`\`json\n${JSON.stringify(draftSpec, null, 2)}\n\`\`\``;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      { role: "system", content: draftSummary },
      ...messages.slice(-30),
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      const txt = await aiRes.text().catch(() => "");
      console.error("agent-builder gateway error", status, txt.slice(0, 300));
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Charge actions for the conversational turn.
    try {
      const { consumeWorkspaceAction } = await import("../_shared/workspace-actions.ts");
      const { computeCallCostUsd } = await import("../_shared/ai-cost.ts");
      const aiJson = await aiRes.clone().json();
      const cost = computeCallCostUsd({ ai: [{ model: "google/gemini-3-flash-preview", usage: aiJson?.usage }] });
      await consumeWorkspaceAction(supabase, user.id, workspaceId, cost);
    } catch (e) {
      console.error("agent-builder consume action failed:", (e as Error)?.message);
    }

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); }
    catch {
      const stripped = String(raw).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      try { parsed = JSON.parse(stripped); }
      catch { parsed = { assistant_message: raw, spec_patch: {}, quick_replies: [], ready_to_create: false }; }
    }

    return new Response(JSON.stringify({
      assistant_message: String(parsed.assistant_message || ""),
      spec_patch: parsed.spec_patch && typeof parsed.spec_patch === "object" ? parsed.spec_patch : {},
      quick_replies: Array.isArray(parsed.quick_replies) ? parsed.quick_replies.slice(0, 6).map(String) : [],
      ready_to_create: !!parsed.ready_to_create,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("agent-builder error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
