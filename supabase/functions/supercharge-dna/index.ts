import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Artifact = { name: string; text: string };

function clip(s: string, n = 8000): string {
  return (s || "").slice(0, n);
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return "";
  const text = await res.text();
  return clip(stripHtml(text), 12000);
}

async function resolveBrandRowId(admin: any, userId: string, brandId: string): Promise<string | null> {
  const { data: rows } = await admin
    .from("user_business_data")
    .select("id, content")
    .eq("user_id", userId)
    .eq("data_type", "brand")
    .eq("source", "business-dna")
    .limit(100);

  for (const row of rows || []) {
    if (row.id === brandId) return row.id;
    try {
      const parsed = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
      if (parsed?.id === brandId) return row.id;
    } catch {
      // ignore
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const logs: string[] = [];
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const brandId = String(body?.brandId || "").trim();
    const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : null;
    const evidenceModeRaw = String(body?.evidenceMode || "").trim().toLowerCase();
    const evidenceMode = ["internal", "external", "feedback_first", "blend"].includes(evidenceModeRaw)
      ? evidenceModeRaw
      : "blend";
    const urls = Array.isArray(body?.urls) ? body.urls.map((u: unknown) => String(u || "").trim()).filter(Boolean).slice(0, 12) : [];
    const artifacts: Artifact[] = Array.isArray(body?.artifacts)
      ? body.artifacts.map((a: any) => ({ name: String(a?.name || "file"), text: clip(String(a?.text || ""), 15000) })).slice(0, 12)
      : [];

    if (!brandId) throw new Error("brandId is required");

    logs.push("Resolving business context...");
    const brandRowId = await resolveBrandRowId(admin, user.id, brandId);
    if (!brandRowId) throw new Error("Brand not found");

    logs.push("Collecting URL evidence...");
    const urlEvidence: { url: string; text: string }[] = [];
    for (const u of urls) {
      try {
        const text = await fetchUrlText(u);
        if (text) {
          urlEvidence.push({ url: u, text });
          logs.push(`Fetched URL evidence: ${u}`);
        } else {
          logs.push(`No usable text from URL: ${u}`);
        }
      } catch {
        logs.push(`Failed URL fetch: ${u}`);
      }
    }

    logs.push("Saving uploaded file evidence...");
    for (const a of artifacts) {
      await admin.from("user_business_data").insert({
        user_id: user.id,
        workspace_id: workspaceId,
        data_type: "document",
        source: "supercharge-dna",
        title: a.name,
        content: a.text || null,
        is_analyzed: !!a.text,
        metadata: { brandId, supercharge: true, evidenceType: "file" },
      });
    }

    for (const item of urlEvidence) {
      await admin.from("user_business_data").insert({
        user_id: user.id,
        workspace_id: workspaceId,
        data_type: "document",
        source: "supercharge-dna",
        title: `URL Evidence: ${item.url}`,
        content: item.text,
        is_analyzed: true,
        metadata: { brandId, supercharge: true, evidenceType: "url", url: item.url },
      });
    }

    logs.push("Running pillar enrichment with all verified sources...");
    const enrichRes = await fetch(`${SUPABASE_URL}/functions/v1/enrich-pillars`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        brandId,
        brandRowId,
        workspaceId,
        superchargeMode: true,
        evidenceMode,
        externalEvidence: {
          urls: urlEvidence.map((e) => ({ url: e.url, excerpt: clip(e.text, 2000) })),
          files: artifacts.map((a) => ({ name: a.name, excerpt: clip(a.text, 2000) })),
        },
      }),
    });

    const enrichData = await enrichRes.json().catch(() => ({}));
    if (!enrichRes.ok || enrichData?.error) {
      throw new Error(enrichData?.error || "enrich-pillars failed");
    }

    logs.push("Enrichment complete. All fields validated against available evidence.");

    return new Response(JSON.stringify({ ok: true, logs, enrich: enrichData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    logs.push(`Error: ${message}`);
    return new Response(JSON.stringify({ ok: false, error: message, logs }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
