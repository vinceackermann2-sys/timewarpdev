// Compatibility stub for legacy browser-extension callers that still POST to
// /functions/v1/sync-research. Returns 200 OK to silence 404 noise without
// exposing any data or doing any work.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ ok: true, deprecated: true, message: "sync-research is deprecated; please update the extension." }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
});
