/**
 * Public web context for assistant chat.
 * Primary: Firecrawl /v1/search (+ markdown scrape) when FIRECRAWL_API_KEY is set.
 * Fallback: DuckDuckGo instant answers + Wikipedia (no key).
 */

import type { AssistantReplyContract } from "./assistant-reply-contract.ts";

/** Broad intent: explicit search language + competitor/market/news/research phrasing + strategic plan with external lens. */
export function shouldFetchPublicWebContext(message: string, replyContract: AssistantReplyContract): boolean {
  const m = message.trim();
  if (!m || m.length < 3) return false;

  if (
    /\b(google|bing|duckduckgo)\s+search\b/i.test(m) ||
    /\bgoogle\s+the\b/i.test(m) ||
    /\bsearch\s+the\s+(web|internet)\b/i.test(m) ||
    /\bweb\s+search\b/i.test(m) ||
    /\bsearch\s+online\b/i.test(m) ||
    /\blook\s+(this\s+)?up\s+on\s+the\s+web\b/i.test(m) ||
    /\b(can\s+you\s+)?google\s+this\b/i.test(m) ||
    /\bfind\s+(this\s+)?(on\s+)?(the\s+)?web\b/i.test(m) ||
    /\blook\s+up\s+online\b/i.test(m)
  ) {
    return true;
  }

  if (
    /\b(competitor|competitors|competitive|competition|vs\.?\s+\w|versus\s+\w|benchmark|market\s+share|industry\s+trend|peer\s+group|alternative\s+to)\b/i.test(m)
  ) {
    return true;
  }

  if (/\b(latest\s+news|breaking\s+news|press\s+release|announced\s+today|what\s+happened\s+to)\b/i.test(m)) {
    return true;
  }

  if (/\b(research\s+online|dig\s+online|check\s+online|public\s+information\s+on)\b/i.test(m)) {
    return true;
  }

  if (/\b(who\s+is|what\s+is)\s+[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,3}\b/.test(m)) {
    return true;
  }

  if (
    replyContract === "strategic_plan" &&
    /\b(competitor|competitive|market|benchmark|industry|landscape|positioning|pricing\s+in\s+the\s+market)\b/i.test(m)
  ) {
    return true;
  }

  return false;
}

/** @deprecated use shouldFetchPublicWebContext */
export function shouldAttachPublicWebSnapshot(message: string): boolean {
  return shouldFetchPublicWebContext(message, "direct");
}

export function extractWebSearchQuery(message: string): string {
  const stripped = message
    .replace(/\b(please|can you|could you|google search|search the web|web search|search online|for me|look up)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, 280);
}

type FirecrawlSearchRow = {
  url?: string;
  title?: string;
  markdown?: string;
  description?: string;
};

async function fetchFirecrawlWebResearch(query: string): Promise<string> {
  const key = Deno.env.get("FIRECRAWL_API_KEY")?.trim();
  if (!key) return "";

  const q = query.trim().slice(0, 400);
  if (!q) return "";

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: q,
        limit: 5,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      }),
    });

    if (!res.ok) {
      console.warn("[public-web] Firecrawl search HTTP", res.status);
      return "";
    }

    const json = (await res.json()) as { data?: FirecrawlSearchRow[]; success?: boolean };
    const rows = Array.isArray(json?.data) ? json.data : [];
    if (rows.length === 0) return "";

    const parts: string[] = [];
    for (const r of rows) {
      const url = (r.url || "").trim();
      const title = (r.title || url || "Result").trim();
      const body = (r.markdown || r.description || "").toString().replace(/\s+/g, " ").trim().slice(0, 4000);
      if (!url && !body) continue;
      parts.push(`### ${title}\n**URL:** ${url || "—"}\n\n${body || "(no extracted text)"}`);
    }

    const blob = parts.join("\n\n---\n\n").trim();
    return blob.length > 80 ? blob : "";
  } catch (e) {
    console.warn("[public-web] Firecrawl error", (e as Error)?.message || e);
    return "";
  }
}

