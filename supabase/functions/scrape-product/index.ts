import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const htmlToText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const normalizeImageUrl = (raw: string, pageUrl: string): string | null => {
  if (!raw) return null;
  // Handle srcset fragments: take first URL before any space/comma
  const s = raw.split(",")[0]?.trim().split(" ")[0];
  if (!s || s.startsWith("data:")) return null;
  try {
    const full = s.startsWith("//") ? `https:${s}` : s;
    return new URL(full, pageUrl).toString();
  } catch { return null; }
};

const extractImagesFromMarkdown = (markdown: string, pageUrl: string): string[] => {
  const imgs: string[] = [];
  let m;

  const addImg = (raw: string) => {
    const url = normalizeImageUrl(raw, pageUrl);
    if (url && !imgs.includes(url)) imgs.push(url);
  };

  // 1. Markdown image syntax: ![alt](url)
  const mdImgRegex = /!\[.*?\]\(([^\s)]+)\)/g;
  while ((m = mdImgRegex.exec(markdown)) !== null) {
    if (m[1]) addImg(m[1]);
  }

  // 2. <img> tag src (ANY src, not just with extensions)
  const imgSrcRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  while ((m = imgSrcRegex.exec(markdown)) !== null) {
    addImg(m[1]);
  }

  // 3. src attributes with known image extensions
  const srcRegex = /src=["']([^"']+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"']*)?)["']/gi;
  while ((m = srcRegex.exec(markdown)) !== null) {
    addImg(m[1]);
  }

  // 4. data-src / data-original (lazy-loaded images, any URL)
  const dataSrcRegex = /data-(?:src|original|lazy-src)=["']([^"']+)["']/gi;
  while ((m = dataSrcRegex.exec(markdown)) !== null) {
    addImg(m[1]);
  }

  // 5. srcset attributes — take the largest (last) image
  const srcsetRegex = /(?:data-)?srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRegex.exec(markdown)) !== null) {
    const entries = m[1].split(',').map(s => s.trim()).filter(Boolean);
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
      const srcUrl = lastEntry.split(/\s+/)[0];
      addImg(srcUrl);
    }
  }

  // 6. Bare image URLs with extensions
  const bareImgRegex = /(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s"'<>]*)?)/gi;
  while ((m = bareImgRegex.exec(markdown)) !== null) {
    addImg(m[1]);
  }

  // 7. Protocol-relative URLs with extensions
  const protoRelRegex = /(\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s"'<>]*)?)/gi;
  while ((m = protoRelRegex.exec(markdown)) !== null) {
    addImg(m[1]);
  }

  // 8. og:image and twitter:image meta tags
  const ogRegex = /(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/gi;
  while ((m = ogRegex.exec(markdown)) !== null) {
    addImg(m[1]);
  }
  const ogRegex2 = /content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/gi;
  while ((m = ogRegex2.exec(markdown)) !== null) {
    addImg(m[1]);
  }

  // 9. CSS background-image URLs
  const bgImgRegex = /background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((m = bgImgRegex.exec(markdown)) !== null) {
    addImg(m[1]);
  }

  // 10. JSON-LD structured data images
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = jsonLdRegex.exec(markdown)) !== null) {
    try {
      const ld = JSON.parse(m[1]);
      const extractLdImages = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        if (typeof obj.image === 'string') addImg(obj.image);
        if (Array.isArray(obj.image)) obj.image.forEach((i: any) => { if (typeof i === 'string') addImg(i); else if (i?.url) addImg(i.url); });
        if (obj.image?.url) addImg(obj.image.url);
        if (obj.image?.contentUrl) addImg(obj.image.contentUrl);
        if (Array.isArray(obj['@graph'])) obj['@graph'].forEach(extractLdImages);
        if (obj.offers?.image) addImg(obj.offers.image);
      };
      extractLdImages(ld);
    } catch { /* ignore malformed JSON-LD */ }
  }

  // 11. Generic "image" JSON property patterns (common in inline JS data)
  const jsonImageRegex = /"image"\s*:\s*"(https?:\/\/[^"]+)"/gi;
  while ((m = jsonImageRegex.exec(markdown)) !== null) {
    addImg(m[1]);
  }

  // 12. Cloudinary-style CDN URLs (Tesla digitalassets, etc.) embedded anywhere in content
  const cloudinaryRegex = /https?:\/\/[^"'\s>)]+\/image\/upload\/[^"'\s>)]+\.(?:jpg|jpeg|png|webp|avif)/gi;
  while ((m = cloudinaryRegex.exec(markdown)) !== null) {
    addImg(m[0]);
  }

  return [...new Set(imgs)].filter(url => {
    if (!url) return false;
    const lower = url.toLowerCase();
    // Filter out tiny/utility images
    if (lower.includes('favicon') || lower.includes('pixel') || lower.includes('tracking') ||
        lower.includes('1x1') || lower.includes('badge') || lower.includes('flag') ||
        lower.includes('avatar') || lower.includes('spacer') ||
        lower.includes('data:image') || lower.includes('placehold') ||
        lower.includes('placeholder') || lower.includes('blank') ||
        lower.includes('transparent')) return false;
    // Filter thumbnail/downscaled URL patterns
    if (/_thumb/i.test(lower) || /-thumb/i.test(lower) || /[-_]small/i.test(lower) ||
        /[-_]tiny/i.test(lower) || /[-_]xs\b/i.test(lower) || /[-_]micro/i.test(lower) ||
        /\/thumb\//i.test(lower) || /\/thumbs\//i.test(lower) || /\/thumbnail/i.test(lower) ||
        /\/mini\//i.test(lower) || /\/icon\//i.test(lower) || /\/icons\//i.test(lower)) return false;
    // Block low-resolution dimension in URL query params (w<200 or h<200)
    const dimMatch = url.match(/[?&](w|width|h|height)=(\d+)/i);
    if (dimMatch && parseInt(dimMatch[2], 10) < 200) return false;
    // Block Shopify/CDN dimension suffixes like _200x, _100x100, _small, etc.
    if (/[_-]\d{1,3}x\d{0,3}(?:\.|$)/i.test(lower)) return false;
    // Filter dimension indicators in path like /50x50/ or /120x/
    if (/\/\d{1,3}x\d{0,3}[/.?]/.test(lower)) return false;
    // Filter SVGs (usually icons/logos, not product photos)
    if (lower.endsWith('.svg')) return false;
    // Filter broken Cloudinary/CDN transform-only URLs (no actual file path after transform params)
    if (/\/image\/upload\/(?:[a-z]_[a-z0-9,]+\/?)*$/i.test(url)) return false;
    if (/\/(?:c_scale|f_auto|q_auto|c_fill|c_fit|c_crop|c_thumb|c_pad)$/i.test(url)) return false;
    // Block Cloudinary/CDN width/height transforms below 200px (e.g. w_150, h_100)
    if (/[/,]w_(\d+)/i.test(url)) {
      const w = parseInt(url.match(/[/,]w_(\d+)/i)![1], 10);
      if (w < 200) return false;
    }
    if (/[/,]h_(\d+)/i.test(url)) {
      const h = parseInt(url.match(/[/,]h_(\d+)/i)![1], 10);
      if (h < 200) return false;
    }
    // Filter URLs with wildcard/glob patterns (not real URLs)
    if (url.includes('/**') || url.includes('/*')) return false;
    // Must have a file path after the domain (not just domain + transform)
    try {
      const u = new URL(url);
      const pathParts = u.pathname.split('/').filter(Boolean);
      if (pathParts.length === 0) return false;
      const lastPart = pathParts[pathParts.length - 1];
      if (/^[a-z]_[a-z0-9]+$/i.test(lastPart)) return false;
    } catch { return false; }
    return true;
  }).slice(0, 12);
};

const extractTitleFromHtml = (html: string) => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, " ").trim() || "";
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const OFFER_STOPWORDS = new Set([
  "the", "and", "for", "with", "your", "from", "that", "this", "into", "over", "only",
  "just", "more", "less", "have", "will", "when", "then", "than", "each", "per", "our",
  "you", "now", "get", "new", "all", "any", "are", "not", "but", "can", "one", "two",
]);

