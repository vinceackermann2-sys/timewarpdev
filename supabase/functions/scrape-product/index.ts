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
  model = "google/gemini-2.5-flash",
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

  try {
    const { url, mode } = await req.json();
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

    console.log("Scraping URL:", formattedUrl, "Base URL:", baseUrl);

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
    // ══════════════════════════════════════════════
    let scrapeData: any = null;
    let usedDirectFallback = false;

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: baseUrl, formats: ["markdown", "links", "branding", "screenshot"], onlyMainContent: false }),
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

    const homepageMarkdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};
    const firecrawlBranding = scrapeData.data?.branding || scrapeData.branding || null;
    const websiteScreenshot = scrapeData.data?.screenshot || scrapeData.screenshot || null;

    console.log("Homepage content length:", homepageMarkdown.length, "screenshot:", !!websiteScreenshot);
    if (firecrawlBranding) console.log("Firecrawl branding data found");

    // ══════════════════════════════════════════════
    // STEP 2: Discover product pages (company URLs)
    // ══════════════════════════════════════════════
    let productPageContents: { url: string; markdown: string }[] = [];

    if (isCompanyUrl) {
      try {
        console.log("Company URL — mapping site for product pages...");
        const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: formattedUrl, search: "product", limit: 200 }),
        });
        if (mapRes.ok) {
          const mapData = await mapRes.json();
          const parsedBase = new URL(formattedUrl);
          const baseDomain = parsedBase.hostname.replace(/^www\./, '');
          const excludePatterns = /\/(support|help|careers|jobs|legal|privacy|terms|about|blog|press|newsroom|contact|login|signin|signup|auth|docs|developer|status|community|forum|account|checkout|cart|search|faq|sitemap|rss|feed|api|apps\.apple\.com|play\.google\.com)/i;
          const allUrls: string[] = (mapData.links || []).filter((u: string) => {
            if (!u || !u.startsWith("http")) return false;
            try {
              const pu = new URL(u);
              const linkDomain = pu.hostname.replace(/^www\./, '');
              if (linkDomain !== baseDomain) return false;
              if (excludePatterns.test(pu.pathname)) return false;
              if (pu.pathname === '/' || pu.pathname === '') return false;
              return true;
            } catch { return false; }
          });
          console.log("Map found", allUrls.length, "filtered URLs (from", (mapData.links || []).length, "total)");

          if (allUrls.length > 0) {
            const pickResText = await (await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [{ role: "user", content: `From these URLs, select ONLY the ones that are clearly DISTINCT individual PRODUCT or SERVICE pages. Each URL should represent a genuinely different product — do NOT include variant pages, color options, or size variations of the same product. Exclude category/collection pages, blog posts, about/legal pages.\n\nReturn ONLY a JSON array of URL strings. If none are product pages, return []. Maximum 3 URLs.\n\nURLs:\n${allUrls.slice(0, 300).join('\n')}` }],
              }),
            })).text();
            try {
              const pickData = JSON.parse(pickResText);
              const raw = pickData.choices?.[0]?.message?.content || "";
              const arrMatch = raw.match(/\[[\s\S]*?\]/);
              if (arrMatch) {
                const selected: string[] = JSON.parse(arrMatch[0]).filter((u: any) => typeof u === 'string').slice(0, 3);
                console.log("AI selected", selected.length, "product pages:", selected);
                const scrapeResults = await Promise.allSettled(
                  selected.map(async (pUrl: string) => {
                    try {
                      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ url: pUrl, formats: ["markdown"], onlyMainContent: true }),
                      });
                      if (res.ok) {
                        const d = await res.json();
                        return { url: pUrl, markdown: d.data?.markdown || d.markdown || "" };
                      }
                      const fb = await fetchPageFallback(pUrl);
                      return { url: pUrl, markdown: fb.markdown };
                    } catch { return null; }
                  })
                );
                productPageContents = scrapeResults
                  .filter((r): r is PromiseFulfilledResult<{ url: string; markdown: string }> => r.status === 'fulfilled' && !!r.value)
                  .map(r => r.value);
                console.log("Scraped", productPageContents.length, "product pages");
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
      productPageContents = [{ url: formattedUrl, markdown: homepageMarkdown }];
    }

    // ══════════════════════════════════════════════
    // STEP 3: MULTI-PASS AI EXTRACTION
    // ══════════════════════════════════════════════

    // Pass 1: Brand extraction (small, focused call)
    console.log("Pass 1: Extracting brand...");
    let brand: any = {};
    try {
      const brandingJson = firecrawlBranding ? JSON.stringify(firecrawlBranding, null, 2).slice(0, 3000) : null;
      const brandResult = await callAI(
        LOVABLE_API_KEY,
        BRAND_PROMPT(brandingJson, homepageMarkdown, formattedUrl, metadata.title || ""),
        "google/gemini-2.5-flash",
        4000,
      );
      brand = brandResult.brand || brandResult || {};
      console.log("Brand extracted:", brand.name || "(no name)");
    } catch (e) {
      console.error("Brand extraction failed:", e);
      // Construct minimal brand from firecrawl data
      brand = {
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

    // Pass 2: Per-product extraction (parallel, each in its own small AI call)
    console.log("Pass 2: Extracting", productPageContents.length, "products...");
    const productAudienceResults = await Promise.allSettled(
      productPageContents.map(async (page, idx) => {
        try {
          console.log(`Extracting product ${idx + 1}/${productPageContents.length}: ${page.url.slice(0, 80)}`);
          const result = await callAI(
            LOVABLE_API_KEY,
            PRODUCT_AUDIENCE_PROMPT(page.markdown, brand.name || "the brand", page.url),
            "google/gemini-2.5-flash",
            8000,
          );

          const product = normalizeProduct(result.product || result.products?.[0]);
          const audience = normalizeAudience(result.audience || result.audiences?.[0]);

          if (product) sanitizeProductOffers(page.markdown, product);

          return { product, audience };
        } catch (e) {
          console.warn(`Product ${idx + 1} extraction failed (skipping):`, e);
          return null;
        }
      })
    );

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
    // Also deduplicate audiences by name
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

    // ══════════════════════════════════════════════
    // BUILD FINAL EXTRACTED OBJECT
    // ══════════════════════════════════════════════
    const extracted: any = {
      brand,
      products,
      audiences,
      product: products[0],
      audience: audiences[0] || null,
    };

    // ══════════════════════════════════════════════
    // CORE MODE: Return lightweight data
    // ══════════════════════════════════════════════
    // Build scannedUrls: all actual URLs that were fetched/analyzed
    const scannedUrls: string[] = [baseUrl];
    for (const page of productPageContents) {
      if (page.url && !scannedUrls.includes(page.url)) scannedUrls.push(page.url);
    }

    if (isCoreMode) {
      // Only keep remote URL screenshots
      if (websiteScreenshot && typeof websiteScreenshot === 'string' && websiteScreenshot.startsWith('http')) {
        extracted.brand.visualIdentity.websiteScreenshot = websiteScreenshot;
      }
      // Strip heavy media
      delete extracted.brand.visualIdentity.illustrationSvgs;
      extracted.brand.visualIdentity.moodboardUrls = [];

      extracted.products = ensureArr(extracted.products).slice(0, 5);
      extracted.audiences = ensureArr(extracted.audiences).slice(0, 5);
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
            model: "google/gemini-2.5-flash-lite",
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
          callAI(LOVABLE_API_KEY, `Generate a complete, valid SVG string (viewBox="0 0 600 800") containing a 3×4 grid of 12 icons for "${brandName}" (${brandCategory}). Product benefits: ${productBenefits || 'quality, convenience'}. Primary: ${brandColors.primary || '#333'}. Secondary: ${brandColors.secondary || '#666'}. Requirements: simple SVG paths, NO text tags, brand colors only. Return ONLY raw SVG starting with <svg.`, "google/gemini-2.5-flash", 4000),
          callAI(LOVABLE_API_KEY, `Generate a complete SVG (viewBox="0 0 600 900") with 3 stacked decorative patterns for "${brandName}". Primary: ${brandColors.primary || '#333'}. Secondary: ${brandColors.secondary || '#666'}. Background: ${brandColors.background || '#fff'}. Use paths, circles, gradients. NO text tags. Return ONLY raw SVG.`, "google/gemini-2.5-flash", 4000),
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
            body: JSON.stringify({ model: "google/gemini-2.5-flash", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
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
            model: "google/gemini-3-pro-image-preview",
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
            model: "google/gemini-2.5-flash-image",
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
});