async function fetchWikipediaContext(query: string): Promise<string> {
  const q = query.trim().slice(0, 200);
  if (!q) return "";
  try {
    const osUrl =
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=2&namespace=0&format=json`;
    const osRes = await fetch(osUrl, { headers: { "User-Agent": "TimewarpAssistant/1.0 (contact: support)" } });
    if (!osRes.ok) return "";
    const data = (await osRes.json()) as [unknown, string[], unknown, string[]];
    const titles = data[1];
    if (!Array.isArray(titles) || titles.length === 0) return "";

    const parts: string[] = [];
    for (const title of titles.slice(0, 2)) {
      const enc = encodeURIComponent(title.replace(/ /g, "_"));
      const sr = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${enc}`, {
        headers: { "User-Agent": "TimewarpAssistant/1.0 (contact: support)" },
      });
      if (!sr.ok) continue;
      const j = (await sr.json()) as { extract?: string; title?: string };
      if (j.extract) parts.push(`### ${j.title || title}\n${j.extract}`);
    }
    return parts.join("\n\n").slice(0, 8000);
  } catch {
    return "";
  }
}

async function fetchDuckDuckGoBlob(query: string): Promise<string> {
  const q = query.trim();
  if (!q) return "";

  const url =
    `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1&no_redirect=1`;
  const res = await fetch(url, { headers: { "User-Agent": "TimewarpAssistant/1.0 (contact: support)" } });
  if (!res.ok) return "";

  const data = (await res.json()) as {
    AbstractText?: string;
    Heading?: string;
    RelatedTopics?: Array<string | { Text?: string; FirstURL?: string }>;
    Results?: Array<{ Text?: string; FirstURL?: string }>;
  };

  const parts: string[] = [];
  if (data.Heading && data.AbstractText) {
    parts.push(`### ${data.Heading}\n${data.AbstractText}`);
  } else if (data.AbstractText) {
    parts.push(data.AbstractText);
  }

  if (Array.isArray(data.RelatedTopics)) {
    for (const t of data.RelatedTopics.slice(0, 10)) {
      if (typeof t === "string") parts.push(t);
      else if (t?.Text) parts.push(t.Text);
    }
  }
  if (Array.isArray(data.Results)) {
    for (const r of data.Results.slice(0, 8)) {
      if (r?.Text && r?.FirstURL) parts.push(`- ${r.Text} (${r.FirstURL})`);
      else if (r?.Text) parts.push(`- ${r.Text}`);
    }
  }

  let blob = parts.join("\n\n").trim();
  if (!blob || blob.length < 40) {
    const wiki = await fetchWikipediaContext(q);
    if (wiki) blob = `### Wikipedia (fallback)\n${wiki}`;
  }
  return blob;
}

/**
 * Returns markdown for the External tier. Prefers Firecrawl when configured.
 */
export async function fetchPublicWebSnapshot(query: string): Promise<string> {
  const q = query.trim();
  if (!q) return "";

  const firecrawl = await fetchFirecrawlWebResearch(q);
  if (firecrawl) {
    return (
      `## Firecrawl web research\n` +
      `The following excerpts come from **Firecrawl** search + page scrape. Cite URLs below; do not invent sources.\n\n` +
      firecrawl.slice(0, 14_000)
    );
  }

  try {
    const blob = await fetchDuckDuckGoBlob(q);
    if (blob) {
      return (
        `## Web snapshot (fallback — no Firecrawl results)\n` +
        `Firecrawl was unavailable or returned no results; using DuckDuckGo / Wikipedia. Label uncertainty; do not invent URLs.\n\n` +
        blob.slice(0, 12_000)
      );
    }
  } catch {
    const wiki = await fetchWikipediaContext(q);
    if (wiki) {
      return (
        `## Web snapshot (fallback — Wikipedia only)\n\n` +
        wiki.slice(0, 12_000)
      );
    }
  }

  const hasKey = !!Deno.env.get("FIRECRAWL_API_KEY")?.trim();
  if (!hasKey) {
    return (
      "(No web research retrieved: **FIRECRAWL_API_KEY** is not set on the server. " +
      "Configure it for Firecrawl search; until then external claims should be labeled uncertain.)"
    );
  }

  return "(No web snapshot returned — say you could not retrieve live web results and avoid inventing URLs or quotes.)";
}
