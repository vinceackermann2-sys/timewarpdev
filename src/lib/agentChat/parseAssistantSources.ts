export type DataSourceTier = "internal" | "external" | "feedback";

export interface DataSourceAttributionItem {
  tier: DataSourceTier;
  key: string;
  label: string;
}

export interface DataSourceAttribution {
  dataBacked: boolean;
  sources: DataSourceAttributionItem[];
}

const FENCE_RE =
  /```assistant_sources\s*\n?([\s\S]*?)```/i;

function safeParse(json: string): DataSourceAttribution | null {
  try {
    const raw = JSON.parse(json) as { data_backed?: boolean; sources?: unknown };
    if (!raw || typeof raw !== "object") return null;
    const dataBacked = Boolean(raw.data_backed);
    const sourcesIn = Array.isArray(raw.sources) ? raw.sources : [];
    const sources: DataSourceAttributionItem[] = [];
    for (const s of sourcesIn) {
      if (!s || typeof s !== "object") continue;
      const o = s as Record<string, unknown>;
      const tier = o.tier;
      const key = o.key;
      const label = o.label;
      if (tier !== "internal" && tier !== "external" && tier !== "feedback") continue;
      if (typeof key !== "string" || typeof label !== "string") continue;
      sources.push({ tier, key: key.slice(0, 48), label: label.slice(0, 80) });
    }
    return { dataBacked, sources };
  } catch {
    return null;
  }
}

/** Strip ```assistant_sources``` from assistant markdown; return parsed attribution if any. */
export function extractAssistantSources(text: string): { content: string; attribution: DataSourceAttribution | null } {
  const m = text.match(FENCE_RE);
  if (!m) {
    return { content: text.trimEnd(), attribution: null };
  }
  const attribution = safeParse(m[1].trim());
  const content = text.replace(FENCE_RE, "").trimEnd();
  return { content, attribution };
}