const OFFER_CUE_REGEX = /\b(save|sale|deal|offer|discount|bundle|gift|free|shipping|subscribe|bonus|bogo|limited|off)\b/i;

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}%$€£¥]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasPageEvidenceForOfferField = (
  rawPageText: string,
  normalizedPageText: string,
  value: unknown,
) => {
  if (typeof value !== "string" || !value.trim()) return false;
  const raw = value.trim();
  const normalized = normalizeSearchText(raw);
  if (!normalized) return false;
  if (normalized.length >= 8 && normalizedPageText.includes(normalized)) return true;
  const numericParts = raw.match(/\d+(?:[.,]\d+)?/g)?.map((part) => part.replace(/,/g, "")) || [];
  if (raw.includes("%") && numericParts.some((part) => rawPageText.includes(`${part}%`) || rawPageText.includes(`${part} %`))) return true;
  for (const part of numericParts) {
    const priceRegex = new RegExp(`(?:[$€£¥]\\s*)?${escapeRegExp(part)}(?:\\.00)?(?:\\s*(?:usd|eur|gbp|aud|cad|dollars?|pounds?|euros?))?`, "i");
    if (priceRegex.test(rawPageText)) return true;
  }
  const tokens = normalized.split(" ").filter((token) => token.length > 3 && !OFFER_STOPWORDS.has(token) && !/^\d+$/.test(token));
  if (tokens.length === 0) return false;
  const matchedCount = tokens.filter((token) => normalizedPageText.includes(token)).length;
  return matchedCount >= Math.min(2, tokens.length);
};

const sanitizeOffer = (offer: any, rawPageText: string, normalizedPageText: string) => {
  if (!offer || typeof offer !== "object") return null;
  const title = hasPageEvidenceForOfferField(rawPageText, normalizedPageText, offer.title) ? String(offer.title).trim() : "";
  const originalPrice = hasPageEvidenceForOfferField(rawPageText, normalizedPageText, offer.originalPrice) ? String(offer.originalPrice).trim() : "";
  const salePrice = hasPageEvidenceForOfferField(rawPageText, normalizedPageText, offer.salePrice) ? String(offer.salePrice).trim() : "";
  const discount = hasPageEvidenceForOfferField(rawPageText, normalizedPageText, offer.discount) ? String(offer.discount).trim() : "";
  const bundleDetails = hasPageEvidenceForOfferField(rawPageText, normalizedPageText, offer.bundleDetails) ? String(offer.bundleDetails).trim() : "";
  const freeGifts = Array.isArray(offer.freeGifts)
    ? offer.freeGifts.filter((gift: any) => hasPageEvidenceForOfferField(rawPageText, normalizedPageText, gift)).map((gift: any) => String(gift).trim())
    : [];
  const hasStrongEvidence = Boolean(originalPrice || salePrice || discount || bundleDetails || freeGifts.length > 0);
  const hasSupportedTitleOnly = Boolean(title && OFFER_CUE_REGEX.test(title));
  if (!hasStrongEvidence && !hasSupportedTitleOnly) return null;
  return { title, originalPrice, salePrice, discount, bundleDetails, freeGifts, isPopular: Boolean(offer.isPopular) && /\b(most popular|best seller|bestseller|popular choice|top seller)\b/i.test(rawPageText) };
};

const sanitizeProductOffers = (pageText: string, product: any) => {
  if (!product || typeof product !== "object") return;
  const rawPageText = typeof pageText === "string" ? pageText.toLowerCase() : "";
  const normalizedPageText = normalizeSearchText(pageText || "");
  product.offers = Array.isArray(product.offers)
    ? product.offers.map((offer: any) => sanitizeOffer(offer, rawPageText, normalizedPageText)).filter(Boolean)
    : [];
};

const fetchPageFallback = async (targetUrl: string) => {
  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TimeWarpBot/1.0; +https://timewarpdev.com)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`Direct fetch failed with status ${response.status}`);
  const html = await response.text();
  return { markdown: htmlToText(html), metadata: { title: extractTitleFromHtml(html), sourceURL: targetUrl, statusCode: response.status } };
};

// ══════════════════════════════════════════════
// ROBUST JSON PARSER — handles code fences, trailing commas, truncation
// ══════════════════════════════════════════════
function robustJsonParse(raw: string): any {
  if (!raw || !raw.trim()) throw new Error("Empty content");

  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) throw new Error("No JSON object found");

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  // Attempt 1: direct parse
  try { return JSON.parse(cleaned); } catch { /* continue */ }

  // Attempt 2: fix trailing commas + control chars
  cleaned = cleaned
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x1F\x7F]/g, (ch) => ch === "\n" || ch === "\t" ? ch : "");

  try { return JSON.parse(cleaned); } catch { /* continue */ }

  // Attempt 3: truncation repair
  let repaired = cleaned;
  repaired = repaired.replace(/,\s*"[^"]*"?\s*:\s*("[^"]*)?$/, "");
  repaired = repaired.replace(/,\s*"[^"]*$/, "");
  repaired = repaired.replace(/,\s*\[?[^\[\]{}]*$/, "");
  repaired = repaired.replace(/,\s*$/, "");

  const openArr = (repaired.match(/\[/g) || []).length;
  const closeArr = (repaired.match(/]/g) || []).length;
  for (let i = 0; i < openArr - closeArr; i++) repaired += "]";
  repaired = repaired.replace(/,\s*]/g, "]");

  const openB = (repaired.match(/{/g) || []).length;
  const closeB = (repaired.match(/}/g) || []).length;
  for (let i = 0; i < openB - closeB; i++) repaired += "}";
  repaired = repaired.replace(/,\s*}/g, "}");

  return JSON.parse(repaired); // throws if still broken
}

// ══════════════════════════════════════════════
// AI CALL HELPER — single focused extraction
// ══════════════════════════════════════════════
async function callAI(
  LOVABLE_API_KEY: string,
  prompt: string,
  model = "google/gemini-3-flash-preview",
  maxTokens = 8000,
): Promise<any> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });

  if (!res.ok) throw new Error(`AI call failed: ${res.status}`);

  const bodyText = await res.text();
  if (!bodyText?.trim()) throw new Error("AI returned empty body");

  const data = JSON.parse(bodyText);
  const content = data.choices?.[0]?.message?.content || "";
  return robustJsonParse(content);
}

// ══════════════════════════════════════════════
// NORMALIZE HELPERS
// ══════════════════════════════════════════════
const ensureArr = (v: any) => Array.isArray(v) ? v : [];
const ensureStr = (v: any) => typeof v === "string" ? v : "";
const ensureObj = (v: any) => (v && typeof v === "object" && !Array.isArray(v)) ? v : {};

function normalizeProduct(p: any): any {
  if (!p || typeof p !== "object") return null;
  return {
    name: ensureStr(p.name),
    category: ensureStr(p.category),
    description: ensureStr(p.description),
    features: ensureArr(p.features),
    benefits: ensureArr(p.benefits),
    painPoints: ensureArr(p.painPoints),
    useCases: ensureArr(p.useCases),
    targetScenarios: ensureArr(p.targetScenarios),
    positioningStatement: ensureStr(p.positioningStatement),
    uniqueSellingPoints: ensureArr(p.uniqueSellingPoints),
    competitiveAdvantages: ensureArr(p.competitiveAdvantages),
    commonObjections: ensureArr(p.commonObjections).map((o: any) => ({
      objection: ensureStr(o?.objection), response: ensureStr(o?.response)
    })),
    proofPoints: ensureArr(p.proofPoints).map((pp: any) => ({
      category: ensureStr(pp?.category), items: ensureArr(pp?.items)
    })),
    dosAndDonts: { dos: ensureArr(p.dosAndDonts?.dos), donts: ensureArr(p.dosAndDonts?.donts) },
    powerPhrases: ensureArr(p.powerPhrases),
    powerWords: ensureArr(p.powerWords),
    technicalLevel: ensureStr(p.technicalLevel),
    refinementChecklist: ensureArr(p.refinementChecklist),
    images: ensureArr(p.images),
    offers: ensureArr(p.offers),
  };
}

