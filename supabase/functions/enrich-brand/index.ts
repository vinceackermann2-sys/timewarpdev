import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Helper: call AI gateway ── */
async function callAI(apiKey: string, prompt: string, model = "google/gemini-2.5-flash"): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`AI call failed: ${res.status}`);
  const d = await res.json();
  return d.choices?.[0]?.message?.content || "";
}

/* ── Helper: extract SVG from AI response ── */
function extractSvg(raw: string): string | null {
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : null;
}

/* ── Helper: retry wrapper with exponential backoff for 429s ── */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      if (e?.status === 429 && attempt < maxRetries) {
        const delay = Math.min(2000 * Math.pow(2, attempt), 15000);
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Max retries exceeded");
}

/* ── Helper: generate image via AI gateway ── */
async function generateImage(apiKey: string, prompt: string): Promise<string | null> {
  try {
    return await withRetry(async () => {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
      if (res.status === 429) { const err: any = new Error("Rate limited"); err.status = 429; throw err; }
      if (!res.ok) { console.warn("Image gen failed:", res.status); return null; }
      const d = await res.json();
      const images = d.choices?.[0]?.message?.images;
      if (!images?.length) return null;
      const imageUrl = images[0].image_url?.url;
      if (!imageUrl) return null;
      if (imageUrl.startsWith("data:")) return imageUrl;
      return `data:image/png;base64,${imageUrl}`;
    });
  } catch (e) { console.warn("Image generation error:", e); return null; }
}

/* ── Helper: edit image with product via AI gateway ── */
async function editImageWithProduct(apiKey: string, prompt: string, productImageUrl: string): Promise<string | null> {
  try {
    return await withRetry(async () => {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: productImageUrl } },
            ],
          }],
          modalities: ["image", "text"],
        }),
      });
      if (res.status === 429) { const err: any = new Error("Rate limited"); err.status = 429; throw err; }
      if (!res.ok) { console.warn("Image edit failed:", res.status); return null; }
      const d = await res.json();
      const images = d.choices?.[0]?.message?.images;
      if (!images?.length) return null;
      const imageUrl = images[0].image_url?.url;
      if (!imageUrl) return null;
      if (imageUrl.startsWith("data:")) return imageUrl;
      return `data:image/png;base64,${imageUrl}`;
    });
  } catch (e) { console.warn("Image edit error:", e); return null; }
}

/* ── Helper: parse JSON array from AI text ── */
function parseStringArray(raw: string): string[] {
  if (!raw) return [];
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const s = cleaned.indexOf("[");
  const e = cleaned.lastIndexOf("]");
  if (s === -1 || e === -1 || e <= s) return [];
  try {
    const parsed = JSON.parse(cleaned.slice(s, e + 1));
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
  } catch { return []; }
}

function cleanMoodboardToken(value: string, fallback: string): string {
  const cleaned = value
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .replace(/[{}\[\]"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[,:;\-\s]+|[,:;\-\s]+$/g, "");

  return cleaned || fallback;
}

function parseMoodboardFormula(raw: string, fallbackTrust: string, fallbackFeeling: string): { trust: string; feeling: string } {
  if (!raw?.trim()) {
    return { trust: fallbackTrust, feeling: fallbackFeeling };
  }

  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      trust: cleanMoodboardToken(String(parsed?.trust || ""), fallbackTrust),
      feeling: cleanMoodboardToken(String(parsed?.feeling || ""), fallbackFeeling),
    };
  } catch {
    const trustMatch = cleaned.match(/"trust"\s*:\s*"([^"]+)"/i) || cleaned.match(/trust\s*[:=-]\s*([^\n,}]+)/i);
    const feelingMatch = cleaned.match(/"feeling"\s*:\s*"([^"]+)"/i) || cleaned.match(/feeling\s*[:=-]\s*([^\n}]+)/i);

    return {
      trust: cleanMoodboardToken(trustMatch?.[1] || "", fallbackTrust),
      feeling: cleanMoodboardToken(feelingMatch?.[1] || "", fallbackFeeling),
    };
  }
}

function inferTrustObject(category: string, audienceDesc: string, productBenefits: string, buyingTriggers: string): string {
  const text = `${category} ${audienceDesc} ${productBenefits} ${buyingTriggers}`.toLowerCase();

  if (/(fitness|recovery|athlet|wellness|performance|sport)/.test(text)) return "Garmin";
  if (/(beauty|skincare|hair|cosmetic|self-care)/.test(text)) return "Aesop";
  if (/(home|interior|kitchen|appliance|clean)/.test(text)) return "Dyson";
  if (/(baby|kids|parent|family)/.test(text)) return "Stokke";
  if (/(fashion|apparel|minimal|luxury|travel|luggage)/.test(text)) return "Rimowa";
  if (/(car|automotive|ev|mobility)/.test(text)) return "Tesla";
  if (/(outdoor|adventure|trail|hiking)/.test(text)) return "Patagonia";
  return "iPhone";
}

