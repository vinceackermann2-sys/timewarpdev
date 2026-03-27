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
    if (!deduped.has(assetKey)) deduped.set(assetKey, normalized);
  }

  return [...deduped.values()].slice(0, 6);
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

/* ── Moodboard: scrape real Pinterest image URLs from srcset/raw HTML ── */
async function fetchMoodboardImages(
  brandName: string, category: string, audienceDesc: string,
  firecrawlKey: string, browserlessKey: string,
  powerWords?: string, brandColorPrimary?: string, brandColorSecondary?: string
): Promise<string[]> {
  // Extract trust/feeling words from audience description + power words
  const trustFeeling = [
    ...(powerWords || "").split(/[\s,]+/).filter(Boolean).slice(0, 3),
    ...(audienceDesc || "").toLowerCase().split(/[\s,]+/).filter(w =>
      ["trust", "premium", "luxury", "minimal", "futuristic", "modern", "elegant",
       "bold", "clean", "innovative", "sophisticated", "warm", "organic", "natural",
       "playful", "reliable", "authentic", "quality", "simple", "powerful",
       "sleek", "confident", "safe", "comfort", "exclusive"].includes(w)
    ).slice(0, 3),
  ].filter(Boolean);

  // Map brand colors to color name feeling
  const colorFeeling = brandColorPrimary ? getColorFeeling(brandColorPrimary) : "";

  const trustStr = trustFeeling.length > 0 ? trustFeeling.join(" ") : "trust quality";
  const queries = [
    `${trustStr} ${colorFeeling} premium minimal ecommerce`.trim(),
    `${category} ${trustStr} ${colorFeeling} aesthetic`.trim(),
    `${brandName} ${colorFeeling} premium minimal ecommerce aesthetic`.trim(),
  ].filter(Boolean);

  const allUrls: string[] = [];

  for (const query of queries) {
    if (allUrls.length >= 6) break;
    try {
      const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            query: `${query} site:pinterest.com`,
          limit: 6,
        }),
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const payload = searchData.data || searchData;

        for (const url of extractPinterestUrls(JSON.stringify(payload))) {
          if (!allUrls.includes(url)) allUrls.push(url);
        }

        for (const pageUrl of extractPinterestPageUrls(payload)) {
          if (allUrls.length >= 6) break;
          try {
            const firecrawlUrls = await scrapePinterestPageForImages(pageUrl, firecrawlKey);
            const browserlessUrls = firecrawlUrls.length > 0
              ? []
              : await scrapePinterestPageForImagesWithBrowserless(pageUrl, browserlessKey);

            for (const url of [...firecrawlUrls, ...browserlessUrls]) {
              if (!allUrls.includes(url)) allUrls.push(url);
              if (allUrls.length >= 6) break;
            }
          } catch (e) {
            console.warn(`Pinterest pin scrape failed for "${pageUrl}":`, e);
          }
        }
      }
    } catch (e) {
      console.warn(`Pinterest search failed for "${query}":`, e);
    }
  }

  // Fallback: scrape Pinterest result pages directly and parse srcset/image blobs
  if (allUrls.length < 3) {
    for (const query of queries) {
      if (allUrls.length >= 6) break;
      try {
        const pinterestUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}&rs=typed`;
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
          const payload = [
            scrapeData.data?.rawHtml,
            scrapeData.data?.html,
            JSON.stringify(scrapeData.data || scrapeData),
          ].filter(Boolean).join("\n");
          for (const url of extractPinterestUrls(payload)) {
            if (!allUrls.includes(url)) allUrls.push(url);
          }
        }
      } catch (e) {
        console.warn(`Pinterest scrape fallback failed for "${query}":`, e);
      }
    }
  }

  return [...new Set(allUrls)].slice(0, 6);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { brandRowId, brandName, brandCategory, brandColors, audienceDesc, audiencePowerWords, productBenefits, buyingTriggers, websiteUrl } = await req.json();

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
        const urls = await fetchMoodboardImages(name, cat, audienceDesc || "", FIRECRAWL_API_KEY, BROWSERLESS_API_KEY);
        enriched.moodboardUrls = urls;
        console.log("Moodboard enriched:", urls.length, "images");
      } catch (e) { console.error("Moodboard pipeline error:", e); enriched.moodboardUrls = []; }
    })();

    // ── Pipeline 2: 9 Lucide icon names + 1 code-generated pattern SVG ──
    const illustrationPipeline = (async () => {
      if (!LOVABLE_API_KEY) { console.warn("No LOVABLE_API_KEY, skipping illustrations"); return; }
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

    // Run all three in parallel
    await Promise.allSettled([moodboardPipeline, illustrationPipeline, screenshotPipeline]);

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
    });

    return new Response(JSON.stringify({
      success: true,
      enriched: {
        moodboard: enriched.moodboardUrls?.length || 0,
        illustrations: (enriched.illustrationIconNames?.length || 0) + (enriched.patternSvg ? 1 : 0),
        screenshot: !!enriched.websiteScreenshot,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("enrich-brand error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
