/** Instructions so the model emits `twcite:twsrc_N` markdown links tied to Citation lines in live context. */
export const LIVE_SOURCE_CITATION_INSTRUCTIONS = `
## Citing rows from Connected Sources (required for live data)
When your answer references a **specific** email, file, calendar event, Slack message, or any other **row** from **Connected Sources (Live Search Results)** that includes a **Citation:** \`twsrc_N\` line, wrap the **short factual label** (subject, file name, event title, etc.) in a markdown link:
[\`visible label\`](twcite:twsrc_N)
Rules:
- Use **only** citation ids that appear on a **Citation:** line in that section (e.g. \`twsrc_2\`). Never invent ids.
- Prefer one link the first time you name each distinct row; you may repeat the same \`twcite:\` id when referring again to the same row.
- The visible label must match the underlying data (subject/filename/title), not generic words like "this email".
`.trim();

export type LiveSourceRegistry = Record<string, {
  provider: string;
  kind: string;
  title: string;
  snippet?: string;
  webUrl?: string | null;
}>;

export type LiveContextChunk = {
  markdown: string;
  meta: LiveSourceRegistry[string];
};

/** Append citation ids and fill \`registry\` (mutates). Returns markdown block(s). */
export function appendLiveChunks(
  chunks: LiveContextChunk[],
  registry: LiveSourceRegistry,
  counter: { n: number },
): string {
  if (!chunks.length) return "";
  return chunks.map((ch) => {
    const id = `twsrc_${++counter.n}`;
    registry[id] = ch.meta;
    return `${ch.markdown}\n- **Citation:** \`${id}\``;
  }).join("\n\n") + "\n";
}

/** Base64url-ish for ASCII-safe response headers (trimmed size). */
export function encodeLiveSourceRegistryHeader(registry: LiveSourceRegistry): string | null {
  const keys = Object.keys(registry);
  if (keys.length === 0) return null;
  const slim: LiveSourceRegistry = {};
  for (const k of keys.slice(0, 32)) {
    const v = registry[k];
    slim[k] = {
      ...v,
      snippet: v.snippet ? v.snippet.slice(0, 700) : undefined,
    };
  }
  try {
    const json = JSON.stringify(slim);
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return null;
  }
}