function inferFeelingAndColor(
  audienceDesc: string,
  powerWords: string,
  productBenefits: string,
  buyingTriggers: string,
  brandColorPrimary?: string,
  brandColorSecondary?: string,
): string {
  const text = `${audienceDesc} ${powerWords} ${productBenefits} ${buyingTriggers}`.toLowerCase();

  let emotion = "premium+minimal";
  if (/(future|tech|innovation|smart|modern)/.test(text)) emotion = "tech+futuristic";
  else if (/(calm|recovery|restore|relief|balance)/.test(text)) emotion = "restored+calm";
  else if (/(luxury|elite|exclusive|premium)/.test(text)) emotion = "refined+exclusive";
  else if (/(energy|active|performance|boost|speed)/.test(text)) emotion = "energized+high-performance";
  else if (/(safe|trust|protect|secure)/.test(text)) emotion = "secure+trustworthy";

  const colorTerms = [brandColorPrimary, brandColorSecondary]
    .filter((value): value is string => Boolean(value))
    .map(getColorFeeling)
    .filter(Boolean);

  const colorPhrase = [...new Set(colorTerms)].slice(0, 2).join(" and ") || "clean neutrals";
  return `${emotion}, ${colorPhrase}`;
}

function normalizeMoodboardQuery(query: string): string {
  return query.replace(/[,+]/g, " ").replace(/\s+/g, " ").trim();
}

function keywordizeMoodboardPhrase(value: string, maxWords = 6): string {
  const stopwords = new Set([
    "and", "the", "with", "premium", "minimal", "ecommerce", "branding", "moodboard", "design",
    "deep", "soft", "clean", "neutrals",
  ]);

  return normalizeMoodboardQuery(value)
    .split(" ")
    .filter((token) => token.length > 2 && !stopwords.has(token))
    .slice(0, maxWords)
    .join(" ");
}

function buildMoodboardQueries(trustCandidates: string[], feelingAndColor: string): string[] {
  const feelingKeywords = keywordizeMoodboardPhrase(feelingAndColor, 5) || "premium minimal";
  const queries: string[] = [];

  for (const trust of trustCandidates) {
    queries.push(normalizeMoodboardQuery(`${trust} ${feelingAndColor} premium minimal ecommerce`));
    queries.push(normalizeMoodboardQuery(`${trust} ${feelingKeywords} premium minimal ecommerce website design`));
    queries.push(normalizeMoodboardQuery(`${trust} ${feelingKeywords} premium minimal ecommerce product page`));
  }

  return [...new Set(queries)].slice(0, 6);
}

const ALLOWED_LUCIDE_ICON_NAMES = [
  "Activity",
  "ArrowUpRight",
  "Circle",
  "Clock3",
  "Droplets",
  "Dumbbell",
  "Gem",
  "Heart",
  "HeartPulse",
  "Infinity",
  "Leaf",
  "Rocket",
  "Shield",
  "Sparkles",
  "Star",
  "Sun",
  "Target",
  "TrendingUp",
  "Waves",
  "Zap",
] as const;

const ALLOWED_LUCIDE_ICON_SET = new Set<string>(ALLOWED_LUCIDE_ICON_NAMES);

const BLOCKED_PINTEREST_ASSET_KEYS = new Set<string>([
  "d5/3b/01/d53b014d86a6b6761bf649a0ed813c2b.png",
]);

function normalizePascalCase(value: string): string {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

function canonicalizePinterestUrl(url: string): string | null {
  const clean = url
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .split(/\s+/)[0]
    .trim();

  const match = clean.match(/https?:\/\/i\.pinimg\.com\/(?:\d+x|originals)\/([^?]+\.(?:jpg|jpeg|png|webp))/i);
  if (!match) return null;
  return `https://i.pinimg.com/originals/${match[1]}`;
}

function getPinterestAssetKey(url: string): string | null {
  const normalized = canonicalizePinterestUrl(url);
  if (!normalized) return null;
  return normalized.replace(/^https?:\/\/i\.pinimg\.com\/originals\//i, "").split("?")[0].toLowerCase();
}

function isValidPinterestMoodboardUrl(url: string): boolean {
  const assetKey = getPinterestAssetKey(url);
  if (!assetKey) return false;
  if (BLOCKED_PINTEREST_ASSET_KEYS.has(assetKey)) return false;

  const ext = assetKey.split(".").pop()?.toLowerCase();
  if (!ext || !["jpg", "jpeg", "webp", "png"].includes(ext)) return false;

  return true;
}

function extractPinterestUrls(raw: string): string[] {
  if (!raw) return [];
  const decoded = raw.replace(/\\u002F/g, "/").replace(/\\\//g, "/");
  const regex = /https?:\/\/i\.pinimg\.com\/(?:\d+x|originals)\/[A-Za-z0-9/_%.-]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>\\,]+)?/gi;
  const matches = decoded.match(regex) || [];
  const deduped = new Map<string, string>();

  for (const match of matches) {
    const normalized = canonicalizePinterestUrl(match);
    if (!normalized) continue;
    const assetKey = normalized.replace(/^https?:\/\/i\.pinimg\.com\/originals\//i, "").split("?")[0];
    if (!isValidPinterestMoodboardUrl(normalized)) continue;
    if (!deduped.has(assetKey)) deduped.set(assetKey, normalized);
  }

  return [...deduped.values()].slice(0, 24);
}

function extractPinterestPageUrls(payload: unknown): string[] {
  const urls = new Set<string>();

  const visit = (value: unknown) => {
    if (!value) return;

    if (typeof value === "string") {
      const matches = value.match(/https?:\/\/(?:[\w-]+\.)?pinterest\.[^\s"'<>\\]+/gi) || [];
      for (const match of matches) {
        const clean = match.replace(/[),.;]+$/, "");
        if (
          /\/pin\//i.test(clean) ||
          /\/ideas\//i.test(clean) ||
          /\/search\//i.test(clean) ||
          /^https?:\/\/(?:[\w-]+\.)?pinterest\.[^/]+\/[^/?#]+\/[^/?#]+/i.test(clean)
        ) {
          urls.add(clean);
        }
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach(visit);
    }
  };

  visit(payload);
  return [...urls].slice(0, 8);
}

async function scrapePinterestPageForImages(pinUrl: string, firecrawlKey: string): Promise<string[]> {
  const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url: pinUrl,
      formats: ["rawHtml", "html"],
      waitFor: 7000,
      onlyMainContent: false,
    }),
  });

  if (!scrapeRes.ok) return [];

  const scrapeData = await scrapeRes.json();
  const payload = [
    scrapeData.data?.rawHtml,
    scrapeData.data?.html,
    JSON.stringify(scrapeData.data || scrapeData),
  ].filter(Boolean).join("\n");

  return extractPinterestUrls(payload);
}

async function scrapePinterestSearchPageForImages(query: string, firecrawlKey: string, browserlessKey: string): Promise<string[]> {
  const pinterestUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}&rs=typed`;
  const firecrawlUrls = await scrapePinterestPageForImages(pinterestUrl, firecrawlKey);
  if (firecrawlUrls.length > 0) return firecrawlUrls;
  return scrapePinterestPageForImagesWithBrowserless(pinterestUrl, browserlessKey);
}

async function scrapePinterestPageForImagesWithBrowserless(pinUrl: string, browserlessKey: string): Promise<string[]> {
  if (!browserlessKey) return [];

  const scrapeRes = await fetch(`https://production-sfo.browserless.io/content?token=${encodeURIComponent(browserlessKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: pinUrl }),
  });

  if (!scrapeRes.ok) return [];

  const html = await scrapeRes.text();
  return extractPinterestUrls(html);
}

