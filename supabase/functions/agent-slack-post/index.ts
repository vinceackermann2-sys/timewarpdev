// Posts a Slack message AS a specific agent's persona using the workspace's
// connected Slack OAuth bot token. Each agent supplies its own username + icon
// so a single Slack app can host many agent personas.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.23.8";
import { getValidAccessToken } from "../_shared/oauth/refresh.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  agent_id: z.string().uuid(),
  channel: z.string().min(1).optional(),
  text: z.string().min(1).max(40000),
  blocks: z.array(z.any()).optional(),
  thread_ts: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: claimErr } = await userClient.auth.getClaims(
      auth.replace("Bearer ", ""),
    );
    if (claimErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Load agent + verify ownership
    const { data: agent, error: agentErr } = await admin
      .from("ai_agents")
      .select(
        "id, user_id, workspace_id, name, slack_bot_username, slack_bot_icon_url, slack_bot_icon_emoji, slack_default_channel",
      )
      .eq("id", parsed.data.agent_id)
      .maybeSingle();
    if (agentErr || !agent) return json({ error: "Agent not found" }, 404);
    if (agent.user_id !== userId) {
      // workspace member check
      if (agent.workspace_id) {
        const { data: member } = await admin
          .from("workspace_members")
          .select("id")
          .eq("workspace_id", agent.workspace_id)
          .eq("user_id", userId)
          .maybeSingle();
        if (!member) return json({ error: "Forbidden" }, 403);
      } else {
        return json({ error: "Forbidden" }, 403);
      }
    }

    const channel = (parsed.data.channel || agent.slack_default_channel || "").trim();
    if (!channel) return json({ error: "No channel: provide `channel` or set agent's default channel." }, 400);

    // Get the workspace's Slack bot token
    const token = await getValidAccessToken(admin, {
      userId: agent.user_id,
      workspaceId: agent.workspace_id,
      provider: "slack",
    });
    if (!token) {
      return json({ error: "Slack is not connected for this workspace. Connect Slack first." }, 400);
    }

    const username = (agent.slack_bot_username || agent.name || "Agent").slice(0, 80);
    const payload: Record<string, unknown> = {
      channel,
      text: parsed.data.text,
      username,
      // Override icon: prefer URL, fall back to emoji
      ...(agent.slack_bot_icon_url ? { icon_url: agent.slack_bot_icon_url } : {}),
      ...(agent.slack_bot_icon_emoji && !agent.slack_bot_icon_url
        ? { icon_emoji: agent.slack_bot_icon_emoji }
        : {}),
      ...(parsed.data.blocks ? { blocks: parsed.data.blocks } : {}),
      ...(parsed.data.thread_ts ? { thread_ts: parsed.data.thread_ts } : {}),
    };

    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });
    const slackData = await slackRes.json();
    if (!slackData.ok) {
      return json({ error: `Slack error: ${slackData.error || "unknown"}`, details: slackData }, 502);
    }

    return json({ ok: true, ts: slackData.ts, channel: slackData.channel, posted_as: username });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
