import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Lazy client init to avoid boot-time crashes if env vars are temporarily unavailable
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Server configuration is missing");
  }
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      global: { headers: { "X-Client-Info": "long-task-status" } },
    });
  }
  return _supabase;
}

const RUN_SELECT = "id, continuation_key, task_type, status, phase, progress, logs, result_excerpt, error, updated_at, created_at";
const CHECKPOINT_SELECT = "continuation_index, content, metadata, updated_at";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server configuration is missing");
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) throw new Error("Missing authorization header");

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const continuationKey = typeof body?.continuationKey === "string" ? body.continuationKey.trim() : "";
    const userId = authData.user.id;

    let run: Record<string, unknown> | null = null;

    if (continuationKey) {
      const { data, error } = await supabase
        .from("long_task_runs")
        .select(RUN_SELECT)
        .eq("user_id", userId)
        .eq("continuation_key", continuationKey)
        .maybeSingle();

      if (error) throw error;
      run = data ?? null;
    } else {
      const { data, error } = await supabase
        .from("long_task_runs")
        .select(RUN_SELECT)
        .eq("user_id", userId)
        .in("status", ["queued", "in_progress"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      run = data ?? null;
    }

    const keyForCheckpoint = typeof run?.continuation_key === "string"
      ? run.continuation_key
      : continuationKey;

    let checkpoint: Record<string, unknown> | null = null;
    if (keyForCheckpoint) {
      const { data, error } = await supabase
        .from("long_task_checkpoints")
        .select(CHECKPOINT_SELECT)
        .eq("continuation_key", keyForCheckpoint)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      checkpoint = data ?? null;
    }

    return new Response(JSON.stringify({ ok: true, run, checkpoint }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: message === "Unauthorized" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

