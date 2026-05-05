import type { DataSourceAttribution, DataSourceAttributionItem } from "@/lib/agentChat/parseAssistantSources";

const TRIVIAL = /^(ok|thanks|thank you|ty|yes|no|sure|got it|cool|nice)\b[!.\s]*$/i;

/**
 * Ensures substantive assistant replies get a Sources row when the model omitted
 * ```assistant_sources```. We do NOT fabricate evidence — only surface what the
 * model actually declared, plus a single "Connected apps" entry for live_lookup
 * replies (which by contract pulled fresh data from the user's integrations).
 *
 * The previous implementation auto-attached "Business profile" + "Your request"
 * to every reply, which made the Data-backed badge dishonest.
 */
export function ensureAssistantSourceAttribution(
  bodyForUi: string,
  parsed: DataSourceAttribution | null,
  opts?: { replyContract?: "direct" | "live_lookup" | "strategic_plan"; userSnippet?: string },
): DataSourceAttribution {
  const t = (bodyForUi || "").trim();
  if (t.length < 12 || TRIVIAL.test(t)) {
    return parsed?.sources?.length ? parsed : { dataBacked: false, sources: [] };
  }

  // Trust the model's own attribution first.
  if (parsed && parsed.sources.length > 0) {
    return { ...parsed, dataBacked: true };
  }

  // Live-lookup replies are guaranteed to come from connector data, so we can
  // safely surface a single connector tier even if the model forgot the fence.
  if (opts?.replyContract === "live_lookup") {
    return {
      dataBacked: true,
      sources: [{ tier: "connector", key: "live", label: "Connected apps" }],
    };
  }

  // Otherwise: don't fabricate. No fence + no connector data = no badge.
  return { dataBacked: false, sources: [] };
}
