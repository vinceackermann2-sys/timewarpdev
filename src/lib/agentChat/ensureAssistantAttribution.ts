import type { DataSourceAttribution, DataSourceAttributionItem } from "@/lib/agentChat/parseAssistantSources";

const TRIVIAL = /^(ok|thanks|thank you|ty|yes|no|sure|got it|cool|nice)\b[!.\s]*$/i;

/**
 * Ensures substantive assistant replies get a Sources row when the model omitted
 * ```assistant_sources``` or left sources empty.
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

  if (parsed && parsed.sources.length > 0) {
    return { ...parsed, dataBacked: true };
  }

  const sources: DataSourceAttributionItem[] = [{ tier: "internal", key: "dna", label: "Business profile" }];
  if (opts?.replyContract === "live_lookup") {
    sources.push({ tier: "internal", key: "live", label: "Connected apps" });
  }
  if (/\bhttps?:\/\/|\bwww\.|firecrawl|web snapshot|external tier/i.test(t)) {
    sources.push({ tier: "external", key: "web", label: "Web or links" });
  }
  const u = (opts?.userSnippet || "").trim();
  if (u.length >= 8) {
    sources.push({ tier: "feedback", key: "user", label: "Your request" });
  }

  if (parsed?.dataBacked === false && parsed.sources.length === 0 && t.length < 80) {
    return parsed;
  }

  return { dataBacked: true, sources };
}