function mapConceptToLucideIconName(concept: string, index: number): string {
  const normalized = concept.toLowerCase();
  const keywordMap: Array<{ keywords: string[]; icon: string }> = [
    { keywords: ["pulse", "heartbeat", "recovery", "wellness", "health"], icon: "HeartPulse" },
    { keywords: ["flow", "wave", "fluid", "movement"], icon: "Waves" },
    { keywords: ["water", "drop", "hydration"], icon: "Droplets" },
    { keywords: ["strength", "muscle", "power", "training"], icon: "Dumbbell" },
    { keywords: ["protect", "shield", "trust", "safe"], icon: "Shield" },
    { keywords: ["leaf", "natural", "organic"], icon: "Leaf" },
    { keywords: ["arrow", "growth", "progress", "up"], icon: "ArrowUpRight" },
    { keywords: ["trend", "scale", "performance"], icon: "TrendingUp" },
    { keywords: ["infinity", "continuous", "endless"], icon: "Infinity" },
    { keywords: ["heart", "care", "love"], icon: "Heart" },
    { keywords: ["spark", "magic", "ideas", "inspire"], icon: "Sparkles" },
    { keywords: ["star", "premium", "quality"], icon: "Star" },
    { keywords: ["gem", "luxury", "elite"], icon: "Gem" },
    { keywords: ["sun", "energy", "warmth"], icon: "Sun" },
    { keywords: ["rocket", "speed", "launch"], icon: "Rocket" },
    { keywords: ["target", "focus", "precision"], icon: "Target" },
    { keywords: ["clock", "time", "fast"], icon: "Clock3" },
    { keywords: ["circle", "community", "unity"], icon: "Circle" },
    { keywords: ["activity", "motion", "active"], icon: "Activity" },
    { keywords: ["bolt", "zap", "electric", "charge"], icon: "Zap" },
  ];

  for (const entry of keywordMap) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) return entry.icon;
  }

  return ALLOWED_LUCIDE_ICON_NAMES[index % ALLOWED_LUCIDE_ICON_NAMES.length];
}

function buildLucideIconNames(concepts: string[], raw: string): string[] {
  const requested = parseStringArray(raw)
    .map(normalizePascalCase)
    .filter((name) => ALLOWED_LUCIDE_ICON_SET.has(name));

  const result: string[] = [];
  for (const name of requested) {
    if (!result.includes(name)) result.push(name);
    if (result.length === 9) return result;
  }

  for (let i = 0; i < concepts.length; i++) {
    const fallback = mapConceptToLucideIconName(concepts[i], i);
    if (!result.includes(fallback)) result.push(fallback);
    if (result.length === 9) return result;
  }

  for (const fallback of ALLOWED_LUCIDE_ICON_NAMES) {
    if (!result.includes(fallback)) result.push(fallback);
    if (result.length === 9) return result;
  }

  return result.slice(0, 9);
}