function normalizeAudience(a: any): any {
  if (!a || typeof a !== "object") return null;
  return {
    name: ensureStr(a.name),
    description: ensureStr(a.description),
    avatarPrompt: ensureStr(a.avatarPrompt),
    buyingTriggers: ensureArr(a.buyingTriggers),
    useCaseRequirements: ensureArr(a.useCaseRequirements),
    keySuccessIndicators: ensureArr(a.keySuccessIndicators),
    additionalCharacteristics: ensureStr(a.additionalCharacteristics),
    positioningStatement: ensureStr(a.positioningStatement),
    valuePropositions: ensureArr(a.valuePropositions),
    engagementTriggers: ensureArr(a.engagementTriggers),
    attentionHooks: ensureArr(a.attentionHooks),
    commonObjections: ensureArr(a.commonObjections).map((o: any) => ({
      objection: ensureStr(o?.objection), response: ensureStr(o?.response)
    })),
    proofPoints: ensureArr(a.proofPoints).map((pp: any) => ({
      category: ensureStr(pp?.category), items: ensureArr(pp?.items)
    })),
    dosAndDonts: { dos: ensureArr(a.dosAndDonts?.dos), donts: ensureArr(a.dosAndDonts?.donts) },
    powerPhrases: ensureArr(a.powerPhrases),
    powerWords: ensureArr(a.powerWords),
    technicalLevel: ensureStr(a.technicalLevel),
    refinementChecklist: ensureArr(a.refinementChecklist),
  };
}

// ══════════════════════════════════════════════
// PROMPTS — smaller, focused
// ══════════════════════════════════════════════

const BRAND_PROMPT = (brandingJson: string | null, homepageMarkdown: string, pageUrl: string, pageTitle: string) => `Extract brand identity from this website homepage. Return ONLY valid JSON.

${brandingJson ? `Firecrawl branding data (primary source for colors/fonts/logos):\n${brandingJson}\n` : ""}

JSON structure:
{
  "brand": {
    "name": "",
    "category": "",
    "colors": { "primary": "#hex", "secondary": "#hex", "background": "#hex", "text": "#hex" },
    "typography": { "fontFamily": "", "fontStyle": "", "fontWeight": "400" },
    "logoUrls": [],
    "visualIdentity": {
      "logoDescription": "",
      "moodboardDescription": "",
      "illustrationGuidelines": "",
      "imageGuidelines": [{"rule": "", "example": ""}],
      "websiteRules": [],
      "buttonRules": [],
      "socialMediaRules": []
    }
  }
}

RULES:
- Extract real data only. If a field cannot be determined, use "" or [].
- For colors: extract dominant hex colors visible on the page.
- For logoUrls: ONLY actual logo image URLs (not product photos).
- For visualIdentity: be specific and actionable, not generic.

Page URL: ${pageUrl}
Page title: ${pageTitle}

Homepage content (first 8000 chars):
${homepageMarkdown.slice(0, 8000)}`;

const PRODUCT_AUDIENCE_PROMPT = (productMarkdown: string, brandName: string, pageUrl: string) => `Extract ONE product and ONE matching target audience from this product page. Return ONLY valid JSON.

CRITICAL RULES:
- ONLY use information that is EXPLICITLY present on this page. Do NOT infer, guess, or hallucinate any data.
- If you cannot find real data for a field, leave it as "" or [].
- NEVER fabricate data. NEVER use example data. NEVER use data from other businesses or websites.
- For "offers": ONLY include pricing, deals, or bundles that have EXPLICIT prices or discount percentages written on the page. If there are NO prices, NO pricing tiers, NO discount amounts visible on the page, return "offers": []. Do NOT guess prices. Do NOT invent pricing tiers.
- For "features", "benefits", "painPoints", etc.: extract ONLY what is stated or clearly implied on the page content. Leave empty [] if the page does not mention them.

JSON structure:
{
  "product": {
    "name": "", "category": "", "description": "",
    "features": [], "benefits": [], "painPoints": [], "useCases": [], "targetScenarios": [],
    "positioningStatement": "", "uniqueSellingPoints": [], "competitiveAdvantages": [],
    "commonObjections": [{"objection": "", "response": ""}],
    "proofPoints": [{"category": "", "items": []}],
    "dosAndDonts": {"dos": [], "donts": []},
    "powerPhrases": [], "powerWords": [], "technicalLevel": "", "refinementChecklist": [],
    "images": [], "offers": []
  },
  "audience": {
    "name": "", "description": "", "avatarPrompt": "",
    "buyingTriggers": [], "useCaseRequirements": [], "keySuccessIndicators": [],
    "additionalCharacteristics": "", "positioningStatement": "",
    "valuePropositions": [], "engagementTriggers": [], "attentionHooks": [],
    "commonObjections": [{"objection": "", "response": ""}],
    "proofPoints": [{"category": "", "items": []}],
    "dosAndDonts": {"dos": [], "donts": []},
    "powerPhrases": [], "powerWords": [], "technicalLevel": "", "refinementChecklist": []
  }
}

FIELD GUIDELINES:
- description: [WHAT IT IS] + [NEW MECHANISM] + [OUTCOME] + [HOW IT WORKS]
- features: Observable facts about the product
- benefits: [FEATURE] → [WHAT IT MEANS FOR THE CUSTOMER]
- painPoints: [FRUSTRATION] + [SPECIFIC MOMENT] + [CONSEQUENCE]
- positioningStatement: "For [TARGET], [PRODUCT] is the [CATEGORY] that [KEY BENEFIT] because [REASON]"
- commonObjections: Real objections with reframes and proof
- audience description: [WHO] + [VALUES] + [CORE PAIN] + [DREAM OUTCOME]
- Every output should feel specific to THIS product, not generic

Brand: "${brandName}"
Page URL: ${pageUrl}

Product page content (first 10000 chars):
${productMarkdown.slice(0, 10000)}`;

// ══════════════════════════════════════════════
// PINTEREST SCRAPER
// ══════════════════════════════════════════════
const parseStringArrayFromAiText = (raw: string): string[] => {
  if (!raw) return [];
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const arrayStart = cleaned.indexOf("[");
  const arrayEnd = cleaned.lastIndexOf("]");
  if (arrayStart === -1 || arrayEnd === -1 || arrayEnd <= arrayStart) return [];
  try {
    const parsed = JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch { return []; }
};

const scrapePinterestForImages = async (term: string, FIRECRAWL_API_KEY: string): Promise<string[]> => {
  const pinImgRegex = /https?:\/\/i\.pinimg\.com\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/gi;
  const encodedQuery = encodeURIComponent(term);
  const pinterestUrl = `https://www.pinterest.com/search/pins/?q=${encodedQuery}`;
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: pinterestUrl, formats: ["html"], waitFor: 3000 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const html: string = data.data?.html || data.html || "";
    const found: string[] = [];
    let match;
    pinImgRegex.lastIndex = 0;
    while ((match = pinImgRegex.exec(html)) !== null) {
      const url = match[0];
      if (url.includes("/75x") || url.includes("/140x") || url.includes("/170x")) continue;
      found.push(url);
    }
    return [...new Set(found)];
  } catch { return []; }
};

