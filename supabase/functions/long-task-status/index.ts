import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const continuationKey = typeof body?.continuationKey === "string" ? body.continuationKey.trim() : "";
    let run: any = null;
    if (continuationKey) {
      const { data } = await supabase
        .from("long_task_runs")
        .select("id, continuation_key, task_type, status, phase, progress, logs, result_excerpt, error, updated_at, created_at")
        .eq("user_id", user.id)
        .eq("continuation_key", continuationKey)
        .maybeSingle();
      run = data || null;
    } else {
      const { data } = await supabase
        .from("long_task_runs")
        .select("id, continuation_key, task_type, status, phase, progress, logs, result_excerpt, error, updated_at, created_at")
        .eq("user_id", user.id)
        .in("status", ["queued", "in_progress"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      run = data || null;
    }

    const keyForCheckpoint = run?.continuation_key || continuationKey;
    const { data: checkpoint } = await supabase
      .from("long_task_checkpoints")
      .select("continuation_index, content, metadata, updated_at")
      .eq("continuation_key", keyForCheckpoint)
      .maybeSingle();

    return new Response(JSON.stringify({ ok: true, run: run || null, checkpoint: checkpoint || null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || "Internal error" }), {
      status: err?.message === "Unauthorized" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