/* ── Helper: map hex color to a feeling/color name ── */
function getColorFeeling(hex: string): string {
  const h = hex.replace("#", "").toLowerCase();
  if (!h || h.length < 3) return "";
  const r = parseInt(h.length >= 6 ? h.slice(0, 2) : h[0] + h[0], 16);
  const g = parseInt(h.length >= 6 ? h.slice(2, 4) : h[1] + h[1], 16);
  const b = parseInt(h.length >= 6 ? h.slice(4, 6) : h[2] + h[2], 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  if (l > 0.9) return "white clean";
  if (l < 0.15) return "black dark";
  const sat = (max - min) / 255;
  if (sat < 0.1) return "neutral grey";
  let hue = 0;
  if (max === r) hue = ((g - b) / (max - min)) * 60;
  else if (max === g) hue = (2 + (b - r) / (max - min)) * 60;
  else hue = (4 + (r - g) / (max - min)) * 60;
  if (hue < 0) hue += 360;
  if (hue < 30) return "red bold";
  if (hue < 60) return "orange warm";
  if (hue < 90) return "yellow bright";
  if (hue < 150) return "green natural";
  if (hue < 210) return "blue calm";
  if (hue < 270) return "purple creative";
  if (hue < 330) return "pink soft";
  return "red bold";
}

/* ── Moodboard: scrape real Pinterest image URLs from srcset/raw HTML ── */
async function fetchMoodboardImages(
  brandName: string, category: string, audienceDesc: string,
  firecrawlKey: string, browserlessKey: string,
  powerWords?: string, brandColorPrimary?: string, brandColorSecondary?: string,
  productBenefits?: string, buyingTriggers?: string, aiApiKey?: string
): Promise<{ urls: string[]; searchUrls: string[] }> {
  // Use AI to derive: trust object (physical thing audience trusts) + feeling + color description
  const fallbackTrustObject = inferTrustObject(category, audienceDesc, productBenefits || "", buyingTriggers || "");
  const fallbackFeelingAndColor = inferFeelingAndColor(
    audienceDesc,
    powerWords || "",
    productBenefits || "",
    buyingTriggers || "",
    brandColorPrimary,
    brandColorSecondary,
  );

  let trustObject = fallbackTrustObject;
  let feelingAndColor = fallbackFeelingAndColor;

  if (aiApiKey) {
    try {
      const moodboardPromptRaw = await callAI(aiApiKey,
        `You are building a Pinterest moodboard search query for a brand.

Brand: "${brandName}", Category: "${category}"
Audience: ${audienceDesc || "general consumers"}
Power words: ${powerWords || "quality"}
Product benefits: ${productBenefits || "convenience"}
Buying triggers: ${buyingTriggers || "trust"}
Brand primary color: ${brandColorPrimary || "#333"}
Brand secondary color: ${brandColorSecondary || "#666"}

Answer these two questions in JSON format:
1. "trust": What is ONE specific physical product or brand that this audience already trusts and aspires to? (e.g. "iPhone" for tech-savvy consumers, "Tesla" for eco-luxury, "Dyson" for design-conscious homeowners, "Aesop" for minimalist skincare lovers). Pick something iconic that represents their taste level.
2. "feeling": A short phrase combining the emotional desire of the audience with a color/visual description from the brand colors (e.g. "tech+futuristic, optimistic gradients" or "earthy+warm, muted earth tones" or "luxurious+bold, deep navy and gold"). Include the color aesthetic.

Return ONLY valid JSON like: {"trust":"iPhone","feeling":"tech+futuristic, optimistic gradients"}
No explanation.`,
        "google/gemini-2.5-flash-lite"
      );

      const parsedFormula = parseMoodboardFormula(moodboardPromptRaw, fallbackTrustObject, fallbackFeelingAndColor);
      trustObject = parsedFormula.trust;
      feelingAndColor = parsedFormula.feeling;
      console.log("Moodboard formula:", { trustObject, feelingAndColor });
    } catch (e) {
      console.warn("AI moodboard query generation failed, using defaults:", e);
    }
  }

  // Generate 6 diverse queries using AI so each returns a unique image
  let queries: string[] = [];
  if (aiApiKey) {
    try {
      const queriesRaw = await callAI(aiApiKey,
        `Generate exactly 6 different Pinterest search queries for a brand moodboard.

Brand: "${brandName}", Category: "${category}"
Trust object (a physical brand/product the audience trusts): "${trustObject}"
Feeling + color: "${feelingAndColor}"

Each query MUST follow this formula: (trust object) + (feeling/emotion + color) + "premium minimal ecommerce"

Rules:
- Each query should target a DIFFERENT visual angle (e.g. product photography, lifestyle, packaging, interior, texture, typography)
- Keep queries short (5-8 words max)
- Include the trust object or a close alternative in each
- Include a color or mood word in each
- Always end with "premium minimal ecommerce"

Example for Tesla:
["Tesla futuristic white premium minimal ecommerce", "iPhone sleek dark gradients premium minimal ecommerce", "Tesla interior minimalist grey premium minimal ecommerce", "Rivian outdoor adventure green premium minimal ecommerce", "Tesla packaging clean black premium minimal ecommerce", "Apple product photography warm premium minimal ecommerce"]

Return ONLY a JSON array of 6 strings. No explanation.`,
        "google/gemini-2.5-flash-lite"
      );
      queries = parseStringArray(queriesRaw).slice(0, 6);
    } catch (e) {
      console.warn("AI query generation failed:", e);
    }
  }

  // Fallback if AI didn't return 6 queries
  if (queries.length < 6) {
    const feelingKeywords = keywordizeMoodboardPhrase(feelingAndColor, 3);
    const base = [
      `${trustObject} ${feelingKeywords} premium minimal ecommerce`,
      `${trustObject} product photography premium minimal ecommerce`,
      `${trustObject} lifestyle ${feelingKeywords} premium minimal ecommerce`,
      `${trustObject} packaging clean premium minimal ecommerce`,
      `${trustObject} interior ${feelingKeywords} premium minimal ecommerce`,
      `${trustObject} texture ${feelingKeywords} premium minimal ecommerce`,
    ].map(normalizeMoodboardQuery);
    while (queries.length < 6 && base.length > 0) {
      const q = base.shift()!;
      if (!queries.includes(q)) queries.push(q);
    }
  }

  console.log("Moodboard queries:", queries);

  const seenAssetKeys = new Set<string>();

  const addUnique = (url: string): string | null => {
    const normalized = canonicalizePinterestUrl(url);
    if (!normalized || !isValidPinterestMoodboardUrl(normalized)) return null;
    const assetKey = normalized.replace(/^https?:\/\/i\.pinimg\.com\/originals\//i, "").split("?")[0];
    if (seenAssetKeys.has(assetKey)) return null;
    seenAssetKeys.add(assetKey);
    return normalized;
  };

  // Run all 6 queries in parallel, collect ALL valid unique images from each
  const perQueryResults = await Promise.allSettled(
    queries.map(async (query, qi): Promise<string[]> => {
      const shortQuery = query
        .replace(/premium\s+minimal\s+ecommerce/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      const found: string[] = [];

      // Strategy 1: Direct Firecrawl scrape of Pinterest search page
      try {
        const pinterestUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(shortQuery)}`;
        console.log(`Query ${qi + 1}: scraping Pinterest search: "${shortQuery}"`);
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            url: pinterestUrl,
            formats: ["rawHtml", "html"],
            waitFor: 7000,
            onlyMainContent: false,
          }),
        });

        if (scrapeRes.ok) {
          const scrapeData = await scrapeRes.json();
          const html = [
            scrapeData.data?.rawHtml,
            scrapeData.data?.html,
            scrapeData.rawHtml,
            scrapeData.html,
            JSON.stringify(scrapeData.data || scrapeData),
          ].filter(Boolean).join("\n");
          const urls = extractPinterestUrls(html);
          if (urls.length > 0) {
            console.log(`Query ${qi + 1}: Firecrawl scrape found ${urls.length} pinimg URLs`);
            for (const u of urls) { const n = addUnique(u); if (n) found.push(n); }
          }
        }
      } catch (e) { console.warn(`Query ${qi + 1} Firecrawl scrape failed:`, e); }

      // Strategy 2: Browserless direct Pinterest scrape
      if (found.length === 0) {
        try {
          const bUrls = await scrapePinterestPageForImagesWithBrowserless(
            `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(shortQuery)}&rs=typed`,
            browserlessKey
          );
          if (bUrls.length > 0) {
            console.log(`Query ${qi + 1}: browserless found ${bUrls.length} URLs`);
            for (const u of bUrls) { const n = addUnique(u); if (n) found.push(n); }
          }
        } catch { /* continue */ }
      }

      // Strategy 3: Firecrawl search API as fallback
      if (found.length === 0) {
        try {
          const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query: `${shortQuery} site:pinterest.com`, limit: 5 }),
          });

          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const pinUrls = extractPinterestUrls(JSON.stringify(searchData));
            if (pinUrls.length > 0) {
              console.log(`Query ${qi + 1}: search API found pinimg URLs`);
              for (const u of pinUrls) { const n = addUnique(u); if (n) found.push(n); }
            }

            if (found.length === 0) {
              const pageUrls = extractPinterestPageUrls(searchData.data || searchData).slice(0, 3);
              for (const pageUrl of pageUrls) {
                try {
                  const pinPageUrls = await scrapePinterestPageForImages(pageUrl, firecrawlKey);
                  for (const u of pinPageUrls) { const n = addUnique(u); if (n) found.push(n); }
                  if (found.length > 0) break;
                } catch { /* continue */ }
              }
            }
          }
        } catch { /* continue */ }
      }

      if (found.length === 0) console.log(`Query ${qi + 1}: no images found for "${shortQuery}"`);
      else console.log(`Query ${qi + 1}: collected ${found.length} unique images`);
      return found;
    })
  );

  // Phase 1: Take exactly 1 image from each query (guarantees diversity)
  const perQuery: string[][] = perQueryResults.map(r => r.status === "fulfilled" ? r.value : []);
  const allUrls: string[] = [];
  const usedPerQuery: number[] = perQuery.map(() => 0);

  // First pass: 1 image per query
  for (let qi = 0; qi < perQuery.length && allUrls.length < 6; qi++) {
    if (perQuery[qi].length > 0) {
      allUrls.push(perQuery[qi][0]);
      usedPerQuery[qi] = 1;
    }
  }

  // Second pass: backfill remaining slots from queries that had extra images
  if (allUrls.length < 6) {
    for (let qi = 0; qi < perQuery.length && allUrls.length < 6; qi++) {
      for (let i = usedPerQuery[qi]; i < perQuery[qi].length && allUrls.length < 6; i++) {
        if (!allUrls.includes(perQuery[qi][i])) {
          allUrls.push(perQuery[qi][i]);
        }
      }
    }
  }

  const searchUrls = queries.map(q => `pinterest.com/search/pins/?q=${encodeURIComponent(q.replace(/premium\s+minimal\s+ecommerce/gi, "").replace(/\s+/g, " ").trim())}`);
  console.log(`Moodboard total unique images: ${allUrls.length} (from ${perQuery.filter(q => q.length > 0).length}/6 queries)`);
  return { urls: allUrls.slice(0, 6), searchUrls };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { brandRowId, brandName, brandCategory, brandColors, audienceDesc, audiencePowerWords, productBenefits, buyingTriggers, websiteUrl, productImageUrls } = await req.json();

    if (!brandRowId) {
      return new Response(JSON.stringify({ success: false, error: "brandRowId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";
    const BROWSERLESS_API_KEY = Deno.env.get("BROWSERLESS_API_KEY") || "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Read existing brand content
    const { data: row, error: readErr } = await supabase.from("user_business_data").select("content").eq("id", brandRowId).single();
    if (readErr || !row) {
      console.error("Could not read brand row:", readErr?.message);
      return new Response(JSON.stringify({ success: false, error: "Brand row not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let brandContent: any = {};
    try { brandContent = JSON.parse(row.content || "{}"); } catch { brandContent = {}; }

    const vi = brandContent.visualIdentity || {};
    const enriched: Record<string, any> = {};
    const analyzedUrls: string[] = [];
    const name = brandName || brandContent.name || "the brand";
    const cat = brandCategory || brandContent.category || "lifestyle";
    const colors = brandColors || brandContent.colors || {};
    const primary = colors.primary || "#333333";
    const secondary = colors.secondary || "#666666";

    // ── Pipeline 1: Moodboard (Pinterest via search) ──
    const moodboardPipeline = (async () => {
      if (!FIRECRAWL_API_KEY) { console.warn("No FIRECRAWL_API_KEY, skipping moodboard"); return; }
      try {
        console.log("Starting moodboard pipeline...");
        const result = await fetchMoodboardImages(name, cat, audienceDesc || "", FIRECRAWL_API_KEY, BROWSERLESS_API_KEY, audiencePowerWords || "", primary, secondary, productBenefits || "", buyingTriggers || "", LOVABLE_API_KEY);
        enriched.moodboardUrls = result.urls;
        for (const su of result.searchUrls) { analyzedUrls.push(su); }
        console.log("Moodboard enriched:", result.urls.length, "images");
      } catch (e) { console.error("Moodboard pipeline error:", e); enriched.moodboardUrls = []; }
    })();

    // ── Pipeline 2: 9 Lucide icon names + 1 code-generated pattern SVG ──
    const illustrationPipeline = (async () => {
      if (!LOVABLE_API_KEY) { console.warn("No LOVABLE_API_KEY, skipping illustrations"); return; }
      analyzedUrls.push("ai.gateway/illustrations");
      try {
        console.log("Generating icon concepts...");
        // Get 9 concepts from AI
        const benefits = productBenefits || "quality, convenience, value";
        const triggers = buyingTriggers || "ease of use, time saving";
        const power = audiencePowerWords || "trust, quality";

        const conceptsRaw = await callAI(LOVABLE_API_KEY,
          `Generate exactly 9 single-word or two-word icon concepts for a brand called "${name}" in the ${cat} category.\n\nProduct benefits: ${benefits}\nAudience triggers: ${triggers}\nPower words: ${power}\n\nThese will be turned into simple SVG icons. Each concept should be a concrete visual object (e.g. "shield", "leaf", "clock", "heart", "star", "rocket", "diamond", "globe", "lightning").\n\nReturn ONLY a JSON array of 9 strings. No explanation.`,
          "google/gemini-2.5-flash-lite"
        );

        let concepts = parseStringArray(conceptsRaw);
        if (concepts.length < 9) {
          concepts = ["shield", "star", "heart", "leaf", "clock", "diamond", "globe", "rocket", "lightning"].slice(0, 9);
        }
        concepts = concepts.slice(0, 9);
        console.log("Icon concepts:", concepts);

        const iconNamesRaw = await callAI(
          LOVABLE_API_KEY,
          `Choose exactly 9 Lucide icon names for a brand called "${name}" in the ${cat} category.\n\nConcepts: ${concepts.join(", ")}\nProduct benefits: ${benefits}\nAudience triggers: ${triggers}\nPower words: ${power}\n\nYou MUST choose from this allowlist only:\n${ALLOWED_LUCIDE_ICON_NAMES.join(", ")}\n\nRules:\n- Return exactly 9 names\n- Prefer unique names\n- Match each icon semantically to the concepts and business data\n- Return ONLY a JSON array of strings with exact icon names from the allowlist\n- No explanation, no markdown.`,
          "google/gemini-2.5-flash-lite"
        );

        const illustrationIconNames = buildLucideIconNames(concepts, iconNamesRaw);
        enriched.illustrationIconNames = illustrationIconNames;
        enriched.iconConcepts = concepts;
        console.log("Lucide icons enriched:", illustrationIconNames);

        // Generate 1 header-shaped SVG pattern
        const patternRaw = await callAI(LOVABLE_API_KEY,
          `Generate a complete, valid SVG string (viewBox="0 0 1200 200") that looks like a website header banner shape.\n\nBrand: "${name}", category: ${cat}\nPrimary color: ${primary}\nSecondary color: ${secondary}\nBackground: ${colors.background || "#ffffff"}\n\nRequirements:\n- Design a website header/banner shape with a decorative bottom edge (curved wave, diagonal cut, or organic flowing shape)\n- Fill the shape with a gradient using brand colors (primary to secondary)\n- Add subtle decorative elements inside (dots, lines, circles, abstract shapes)\n- The top should be flat/rectangular, the bottom should have an interesting curved or angled edge\n- Use <defs> with linearGradient\n- NO <text> tags, NO letters, NO words\n- Modern, clean, premium feel\n- Use only the brand color palette\n\nReturn ONLY the raw SVG string starting with <svg and ending with </svg>. No markdown.`
        );
        const patternSvg = extractSvg(patternRaw);
        if (patternSvg) {
          enriched.patternSvg = patternSvg;
          console.log("✓ Pattern SVG generated");
        }

        if (illustrationIconNames.length > 0 || patternSvg) {
          console.log("Illustrations enriched:", illustrationIconNames.length + (patternSvg ? 1 : 0));
        }
      } catch (e) { console.error("Illustration pipeline error:", e); }
    })();

    // ── Pipeline 3: Website Screenshot ──
    const screenshotPipeline = (async () => {
      if (!FIRECRAWL_API_KEY || !websiteUrl) { console.warn("No FIRECRAWL_API_KEY or websiteUrl, skipping screenshot"); return; }
      try {
        let formattedUrl = websiteUrl.trim();
        if (!formattedUrl.startsWith("http")) formattedUrl = `https://${formattedUrl}`;
        console.log("Capturing website screenshot:", formattedUrl);
        analyzedUrls.push(formattedUrl);

        const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: formattedUrl, formats: ["screenshot"] }),
        });

        if (res.ok) {
          const data = await res.json();
          const screenshot = data.data?.screenshot || data.screenshot;
          if (screenshot) {
            enriched.websiteScreenshot = screenshot.startsWith("http") ? screenshot : `data:image/png;base64,${screenshot}`;
            console.log("✓ Website screenshot captured");
          }
        }
      } catch (e) { console.error("Screenshot pipeline error:", e); }
    })();

    // ── Pipeline 4: Image Guideline Images (using actual product images) ──
    const guidelineImagePipeline = (async () => {
      if (!LOVABLE_API_KEY) { console.warn("No LOVABLE_API_KEY, skipping guideline images"); return; }
      try {
        console.log("Generating guideline images...");
        const guidelines = vi.imageGuidelines || brandContent.visualIdentity?.imageGuidelines || [];
        const guidelineRules: string[] = Array.isArray(guidelines)
          ? guidelines.map((g: any) => typeof g === "string" ? g : g?.rule || "").filter(Boolean)
          : [];

        if (guidelineRules.length === 0) {
          console.log("No image guidelines to generate images for");
          return;
        }

        const productImgs: string[] = Array.isArray(productImageUrls) ? productImageUrls.filter((u: string) => typeof u === "string" && u.length > 0) : [];
        const primaryProductImg = productImgs[0] || null;

        const urls: string[] = [];
        for (let i = 0; i < guidelineRules.length; i++) {
          const rule = guidelineRules[i];
          let img: string | null = null;

          if (primaryProductImg) {
            // Use the actual product image — edit it to demonstrate the guideline
            img = await editImageWithProduct(LOVABLE_API_KEY,
              `Create a professional product photography example that demonstrates this brand guideline: "${rule}".
Brand: "${name}", Category: ${cat}.
Primary color: ${primary}, Secondary color: ${secondary}.
IMPORTANT: Use the provided product image as the MAIN subject. Place it in a setting that demonstrates the guideline rule.
Style: Premium, clean, minimal e-commerce product photography.
The product in the provided image MUST be the focal point. Do NOT replace it with a different product.
No text overlays.`,
              primaryProductImg
            );
          }

          // Fallback to plain generation if edit failed
          if (!img) {
            img = await generateImage(LOVABLE_API_KEY,
              `Create a small product photography example image for this brand guideline rule: "${rule}".
Brand: "${name}", Category: ${cat}.
Primary color: ${primary}, Secondary color: ${secondary}.
Style: Premium, clean, minimal e-commerce product photography.
The image should visually demonstrate the guideline rule as an example photo.
Make it look like a real professional product photograph. No text overlays.`
            );
          }
          urls.push(img || "");
          if (i < guidelineRules.length - 1) {
            await new Promise(r => setTimeout(r, 500));
          }
        }
        enriched.guidelineImageUrls = urls;
        console.log("Guideline images generated:", urls.filter(Boolean).length);
      } catch (e) { console.error("Guideline image pipeline error:", e); }
    })();

    // ── Pipeline 5: Social Media Images (Feed + Story) using actual product ──
    const socialMediaPipeline = (async () => {
      if (!LOVABLE_API_KEY) { console.warn("No LOVABLE_API_KEY, skipping social media images"); return; }
      try {
        console.log("Generating social media mockup images...");
        const productImgs: string[] = Array.isArray(productImageUrls) ? productImageUrls.filter((u: string) => typeof u === "string" && u.length > 0) : [];
        const primaryProductImg = productImgs[0] || null;

        let feedImg: string | null = null;
        if (primaryProductImg) {
          feedImg = await editImageWithProduct(LOVABLE_API_KEY,
            `Create a premium Instagram feed post (square 1:1 format) for a brand called "${name}" in the ${cat} category.
Primary color: ${primary}, Secondary color: ${secondary}.
IMPORTANT: Use the provided product image as the MAIN subject of the post. Feature it prominently.
Style: Clean, premium, minimal e-commerce aesthetic.
The product MUST be clearly visible and be the hero of the image. Do NOT replace it with a different product.
Professional photography style, branded color palette. No text overlays, no UI chrome.`,
            primaryProductImg
          );
        }
        if (!feedImg) {
          feedImg = await generateImage(LOVABLE_API_KEY,
            `Create a premium Instagram feed post mockup for a brand called "${name}" in the ${cat} category.
Primary color: ${primary}, Secondary color: ${secondary}.
Style: Clean, premium, minimal e-commerce aesthetic.
Show a product-focused square image that would look great as an Instagram feed post.
Professional photography style, branded color palette. No text overlays, no UI chrome.`
          );
        }

        await new Promise(r => setTimeout(r, 500));

        let storyImg: string | null = null;
        const storyProductImg = productImgs[1] || primaryProductImg;
        if (storyProductImg) {
          storyImg = await editImageWithProduct(LOVABLE_API_KEY,
            `Create a premium Instagram story (vertical 9:16 format) for a brand called "${name}" in the ${cat} category.
Primary color: ${primary}, Secondary color: ${secondary}.
IMPORTANT: Use the provided product image as the MAIN subject. Feature it prominently in a vertical composition.
Style: Clean, premium, minimal e-commerce aesthetic.
The product MUST be clearly visible and be the hero of the image. Do NOT replace it with a different product.
Professional photography style, branded color palette. No text overlays, no UI chrome.`,
            storyProductImg
          );
        }
        if (!storyImg) {
          storyImg = await generateImage(LOVABLE_API_KEY,
            `Create a premium Instagram story mockup (vertical 9:16 format) for a brand called "${name}" in the ${cat} category.
Primary color: ${primary}, Secondary color: ${secondary}.
Style: Clean, premium, minimal e-commerce aesthetic.
Show a vertical product or lifestyle image that would look great as an Instagram story.
Professional photography style, branded color palette. No text overlays, no UI chrome.`
          );
        }

        enriched.socialMediaUrls = [feedImg || "", storyImg || ""];
        console.log("Social media images generated:", [feedImg, storyImg].filter(Boolean).length);
      } catch (e) { console.error("Social media pipeline error:", e); }
    })();

    // Run all five in parallel
    await Promise.allSettled([moodboardPipeline, illustrationPipeline, screenshotPipeline, guidelineImagePipeline, socialMediaPipeline]);

    // Merge into existing visualIdentity
    const updatedVi = { ...vi };
    if (enriched.moodboardUrls?.length > 0) updatedVi.moodboardUrls = enriched.moodboardUrls;
    if (enriched.illustrationIconNames?.length > 0) {
      updatedVi.illustrationIconNames = enriched.illustrationIconNames;
      delete updatedVi.illustrationSvgs;
    }
    if (enriched.patternSvg) updatedVi.patternSvg = enriched.patternSvg;
    if (enriched.iconConcepts?.length > 0) updatedVi.iconConcepts = enriched.iconConcepts;
    if (enriched.websiteScreenshot) updatedVi.websiteScreenshot = enriched.websiteScreenshot;
    if (enriched.guidelineImageUrls?.length > 0) updatedVi.guidelineImageUrls = enriched.guidelineImageUrls;
    if (enriched.socialMediaUrls?.length > 0) updatedVi.socialMediaUrls = enriched.socialMediaUrls;

    brandContent.visualIdentity = updatedVi;

    const { error: updateErr } = await supabase
      .from("user_business_data")
      .update({ content: JSON.stringify(brandContent) })
      .eq("id", brandRowId);

    if (updateErr) {
      console.error("Failed to update brand row:", updateErr.message);
      return new Response(JSON.stringify({ success: false, error: updateErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("Brand enrichment complete:", {
      moodboard: enriched.moodboardUrls?.length || 0,
      illustrations: (enriched.illustrationIconNames?.length || 0) + (enriched.patternSvg ? 1 : 0),
      screenshot: !!enriched.websiteScreenshot,
      guidelineImages: enriched.guidelineImageUrls?.filter(Boolean)?.length || 0,
      socialMediaImages: enriched.socialMediaUrls?.filter(Boolean)?.length || 0,
    });

    return new Response(JSON.stringify({
      success: true,
      analyzedUrls,
      enriched: {
        moodboard: enriched.moodboardUrls?.length || 0,
        illustrations: (enriched.illustrationIconNames?.length || 0) + (enriched.patternSvg ? 1 : 0),
        screenshot: !!enriched.websiteScreenshot,
        guidelineImages: enriched.guidelineImageUrls?.filter(Boolean)?.length || 0,
        socialMediaImages: enriched.socialMediaUrls?.filter(Boolean)?.length || 0,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("enrich-brand error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
