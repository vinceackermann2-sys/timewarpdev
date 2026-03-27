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

/* ── Moodboard: use Firecrawl search API to find Pinterest images ── */
async function fetchMoodboardImages(
  brandName: string, category: string, audienceDesc: string, firecrawlKey: string
): Promise<string[]> {
  const queries = [
    `${brandName} ${category} aesthetic pinterest`,
    `${brandName} brand moodboard inspiration`,
    `${category} product photography aesthetic pinterest`,
  ];

  const allUrls: string[] = [];
  const pinImgRegex = /https?:\/\/i\.pinimg\.com\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/gi;

  for (const query of queries) {
    if (allUrls.length >= 6) break;
    try {
      // Try Firecrawl search API first
      const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          limit: 5,
          scrapeOptions: { formats: ["html"] },
        }),
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const results = searchData.data || [];
        for (const result of results) {
          const html = result.html || result.markdown || "";
          pinImgRegex.lastIndex = 0;
          let match;
          while ((match = pinImgRegex.exec(html)) !== null) {
            const url = match[0];
            if (url.includes("/75x") || url.includes("/140x") || url.includes("/170x")) continue;
            if (!allUrls.includes(url)) allUrls.push(url);
          }
          // Also check for og:image or other image URLs from Pinterest results
          if (result.url?.includes("pinterest") && result.metadata?.ogImage) {
            const og = result.metadata.ogImage;
            if (!allUrls.includes(og)) allUrls.push(og);
          }
        }
      }
    } catch (e) {
      console.warn(`Search failed for "${query}":`, e);
    }
  }

  // Fallback: direct Pinterest scrape with rawHtml + longer wait
  if (allUrls.length < 3) {
    try {
      const encodedQuery = encodeURIComponent(`${brandName} ${category} aesthetic`);
      const pinterestUrl = `https://www.pinterest.com/search/pins/?q=${encodedQuery}`;
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: pinterestUrl, formats: ["rawHtml"], waitFor: 5000 }),
      });
      if (res.ok) {
        const data = await res.json();
        const html: string = data.data?.rawHtml || data.data?.html || "";
        pinImgRegex.lastIndex = 0;
        let match;
        while ((match = pinImgRegex.exec(html)) !== null) {
          const url = match[0];
          if (url.includes("/75x") || url.includes("/140x") || url.includes("/170x")) continue;
          if (!allUrls.includes(url)) allUrls.push(url);
        }
      }
    } catch (e) {
      console.warn("Pinterest direct scrape fallback failed:", e);
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
        const urls = await fetchMoodboardImages(name, cat, audienceDesc || "", FIRECRAWL_API_KEY);
        enriched.moodboardUrls = urls;
        console.log("Moodboard enriched:", urls.length, "images");
      } catch (e) { console.error("Moodboard pipeline error:", e); enriched.moodboardUrls = []; }
    })();

    // ── Pipeline 2: 9 Individual Icon SVGs + 1 Pattern SVG ──
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

        // Generate 9 icons in 3 batches of 3
        const illustrationSvgs: string[] = [];
        for (let batch = 0; batch < 3; batch++) {
          const batchConcepts = concepts.slice(batch * 3, batch * 3 + 3);
          const batchResults = await Promise.allSettled(
            batchConcepts.map(concept =>
              callAI(LOVABLE_API_KEY,
                `Generate a complete, valid SVG string (viewBox="0 0 100 100") containing a single clean icon representing "${concept}".\n\nRequirements:\n- Simple, minimal, professional line/filled icon style\n- Use ONLY these colors: ${primary} and ${secondary}\n- NO text elements, NO <text> tags\n- Clean paths, centered in the viewBox\n- The SVG should be self-contained and valid\n\nReturn ONLY the raw SVG string starting with <svg and ending with </svg>. No markdown, no explanation.`
              )
            )
          );

          for (let i = 0; i < batchResults.length; i++) {
            const r = batchResults[i];
            if (r.status === "fulfilled") {
              const svg = extractSvg(r.value);
              if (svg) {
                illustrationSvgs.push(svg);
                console.log(`✓ Icon "${batchConcepts[i]}" generated`);
              }
            }
          }
        }

        // Generate 1 pattern
        const patternRaw = await callAI(LOVABLE_API_KEY,
          `Generate a complete, valid SVG string (viewBox="0 0 600 200") containing a seamless decorative pattern.\n\nBrand: "${name}", category: ${cat}\nPrimary color: ${primary}\nSecondary color: ${secondary}\nBackground: ${colors.background || "#ffffff"}\n\nRequirements:\n- A flowing, repeatable pattern using geometric or organic shapes\n- Use SVG <path>, <circle>, <rect>, <line> elements\n- Use <defs> with gradients if desired\n- NO <text> tags, NO letters\n- Clean, professional, modern feel\n- Use only the brand color palette\n\nReturn ONLY the raw SVG string starting with <svg and ending with </svg>. No markdown.`
        );
        const patternSvg = extractSvg(patternRaw);
        if (patternSvg) {
          illustrationSvgs.push(patternSvg);
          console.log("✓ Pattern SVG generated");
        }

        if (illustrationSvgs.length > 0) {
          enriched.illustrationSvgs = illustrationSvgs;
          enriched.iconConcepts = concepts;
          console.log("Illustrations enriched:", illustrationSvgs.length);
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
    if (enriched.illustrationSvgs?.length > 0) updatedVi.illustrationSvgs = enriched.illustrationSvgs;
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
      illustrations: enriched.illustrationSvgs?.length || 0,
      screenshot: !!enriched.websiteScreenshot,
    });

    return new Response(JSON.stringify({
      success: true,
      enriched: {
        moodboard: enriched.moodboardUrls?.length || 0,
        illustrations: enriched.illustrationSvgs?.length || 0,
        screenshot: !!enriched.websiteScreenshot,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("enrich-brand error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
