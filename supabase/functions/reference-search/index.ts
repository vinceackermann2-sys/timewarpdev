import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { fetchPublicWebSnapshot } from "../_shared/public-web-snapshot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractUrlsFromMarkdown(md: string, limit: number): { url: string; title: string }[] {
  const out: { url: string; title: string }[] = [];
  const seen = new Set<string>();
  const linkRe = /\[([^\]]{1,120})\]\((https?:\/\/[^)\s]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(md)) !== null && out.length < limit) {
    const url = m[2].replace(/\)$/, "");
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title: m[1].trim() || url });
  }
  const bareRe = /(https?:\/\/[^\s)\]"']+)/g;
  while ((m = bareRe.exec(md)) !== null && out.length < limit) {
    const url = m[1];
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title: url.replace(/^https?:\/\//, "").split("/")[0] || url });
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { q?: string } = {};
    try {
      body = await req.json();
    } catch { /* */ }
    const q = String(body.q || "").trim();
    if (q.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const snap = await fetchPublicWebSnapshot(q);
    const results = extractUrlsFromMarkdown(snap || "", 8).map((r, i) => {
      let host = "example.com";
      try {
        host = new URL(r.url).hostname;
      } catch { /* keep default */ }
      return {
        id: String(i + 1),
        url: r.url,
        name: r.title,
        logo: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`,
      };
    });

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
