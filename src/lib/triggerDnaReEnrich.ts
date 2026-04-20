// Triggers a background re-enrichment of the data-grounded Business DNA pillars
// after a new integration is connected. The AI on the backend is instructed to
// only fill fields that have real evidence — empty fields are preserved as Gaps.
import { supabase } from "@/integrations/supabase/client";

const GROUNDED_PILLARS = ["people", "operations", "financial", "growth"];

export async function triggerDnaReEnrich(brandId?: string): Promise<void> {
  if (!brandId) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Resolve brand row id from logical brand id (content.id may equal brandId).
    const { data: rows } = await (supabase as any)
      .from("user_business_data")
      .select("id, content, metadata")
      .eq("user_id", session.user.id)
      .eq("data_type", "brand")
      .limit(50);

    let brandRowId: string | null = null;
    for (const r of rows || []) {
      if (r.id === brandId) { brandRowId = r.id; break; }
      try {
        const c = typeof r.content === "string" ? JSON.parse(r.content) : r.content;
        if (c?.id === brandId) { brandRowId = r.id; break; }
      } catch { /* ignore */ }
      if (r.metadata?.brandId === brandId) { brandRowId = r.id; break; }
    }
    if (!brandRowId) return;

    // Fire-and-forget (no await on the response).
    void supabase.functions.invoke("enrich-pillars", {
      body: { brandId, brandRowId, pillars: GROUNDED_PILLARS },
    });
  } catch (err) {
    console.warn("triggerDnaReEnrich failed (non-blocking):", err);
  }
}
