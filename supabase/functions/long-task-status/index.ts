import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const RUN_SELECT = "id, continuation_key, task_type, status, phase, progress, logs, result_excerpt, error, updated_at, created_at";
const CHECKPOINT_SELECT = "continuation_index, content, metadata, updated_at";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function requireServerConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Server configuration is missing");
  }
}

async function getUserIdFromToken(token: string): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error("Unauthorized");
  const user = await response.json();
  if (typeof user?.id !== "string" || !user.id) throw new Error("Unauthorized");
  return user.id;
}

async function restSelect<T>(path: string): Promise<T[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Accept": "application/json",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const parsed = JSON.parse(text);
      errorMessage = parsed?.message || parsed?.error || errorMessage;
    } catch {
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }

  if (!text) return [];
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed as T[] : [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    requireServerConfig();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) throw new Error("Missing authorization header");

    const body = await req.json().catch(() => ({}));
    const continuationKey = typeof body?.continuationKey === "string" ? body.continuationKey.trim() : "";
    const userId = await getUserIdFromToken(token);

    let run: Record<string, unknown> | null = null;

    if (continuationKey) {
      const rows = await restSelect<Record<string, unknown>>(
        `long_task_runs?select=${encodeURIComponent(RUN_SELECT)}&user_id=eq.${encodeURIComponent(userId)}&continuation_key=eq.${encodeURIComponent(continuationKey)}&limit=1`,
      );
      run = rows[0] ?? null;
    } else {
      const rows = await restSelect<Record<string, unknown>>(
        `long_task_runs?select=${encodeURIComponent(RUN_SELECT)}&user_id=eq.${encodeURIComponent(userId)}&status=in.(queued,in_progress)&order=updated_at.desc&limit=1`,
      );
      run = rows[0] ?? null;
    }

    const keyForCheckpoint = typeof run?.continuation_key === "string"
      ? run.continuation_key
      : continuationKey;

    let checkpoint: Record<string, unknown> | null = null;
    if (keyForCheckpoint) {
      const rows = await restSelect<Record<string, unknown>>(
        `long_task_checkpoints?select=${encodeURIComponent(CHECKPOINT_SELECT)}&continuation_key=eq.${encodeURIComponent(keyForCheckpoint)}&order=updated_at.desc&limit=1`,
      );
      checkpoint = rows[0] ?? null;
    }

    return new Response(JSON.stringify({ ok: true, run, checkpoint }), {
      headers: jsonHeaders,
      status: 200,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: message === "Unauthorized" || message === "Missing authorization header" ? 401 : 500,
      headers: jsonHeaders,
    });
  }
});

