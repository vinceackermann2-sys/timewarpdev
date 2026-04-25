// Triggers a background re-enrichment of the data-grounded Business DNA pillars
// after a new integration is connected. The AI on the backend is instructed to
// only fill fields that have real evidence — empty fields are preserved as Gaps.
import { supabase } from "@/integrations/supabase/client";

// All 9 pillars — connection signals can ground evidence anywhere (e.g. HubSpot
// hints at audience/market segments, Slides hints at strategy/brand, Sheets at
// financial, etc.). The strict anti-fabrication rules in the prompt ensure
// fields without evidence remain empty (Gap).
const ALL_PILLARS = [
  "brand", "product", "audience", "market",
  "financial", "operations", "people", "growth", "strategy",
];

export async function triggerDnaReEnrich(brandId?: string): Promise<void> {
  if (!brandId) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // PERF: Resolve via metadata->>brandId first (no content download).
    // Fall back to scanning content only if no metadata match exists (legacy rows).
    const { data: metaRows } = await (supabase as any)
      .from("user_business_data")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("data_type", "brand")
      .eq("metadata->>brandId", brandId)
      .limit(1);

    let brandRowId: string | null = metaRows?.[0]?.id ?? null;

    if (!brandRowId) {
      // Legacy fallback: brand rows without metadata.brandId
      const { data: rows } = await (supabase as any)
        .from("user_business_data")
        .select("id, content")
        .eq("user_id", session.user.id)
        .eq("data_type", "brand")
        .limit(50);

      for (const r of rows || []) {
        if (r.id === brandId) { brandRowId = r.id; break; }
        try {
          const c = typeof r.content === "string" ? JSON.parse(r.content) : r.content;
          if (c?.id === brandId) { brandRowId = r.id; break; }
        } catch { /* ignore */ }
      }
    }
    if (!brandRowId) return;

    // Fire-and-forget (no await on the response).
    void supabase.functions.invoke("enrich-pillars", {
      body: { brandId, brandRowId, pillars: ALL_PILLARS, evidenceMode: "blend" },
    });
  } catch (err) {
    console.warn("triggerDnaReEnrich failed (non-blocking):", err);
  }
}