// ══════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Race the entire handler against a 50s timeout so we return a proper
  // CORS-enabled error instead of letting the gateway send a bare 504.
  const INTERNAL_TIMEOUT_MS = 120_000;

  const mainLogic = async (): Promise<Response> => {
  try {
    const { url, mode, selectedProductUrls } = await req.json();
    const isDiscoverMode = mode === "discover";
    const isCoreMode = mode === "core";
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let baseUrl: string;
    try { baseUrl = new URL(formattedUrl).origin; } catch { baseUrl = formattedUrl; }

    console.log("Scraping URL:", formattedUrl, "Base URL:", baseUrl, "Mode:", mode);

    const isCompanyUrl = (() => {
      try {
        const u = new URL(formattedUrl);
        const path = u.pathname.replace(/\/+$/g, '');
        return !path || path === '';
      } catch { return false; }
    })();
    console.log("URL type:", isCompanyUrl ? "company" : "product");

    // ══════════════════════════════════════════════
    // STEP 1: Scrape homepage with Firecrawl
    // (Skip in core mode with selectedProductUrls — discover already did this)
    // ══════════════════════════════════════════════
    let scrapeData: any = null;
    let usedDirectFallback = false;
    let homepageMarkdown = "";
    let homepageHtml = "";
    let metadata: any = {};
    let firecrawlBranding: any = null;
    let websiteScreenshot: any = null;
    let homepageImages: string[] = [];
    let productPageContents: { url: string; markdown: string; extractedImages?: string[] }[] = [];

    const skipHomepageScrape = isCoreMode && Array.isArray(selectedProductUrls) && selectedProductUrls.length > 0;

    if (!skipHomepageScrape) {
      const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: baseUrl, formats: isDiscoverMode ? ["markdown", "html", "links", "branding"] : ["markdown", "html", "links", "branding", "screenshot"], onlyMainContent: false, waitFor: 3000 }),
      });

      if (scrapeResponse.ok) {
        scrapeData = await scrapeResponse.json();
      } else {
        console.warn("Firecrawl scrape failed:", scrapeResponse.status, "- retrying without screenshot");
        const retryResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: baseUrl, formats: ["markdown", "links", "branding"], onlyMainContent: false }),
        });
        if (retryResponse.ok) {
          scrapeData = await retryResponse.json();
        } else {
          try {
            const fallbackPage = await fetchPageFallback(formattedUrl);
            usedDirectFallback = true;
            scrapeData = { data: { markdown: fallbackPage.markdown, metadata: fallbackPage.metadata, branding: null, screenshot: null, links: [] } };
          } catch {
            return new Response(
              JSON.stringify({ success: false, error: `Scraping failed for ${formattedUrl}. The site may be blocking automated requests.` }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      homepageMarkdown = scrapeData.data?.markdown || scrapeData.markdown || "";
      homepageHtml = scrapeData.data?.html || scrapeData.html || "";
      metadata = scrapeData.data?.metadata || scrapeData.metadata || {};
      firecrawlBranding = scrapeData.data?.branding || scrapeData.branding || null;
      websiteScreenshot = scrapeData.data?.screenshot || scrapeData.screenshot || null;

      console.log("Homepage content length:", homepageMarkdown.length, "html length:", homepageHtml.length, "screenshot:", !!websiteScreenshot);
      if (firecrawlBranding) console.log("Firecrawl branding data found");

      // Pre-extract homepage images from both markdown and HTML
      homepageImages = [...new Set([
        ...extractImagesFromMarkdown(homepageMarkdown, formattedUrl),
        ...extractImagesFromMarkdown(homepageHtml, formattedUrl),
      ])];
      console.log("Homepage images extracted:", homepageImages.length, "samples:", homepageImages.slice(0, 3));
    } else {
      console.log("Core mode with selectedProductUrls — skipping homepage scrape");
    }

    // ══════════════════════════════════════════════
    // STEP 2: Discover product pages (company URLs)
    // (Skip in core mode — we already have selectedProductUrls)
    // ══════════════════════════════════════════════

    if (skipHomepageScrape) {
      // Core mode shortcut: directly scrape selected product URLs
      console.log("Core mode — directly scraping", selectedProductUrls.length, "selected product URLs");
      const scrapeResults = await Promise.allSettled(
        selectedProductUrls.map(async (pUrl: string) => {
          try {
            const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ url: pUrl, formats: ["markdown", "html", "screenshot"], onlyMainContent: true, waitFor: 3000 }),
            });
            if (res.ok) {
              const d = await res.json();
              const md = d.data?.markdown || d.markdown || "";
              const html = d.data?.html || d.html || "";
              const screenshot = d.data?.screenshot || d.screenshot || null;
              const mdImages = extractImagesFromMarkdown(md, pUrl);
              const htmlImages = extractImagesFromMarkdown(html, pUrl);
              const allImages = [...new Set([...mdImages, ...htmlImages])];
              if (allImages.length === 0 && screenshot && typeof screenshot === 'string' && screenshot.startsWith('http')) {
                allImages.push(screenshot);
              }
              // Also grab metadata for brand fallback
              const pageMeta = d.data?.metadata || d.metadata || {};
              if (!metadata.title && pageMeta.title) metadata = pageMeta;
              if (!firecrawlBranding && (d.data?.branding || d.branding)) firecrawlBranding = d.data?.branding || d.branding;
              return { url: pUrl, markdown: md, extractedImages: allImages };
            }
            const fb = await fetchPageFallback(pUrl);
            return { url: pUrl, markdown: fb.markdown, extractedImages: extractImagesFromMarkdown(fb.markdown, pUrl) };
          } catch { return null; }
        })
      );
      productPageContents = scrapeResults
        .filter((r): r is PromiseFulfilledResult<{ url: string; markdown: string; extractedImages: string[] }> => r.status === 'fulfilled' && !!r.value)
        .map(r => r.value);
      // Also do a lightweight homepage scrape in parallel for brand data
      try {
        const brandRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: baseUrl, formats: ["markdown", "branding"], onlyMainContent: false }),
        });
        if (brandRes.ok) {
          const brandData = await brandRes.json();
          homepageMarkdown = brandData.data?.markdown || brandData.markdown || "";
          metadata = brandData.data?.metadata || brandData.metadata || metadata;
          firecrawlBranding = brandData.data?.branding || brandData.branding || firecrawlBranding;
        }
      } catch (e) { console.warn("Brand homepage scrape failed (non-fatal):", e); }
      console.log("Core mode — scraped", productPageContents.length, "product pages");
    } else if (isCompanyUrl) {
      try {
        console.log("Company URL — mapping site for product pages...");
        // Run multiple map searches in parallel to catch more product URLs
        const [mapRes1, mapRes2, mapRes3] = await Promise.allSettled([
          fetch("https://api.firecrawl.dev/v1/map", {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url: formattedUrl, search: "product", limit: 200 }),
          }),
          fetch("https://api.firecrawl.dev/v1/map", {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url: formattedUrl, search: "shop buy store", limit: 200 }),
          }),
          fetch("https://api.firecrawl.dev/v1/map", {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url: formattedUrl, limit: 200 }),
          }),
        ]);
        // Merge all map results
        const allMapLinks: string[] = [];
        for (const r of [mapRes1, mapRes2, mapRes3]) {
          if (r.status === 'fulfilled' && r.value.ok) {
            try {
              const mapData = await r.value.json();
              if (Array.isArray(mapData.links)) allMapLinks.push(...mapData.links);
            } catch { /* ignore */ }
          }
        }
        // Also extract links from homepage HTML/markdown as fallback
        const homepageLinkRegex = /href=["'](https?:\/\/[^"']+|\/[^"']+)["']/gi;
        let hlMatch;
        const homepageLinkSource = homepageHtml || homepageMarkdown;
        while ((hlMatch = homepageLinkRegex.exec(homepageLinkSource)) !== null) {
          const href = hlMatch[1];
          if (href.startsWith('/')) {
            allMapLinks.push(`${baseUrl}${href}`);
          } else {
            allMapLinks.push(href);
          }
        }
        console.log("Total raw URLs from maps + homepage links:", allMapLinks.length);
        {
          const parsedBase = new URL(formattedUrl);
          const baseDomain = parsedBase.hostname.replace(/^www\./, '');
          const excludePatterns = /\/(support|help|careers|jobs|legal|privacy|terms|about|blog|press|newsroom|contact|login|signin|signup|auth|docs|developer|status|community|forum|account|checkout|cart|search|faq|sitemap|rss|feed|api|apps\.apple\.com|play\.google\.com|inventory|new\/|used\/)/i;
          // Filter out locale-variant duplicates (e.g., /en_my/modely and /ro_RO/modely)
          const localePrefix = /^\/[a-z]{2}(?:_[a-zA-Z]{2,4})?\//;
          const seenPaths = new Set<string>();
          const allUrls: string[] = [...new Set(allMapLinks)].filter((u: string) => {
            if (!u || !u.startsWith("http")) return false;
            try {
              const pu = new URL(u);
              const linkDomain = pu.hostname.replace(/^www\./, '');
              if (linkDomain !== baseDomain) return false;
              if (excludePatterns.test(pu.pathname)) return false;
              if (pu.pathname === '/' || pu.pathname === '') return false;
              // Deduplicate locale variants
              const canonicalPath = pu.pathname.replace(localePrefix, '/').replace(/\/+$/g, '');
              if (seenPaths.has(canonicalPath)) return false;
              seenPaths.add(canonicalPath);
              return true;
            } catch { return false; }
          });
          console.log("Map found", allUrls.length, "filtered URLs");

          if (allUrls.length > 0) {
            const pickResText = await (await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [{ role: "user", content: `You are a product page identifier. From these URLs, select ONLY URLs that lead to a SPECIFIC, INDIVIDUAL product or service page that this company sells directly.

INCLUDE:
- Individual product detail pages (e.g., /products/widget-pro, /model-y, /air-max-90)
- Individual service pages (e.g., /services/consulting, /plans/enterprise)

DO NOT INCLUDE:
- Category, collection, or listing pages (e.g., /shop, /products, /collections/shoes, /all-products)
- Variant pages (color, size, locale versions of the SAME product — e.g., /model-y/design vs /model-y, /en_gb/model-y vs /model-y)
- Blog posts, about, legal, privacy, terms, careers, help, support, FAQ, contact pages
- Partner/integration/third-party tool pages
- Cart, checkout, account, login pages
- Pages with query parameters for filters or sorting (e.g., ?color=red, ?sort=price)
- Inventory/new/used vehicle listing pages
- The homepage itself

DEDUPLICATION RULES:
- If multiple URLs clearly point to the SAME product (just different locales, anchors, or minor path variations), pick only ONE — the shortest/cleanest URL.
- Prefer canonical-looking URLs: shorter paths, no locale prefixes (/en_xx/), no query strings.

Return ONLY a JSON array of URL strings, max 10 items. If none qualify, return [].

URLs:
${allUrls.slice(0, 400).join('\n')}` }],
              }),
            })).text();
            try {
              const pickData = JSON.parse(pickResText);
              const raw = pickData.choices?.[0]?.message?.content || "";
              const arrMatch = raw.match(/\[[\s\S]*?\]/);
              if (arrMatch) {
                const maxPages = isCoreMode ? 3 : 10;
                const parsedBase = new URL(baseUrl);
                const selected: string[] = JSON.parse(arrMatch[0])
                  .filter((u: any) => typeof u === 'string')
                  .map((u: string) => {
                    if (u.startsWith('/')) return `${parsedBase.origin}${u}`;
                    if (!u.startsWith('http')) return `${parsedBase.origin}/${u}`;
                    return u;
                  })
                  .slice(0, maxPages);
                console.log("AI selected", selected.length, "product pages:", selected);
                // Scrape all pages in parallel
                // In discover mode: skip AI extraction, just get images + title from page metadata
                // In core/extract mode: do full AI extraction per page
                const combinedResults = await Promise.allSettled(
                  selected.map(async (pUrl: string) => {
                    try {
                      // Scrape page
                      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ url: pUrl, formats: ["markdown", "html"], onlyMainContent: false, waitFor: 2000 }),
                      });
                      let md = "";
                      let pageHtml = "";
                      let pageMeta: any = {};
                      if (res.ok) {
                        const d = await res.json();
                        md = d.data?.markdown || d.markdown || "";
                        pageHtml = d.data?.html || d.html || "";
                        pageMeta = d.data?.metadata || d.metadata || {};
                      } else {
                        const fb = await fetchPageFallback(pUrl);
                        md = fb.markdown;
                        pageMeta = fb.metadata || {};
                      }
                      // Extract images from both markdown and HTML for better coverage
                      const mdImages = extractImagesFromMarkdown(md, pUrl);
                      const htmlImages = pageHtml ? extractImagesFromMarkdown(pageHtml, pUrl) : [];
                      const pageImages = [...new Set([...mdImages, ...htmlImages])];

                      if (isDiscoverMode) {
                        // FAST PATH: No AI call — just use page title + scraped images
                        const rawTitle = pageMeta.title || pageMeta["og:title"] || "";
                        // Clean title: remove site name suffix (e.g. "Widget Pro | Acme Inc" -> "Widget Pro")
                        const name = rawTitle.split(/[|\-–—]/)[0]?.trim() || "";
                        const description = pageMeta.description || pageMeta["og:description"] || "";
                        return { url: pUrl, name, description: (description || "").slice(0, 200), images: pageImages.slice(0, 8), markdown: md, extractedImages: pageImages };
                      }

                      // FULL PATH: AI extraction for core/extract mode
                      const candidateImages = pageImages.slice(0, 20);
                      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
                        body: JSON.stringify({
                          model: "google/gemini-3-flash-preview",
                          max_tokens: 1000,
                          messages: [{ role: "user", content: `From this product page content, extract the product name and a 1-sentence description. If this page is NOT a product page (e.g. it's a category listing, blog, or informational page), return {"name": "", "description": "", "bestImages": [], "isProduct": false}.\n\nHere are image URLs found on this page:\n${JSON.stringify(candidateImages)}\n\nSelect the 1-3 URLs from the list above that are most likely the MAIN product photo.\n\nRULES for image selection:\n- Pick actual high-resolution product photography only.\n- PREFER URLs with large dimensions (e.g. w_800, 1200x, _large, _1024) or no dimension suffix (usually full-size).\n- REJECT URLs containing thumbnail indicators: _thumb, _small, _xs, _mini, /thumbs/, _150x, _200x, _300x, w_100-300, h_100-300.\n- REJECT logos, icons, banners, tracking pixels, badges, or decorative images.\n- When multiple sizes of the same image exist, pick the LARGEST version.\n\nReturn JSON: {"name": "", "description": "", "bestImages": [], "isProduct": true}\n\nContent (first 5000 chars):\n${md.slice(0, 5000)}` }],
                        }),
                      });
                      if (!aiRes.ok) return { url: pUrl, name: "", description: "", images: candidateImages, markdown: md, extractedImages: pageImages };
                      const aiData = await aiRes.json();
                      const rawAi = aiData.choices?.[0]?.message?.content || "";
                      try {
                        const parsed = robustJsonParse(rawAi);
                        if (parsed.isProduct === false) return null;
                        const bestImages = ensureArr(parsed.bestImages || parsed.imageUrls).filter((u: any) => typeof u === 'string' && u.startsWith('http'));
                        const finalImages = bestImages.length > 0 ? [...bestImages, ...candidateImages.filter(c => !bestImages.includes(c))].slice(0, 8) : candidateImages.slice(0, 8);
                        return { url: pUrl, name: parsed.name || "", description: parsed.description || "", images: finalImages, markdown: md, extractedImages: pageImages };
                      } catch {
                        return { url: pUrl, name: "", description: "", images: candidateImages, markdown: md, extractedImages: pageImages };
                      }
                    } catch { return null; }
                  })
                );
                
                // Split results for both discover and non-discover paths
                const combinedSettled = combinedResults
                  .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !!r.value)
                  .map(r => r.value);
                
                productPageContents = combinedSettled.map(r => ({ url: r.url, markdown: r.markdown || "", extractedImages: r.extractedImages || [] }));
                // Store discover data for later use
                (globalThis as any).__discoverCache = combinedSettled;
                console.log("Scraped + extracted", productPageContents.length, "product pages in parallel");
              }
            } catch (e) { console.warn("Product selection parse error:", e); }
          }
        }
      } catch (e) { console.warn("Map API error (non-fatal):", e); }
    } else if (!usedDirectFallback && baseUrl !== formattedUrl) {
      // Single product URL: scrape the specific product page
      try {
        const productScrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: formattedUrl, formats: ["markdown"], onlyMainContent: true }),
        });
        if (productScrapeRes.ok) {
          const pd = await productScrapeRes.json();
          productPageContents = [{ url: formattedUrl, markdown: pd.data?.markdown || pd.markdown || "" }];
        } else {
          const fb = await fetchPageFallback(formattedUrl);
          productPageContents = [{ url: formattedUrl, markdown: fb.markdown }];
        }
      } catch (e) { console.warn("Product page scrape failed:", e); }
    }

    // If no product pages were scraped, use the homepage as the single product page
    if (productPageContents.length === 0) {
      productPageContents = [{ url: formattedUrl, markdown: homepageMarkdown, extractedImages: homepageImages }];
    }

    // Build scannedUrls early (used by both discover and extract modes)
    const scannedUrls: string[] = [baseUrl];
    for (const page of productPageContents) {
      if (page.url && !scannedUrls.includes(page.url)) scannedUrls.push(page.url);
    }

    // ══════════════════════════════════════════════
    // DISCOVER MODE: Lightweight product listing (names + images + descriptions only)
    // ══════════════════════════════════════════════
    if (isDiscoverMode) {
      console.log("Discover mode — extracting product names/images from", productPageContents.length, "pages...");

      // Extract og:image from homepage metadata as fallback for products with no images
      const ogImage = metadata?.ogImage || metadata?.["og:image"] || metadata?.image || null;
      const ogImageUrl = ogImage ? normalizeImageUrl(ogImage, formattedUrl) : null;

      // Check if we already have combined scrape+AI results from the parallel pipeline
      const cachedDiscover = (globalThis as any).__discoverCache as any[] | undefined;
      delete (globalThis as any).__discoverCache;

      let discoverSettled: { url: string; name: string; description: string; images: string[] }[];

      if (cachedDiscover && cachedDiscover.length > 0) {
        // Use pre-computed results — no additional AI calls needed
        console.log("Using cached discover results for", cachedDiscover.length, "pages");
        discoverSettled = cachedDiscover.map(r => ({
          url: r.url,
          name: r.name || "",
          description: r.description || "",
          images: r.images || [],
        }));
        // Fill in missing images with fallbacks
        for (const p of discoverSettled) {
          if (p.images.length === 0 && homepageImages.length > 0) p.images = homepageImages.slice(0, 3);
          if (p.images.length === 0 && ogImageUrl) p.images = [ogImageUrl];
        }
      } else {
        // Fallback: run AI extraction (for non-company URLs or when cache is empty)
        const discoverResults = await Promise.allSettled(
          productPageContents.slice(0, 10).map(async (page) => {
            try {
              let pageImages = (page as any).extractedImages?.length > 0
                ? (page as any).extractedImages
                : extractImagesFromMarkdown(page.markdown, page.url);
              if (pageImages.length === 0) {
                const ogMatch = page.markdown.match(/og:image[^"]*content=["']([^"']+)["']/i)
                  || page.markdown.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
                if (ogMatch?.[1]) {
                  const ogUrl = normalizeImageUrl(ogMatch[1], page.url);
                  if (ogUrl) pageImages = [ogUrl];
                }
              }
              if (pageImages.length === 0 && homepageImages.length > 0) pageImages = homepageImages.slice(0, 3);
              if (pageImages.length === 0 && ogImageUrl) pageImages = [ogImageUrl];
              const candidateImages = [...new Set([...pageImages, ...extractImagesFromMarkdown(page.markdown, page.url)])].slice(0, 20);
              const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: "google/gemini-3-flash-preview",
                  max_tokens: 1000,
                  messages: [{ role: "user", content: `From this product page content, extract the product name and a 1-sentence description. If this is NOT a product page, return {"name": "", "description": "", "bestImages": [], "isProduct": false}.\n\nHere are image URLs found on this page:\n${JSON.stringify(candidateImages)}\n\nSelect the 1-3 URLs from the list above that are most likely the MAIN product photo. Do NOT pick logos, icons, banners, tracking pixels, or tiny images. Pick actual product photography.\n\nReturn JSON: {"name": "", "description": "", "bestImages": [], "isProduct": true}\n\nContent (first 5000 chars):\n${page.markdown.slice(0, 5000)}` }],
                }),
              });
              if (!res.ok) return { url: page.url, name: "", description: "", images: candidateImages };
              const d = await res.json();
              const raw = d.choices?.[0]?.message?.content || "";
              try {
                const parsed = robustJsonParse(raw);
                const bestImages = ensureArr(parsed.bestImages || parsed.imageUrls).filter((u: any) => typeof u === 'string' && u.startsWith('http'));
                const finalImages = bestImages.length > 0 ? [...bestImages, ...candidateImages.filter(c => !bestImages.includes(c))].slice(0, 8) : candidateImages.slice(0, 8);
                return { url: page.url, name: parsed.name || "", description: parsed.description || "", images: finalImages };
              } catch {
                return { url: page.url, name: "", description: "", images: candidateImages };
              }
            } catch {
              return { url: page.url, name: "", description: "", images: extractImagesFromMarkdown(page.markdown, page.url) };
            }
          })
        );
        discoverSettled = discoverResults
          .filter((r): r is PromiseFulfilledResult<{ url: string; name: string; description: string; images: string[] }> =>
            r.status === 'fulfilled' && !!r.value)
          .map(r => r.value)
          .filter(p => p.name || p.description || p.images.length > 0);
      }

      const rawDiscovered = discoverSettled
        .filter(p => p.name || p.description || p.images.length > 0);

      // Deduplicate by normalized product name
      const seenNames = new Set<string>();
      const discoveredProducts = rawDiscovered.filter(p => {
        const key = (p.name || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
        if (!key) return true; // keep unnamed products (they'll show URL as label)
        if (seenNames.has(key)) return false;
        seenNames.add(key);
        return true;
      });

      // Extract basic brand info from firecrawl (no AI call needed)
      const quickBrand = {
        name: metadata?.title?.split(/[|\-–—]/)[0]?.trim() || "My Business",
        category: "Business",
        colors: firecrawlBranding?.colors ? {
          primary: firecrawlBranding.colors.primary || firecrawlBranding.colors.accent || "#4A86FF",
          secondary: firecrawlBranding.colors.secondary || "#6B7280",
          background: firecrawlBranding.colors.background || "#FFFFFF",
          text: firecrawlBranding.colors.textPrimary || "#000000",
        } : null,
        logoUrls: firecrawlBranding?.logo ? [firecrawlBranding.logo] : [],
      };

      console.log("Discover mode — found", discoveredProducts.length, "products, scannedUrls:", scannedUrls.length);

      return new Response(
        JSON.stringify({
          success: true,
          discoveredProducts,
          quickBrand,
          scannedUrls,
          isMultiProduct: isCompanyUrl && productPageContents.length > 1,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ══════════════════════════════════════════════
    // CORE/EXTRACT MODE: Filter to selected products if provided
    // ══════════════════════════════════════════════
    if (Array.isArray(selectedProductUrls) && selectedProductUrls.length > 0) {
      const selectedSet = new Set(selectedProductUrls);
      const filtered = productPageContents.filter(p => selectedSet.has(p.url));
      if (filtered.length > 0) {
        productPageContents = filtered;
        console.log("Filtered to", productPageContents.length, "selected product pages");
      }
    }

    // ══════════════════════════════════════════════
    // STEP 3: PARALLEL AI EXTRACTION (brand + products simultaneously)
    // ══════════════════════════════════════════════

    console.log("Extracting brand + products in parallel...");
    const brandingJson = firecrawlBranding ? JSON.stringify(firecrawlBranding, null, 2).slice(0, 3000) : null;

    // Run brand extraction and all product extractions in parallel
    const [brandSettled, ...productAudienceResults] = await Promise.allSettled([
      // Brand extraction
      (async () => {
        try {
          const brandResult = await callAI(
            LOVABLE_API_KEY,
            BRAND_PROMPT(brandingJson, homepageMarkdown, formattedUrl, metadata.title || ""),
            "google/gemini-3-flash-preview",
            4000,
          );
          return brandResult.brand || brandResult || {};
        } catch (e) {
          console.error("Brand extraction failed:", e);
          return {
            name: metadata?.title?.split(/[|\-–—]/)[0]?.trim() || "My Business",
            category: "Business",
            colors: firecrawlBranding?.colors ? {
              primary: firecrawlBranding.colors.primary || "#4A86FF",
              secondary: firecrawlBranding.colors.secondary || "#6B7280",
              background: firecrawlBranding.colors.background || "#FFFFFF",
              text: firecrawlBranding.colors.textPrimary || "#000000",
            } : { primary: "#4A86FF", secondary: "#6B7280", background: "#FFFFFF", text: "#000000" },
            typography: { fontFamily: firecrawlBranding?.typography?.fontFamilies?.primary || "Sans-serif", fontStyle: "", fontWeight: "400" },
            logoUrls: firecrawlBranding?.logo ? [firecrawlBranding.logo] : [],
            visualIdentity: {},
          };
        }
      })(),
      // Product/audience extractions (parallel)
      ...productPageContents.map(async (page, idx) => {
        try {
          // Use a preliminary brand name for the prompt
          const prelimBrandName = metadata?.title?.split(/[|\-–—]/)[0]?.trim() || "the brand";
          console.log(`Extracting product ${idx + 1}/${productPageContents.length}: ${page.url.slice(0, 80)}`);
          const result = await callAI(
            LOVABLE_API_KEY,
            PRODUCT_AUDIENCE_PROMPT(page.markdown, prelimBrandName, page.url),
            "google/gemini-3-flash-preview",
            8000,
          );

          const product = normalizeProduct(result.product || result.products?.[0]);
          const audience = normalizeAudience(result.audience || result.audiences?.[0]);

          if (product) {
            sanitizeProductOffers(page.markdown, product);
            const pageImages = (page as any).extractedImages || [];
            const aiImages = ensureArr(product.images);
            const allImages = [...new Set([...aiImages, ...pageImages])].slice(0, 8);
            product.images = allImages;
          }

          return { product, audience };
        } catch (e) {
          console.warn(`Product ${idx + 1} extraction failed (skipping):`, e);
          return null;
        }
      }),
    ]);

    // Extract brand from settled result
    let brand: any = brandSettled.status === 'fulfilled' ? brandSettled.value : {};
    console.log("Brand extracted:", brand.name || "(no name)");

    // Ensure brand structure
    if (!brand.visualIdentity) brand.visualIdentity = {};
    if (!brand.colors) brand.colors = { primary: "#4A86FF", secondary: "#6B7280", background: "#FFFFFF", text: "#000000" };

    // Merge Firecrawl branding
    if (firecrawlBranding) {
      const fcLogos: string[] = [];
      if (firecrawlBranding.logo) fcLogos.push(firecrawlBranding.logo);
      if (firecrawlBranding.images?.logo && firecrawlBranding.images.logo !== firecrawlBranding.logo) fcLogos.push(firecrawlBranding.images.logo);
      if (fcLogos.length === 0 && firecrawlBranding.images?.favicon) fcLogos.push(firecrawlBranding.images.favicon);
      const aiLogos = ensureArr(brand.logoUrls).filter((u: string) => u && (u.toLowerCase().includes('logo') || u.toLowerCase().includes('brand') || u.endsWith('.svg')));
      brand.logoUrls = [...new Set([...fcLogos, ...aiLogos])].filter(Boolean);

      if (firecrawlBranding.colors && (!brand.colors.primary || brand.colors.primary === "#hex")) {
        const fc = firecrawlBranding.colors;
        brand.colors = { primary: fc.primary || fc.accent || "#4A86FF", secondary: fc.secondary || "#6B7280", background: fc.background || "#FFFFFF", text: fc.textPrimary || "#000000" };
      }

      if (firecrawlBranding.typography?.fontFamilies && !brand.typography?.fontFamily) {
        brand.typography = { ...brand.typography, fontFamily: firecrawlBranding.typography.fontFamilies.primary || "Sans-serif" };
      }

      if (firecrawlBranding.components?.buttonPrimary && !brand.visualIdentity.buttonRules?.length) {
        const btn = firecrawlBranding.components.buttonPrimary;
        brand.visualIdentity.buttonRules = [`Primary buttons: ${btn.borderRadius || '8px'} radius, ${btn.background || 'brand color'} fill, ${btn.textColor || 'white'} text`];
      }
    }

    // Brand name fallback
    if (!brand.name) {
      brand.name = metadata?.title?.split(/[|\-–—]/)[0]?.trim() || "My Business";
    }

    // Collect products and audiences from parallel results
    const products: any[] = [];
    const audiences: any[] = [];
    const seenProductNames = new Set<string>();
    for (const r of productAudienceResults) {
      if (r.status !== 'fulfilled' || !r.value) continue;
      if (r.value.product && r.value.product.name) {
        const normalizedName = r.value.product.name.toLowerCase().trim();
        if (!seenProductNames.has(normalizedName)) {
          seenProductNames.add(normalizedName);
          products.push(r.value.product);
        } else {
          console.log("Skipping duplicate product:", r.value.product.name);
        }
      }
      if (r.value.audience && r.value.audience.name) {
        audiences.push(r.value.audience);
      }
    }
    // Deduplicate audiences by name
    const uniqueAudiences: any[] = [];
    const seenAudienceNames = new Set<string>();
    for (const a of audiences) {
      const normalizedName = a.name.toLowerCase().trim();
      if (!seenAudienceNames.has(normalizedName)) {
        seenAudienceNames.add(normalizedName);
        uniqueAudiences.push(a);
      }
    }

    console.log("Extracted", products.length, "products,", audiences.length, "audiences");

    if (products.length === 0) {
      console.error("Zero products extracted — returning error");
      return new Response(
        JSON.stringify({ success: false, error: "Could not extract any products from this URL. Try a more specific product page." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // BG removal skipped in core mode — available as manual action in the UI

    // ══════════════════════════════════════════════
    // BUILD FINAL EXTRACTED OBJECT
    // ══════════════════════════════════════════════
    const extracted: any = {
      brand,
      products,
      audiences: uniqueAudiences,
      product: products[0],
      audience: uniqueAudiences[0] || null,
    };

    // ══════════════════════════════════════════════
    // CORE MODE: Return lightweight data

    if (isCoreMode) {
      // Only keep remote URL screenshots
      if (websiteScreenshot && typeof websiteScreenshot === 'string' && websiteScreenshot.startsWith('http')) {
        extracted.brand.visualIdentity.websiteScreenshot = websiteScreenshot;
      }
      // Strip heavy media
      delete extracted.brand.visualIdentity.illustrationSvgs;
      extracted.brand.visualIdentity.moodboardUrls = [];

      extracted.products = ensureArr(extracted.products).slice(0, 10);
      extracted.audiences = ensureArr(extracted.audiences).slice(0, 10);
      extracted.brand.logoUrls = ensureArr(extracted.brand.logoUrls).slice(0, 10);

      console.log("Core mode — returning:", extracted.brand?.name, "products:", extracted.products?.length, "scannedUrls:", scannedUrls.length);

      return new Response(
        JSON.stringify({ success: true, extracted, isMultiProduct: isCompanyUrl && productPageContents.length > 1, scannedUrls }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ══════════════════════════════════════════════
    // FULL MODE: Generate heavy assets
    // ══════════════════════════════════════════════

    // Mobile screenshot
    const mobileScreenshotPromise = (async () => {
      try {
        const mobileRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: baseUrl, formats: ["screenshot"], mobile: true }),
        });
        if (mobileRes.ok) {
          const mobileData = await mobileRes.json();
          const mobileSS = mobileData.data?.screenshot || mobileData.screenshot;
          if (mobileSS) return typeof mobileSS === 'string' && mobileSS.startsWith('http') ? mobileSS : `data:image/png;base64,${mobileSS}`;
        }
      } catch (e) { console.warn("Mobile screenshot error:", e); }
      return null;
    })();

    // Moodboard
    const moodboardPromise = (async () => {
      try {
        const audienceDesc = extracted.audience?.description || "general consumers";
        const brandCategory = extracted.brand?.category || "lifestyle";
        const brandName = extracted.brand?.name || "the brand";

        const termsRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "user", content: `Generate 6 aesthetic Pinterest search terms for a brand moodboard.\nBrand: "${brandName}" (${brandCategory})\nAudience: ${audienceDesc.slice(0, 200)}\n\nReturn ONLY a JSON array of 6 phrases.` }],
          }),
        });

        let terms: string[] = [];
        if (termsRes.ok) {
          const d = await termsRes.json();
          terms = parseStringArrayFromAiText(d.choices?.[0]?.message?.content || "");
        }
        if (terms.length === 0) {
          terms = [`${brandCategory} product showcase premium`, `${brandCategory} lifestyle aspirational`, `clean packaging flat lay quality`];
        }

        const results = await Promise.allSettled(
          terms.slice(0, 6).map(async (term) => {
            const imgs = await scrapePinterestForImages(term, FIRECRAWL_API_KEY);
            return imgs.length > 0 ? imgs[0] : null;
          })
        );
        const urls = results.filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && !!r.value).map(r => r.value);
        extracted.brand.visualIdentity.moodboardUrls = [...new Set(urls)].slice(0, 6);
        console.log("Moodboard:", urls.length, "images");
      } catch (e) {
        console.error("Moodboard error:", e);
        extracted.brand.visualIdentity.moodboardUrls = [];
      }
    })();

    // Desktop screenshot
    if (websiteScreenshot) {
      extracted.brand.visualIdentity.websiteScreenshot = typeof websiteScreenshot === 'string' && websiteScreenshot.startsWith('http')
        ? websiteScreenshot : `data:image/png;base64,${websiteScreenshot}`;
    }

    // Mobile screenshot
    const mobileScreenshot = await mobileScreenshotPromise;
    if (mobileScreenshot) extracted.brand.visualIdentity.mobileScreenshot = mobileScreenshot;

    // SVG illustrations
    const illustrationPromise = (async () => {
      try {
        const brandColors = extracted.brand?.colors || {};
        const brandCategory = extracted.brand?.category || "general";
        const brandName = extracted.brand?.name || "the brand";
        const productBenefits = (extracted.product?.benefits || []).slice(0, 6).join('; ');

        const [iconRes, patternRes] = await Promise.allSettled([
          callAI(LOVABLE_API_KEY, `Generate a complete, valid SVG string (viewBox="0 0 600 800") containing a 3×4 grid of 12 icons for "${brandName}" (${brandCategory}). Product benefits: ${productBenefits || 'quality, convenience'}. Primary: ${brandColors.primary || '#333'}. Secondary: ${brandColors.secondary || '#666'}. Requirements: simple SVG paths, NO text tags, brand colors only. Return ONLY raw SVG starting with <svg.`, "google/gemini-3-flash-preview", 4000),
          callAI(LOVABLE_API_KEY, `Generate a complete SVG (viewBox="0 0 600 900") with 3 stacked decorative patterns for "${brandName}". Primary: ${brandColors.primary || '#333'}. Secondary: ${brandColors.secondary || '#666'}. Background: ${brandColors.background || '#fff'}. Use paths, circles, gradients. NO text tags. Return ONLY raw SVG.`, "google/gemini-3-flash-preview", 4000),
        ]);

        const svgs: string[] = [];
        for (const r of [iconRes, patternRes]) {
          if (r.status !== 'fulfilled') continue;
          // callAI returns parsed JSON, but for SVG we need the raw content
          // The AI might return SVG directly which robustJsonParse would fail on
          // So we handle this differently
        }
        // Actually, SVG prompts ask for raw SVG not JSON. Use direct fetch instead.
      } catch (e) { console.error("Illustration error:", e); }
    })();

    // Better approach for SVG: direct fetch
    const illustrationPromise2 = (async () => {
      try {
        const brandColors = extracted.brand?.colors || {};
        const brandName = extracted.brand?.name || "the brand";
        const brandCategory = extracted.brand?.category || "general";
        const productBenefits = (extracted.product?.benefits || []).slice(0, 6).join('; ');
        const svgs: string[] = [];

        const fetchSvg = async (prompt: string) => {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "google/gemini-3-flash-preview", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
          });
          if (!res.ok) return null;
          const d = await res.json();
          const raw = d.choices?.[0]?.message?.content || "";
          const svgMatch = raw.match(/<svg[\s\S]*?<\/svg>/i);
          return svgMatch ? svgMatch[0] : null;
        };

        const [icon, pattern] = await Promise.allSettled([
          fetchSvg(`Generate a complete SVG (viewBox="0 0 600 800") with a 3×4 grid of 12 icons for "${brandName}" (${brandCategory}). Benefits: ${productBenefits || 'quality'}. Primary: ${brandColors.primary || '#333'}. Secondary: ${brandColors.secondary || '#666'}. Simple paths, NO text. Return ONLY raw SVG.`),
          fetchSvg(`Generate a complete SVG (viewBox="0 0 600 900") with 3 stacked decorative patterns for "${brandName}". Primary: ${brandColors.primary || '#333'}. Secondary: ${brandColors.secondary || '#666'}. Bg: ${brandColors.background || '#fff'}. Paths, circles, gradients. NO text. Return ONLY raw SVG.`),
        ]);

        if (icon.status === 'fulfilled' && icon.value) svgs.push(icon.value);
        if (pattern.status === 'fulfilled' && pattern.value) svgs.push(pattern.value);

        if (svgs.length > 0) {
          extracted.brand.visualIdentity.illustrationSvgs = svgs;
          console.log("Generated", svgs.length, "SVG illustrations");
        }
      } catch (e) { console.error("Illustration error:", e); }
    })();

    // Logo AI recreation (if no logos found)
    const logoPromise = (async () => {
      if (extracted.brand.logoUrls?.length > 0) return;
      if (!websiteScreenshot) return;
      try {
        const ssUrl = typeof websiteScreenshot === 'string' && websiteScreenshot.startsWith('http')
          ? websiteScreenshot : `data:image/png;base64,${websiteScreenshot}`;
        const logoRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages: [{ role: "user", content: [
              { type: "text", text: "Reproduce this exact logo from the website header. Match every detail. Output on clean white background. No extras." },
              { type: "image_url", image_url: { url: ssUrl } }
            ] }],
            modalities: ["image", "text"],
          }),
        });
        if (logoRes.ok) {
          const d = await logoRes.json();
          const img = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (img) extracted.brand.logoUrls = [img];
        }
      } catch (e) { console.warn("Logo recreation error:", e); }
    })();

    // Audience avatar
    const avatarPromise = (async () => {
      const aud = extracted.audience;
      if (!aud?.description || aud.description.length < 20) return;
      try {
        const avatarRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages: [{ role: "user", content: `Generate a professional portrait photograph of a person representing: "${aud.description.slice(0, 500)}". Natural lighting, blurred background, relatable appearance. NO text.` }],
            modalities: ["image", "text"],
          }),
        });
        if (avatarRes.ok) {
          const d = await avatarRes.json();
          const url = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (url) extracted.audience.avatarUrl = url;
        }
      } catch (e) { console.warn("Avatar error:", e); }
    })();

    // Wait for all asset generation
    await Promise.allSettled([moodboardPromise, illustrationPromise2, logoPromise, avatarPromise]);

    console.log("Full mode complete. Products:", products.length, "Audiences:", audiences.length);

    return new Response(
      JSON.stringify({ success: true, extracted, isMultiProduct: isCompanyUrl && productPageContents.length > 1, scannedUrls }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Scrape-product error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  }; // end mainLogic

  try {
    return await Promise.race([
      mainLogic(),
      new Promise<Response>((resolve) =>
        setTimeout(() => {
          console.error("Internal timeout reached (" + INTERNAL_TIMEOUT_MS + "ms)");
          resolve(new Response(
            JSON.stringify({ success: false, error: "Request timed out. Try a simpler URL or try again." }),
            { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          ));
        }, INTERNAL_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    console.error("Top-level error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
