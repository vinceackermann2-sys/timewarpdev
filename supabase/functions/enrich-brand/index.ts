import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

const scrapePinterestForImages = async (term: string, apiKey: string): Promise<string[]> => {
  const pinImgRegex = /https?:\/\/i\.pinimg\.com\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/gi;
  const encodedQuery = encodeURIComponent(term);
  const pinterestUrl = `https://www.pinterest.com/search/pins/?q=${encodedQuery}`;
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: pinterestUrl, formats: ["html"], waitFor: 3000 }),
    });
    if (!res.ok) { console.warn(`Pinterest scrape failed for "${term}": ${res.status}`); return []; }
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
  } catch (e) { console.warn(`Pinterest scrape error for "${term}":`, e); return []; }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { brandRowId, brandName, brandCategory, brandColors, audienceDesc, audiencePowerWords, websiteUrl, productBenefits, buyingTriggers } = await req.json();

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

    // ── Pipeline 1: Moodboard (Pinterest) ──
    const moodboardPipeline = (async () => {
      if (!FIRECRAWL_API_KEY) { console.warn("No FIRECRAWL_API_KEY, skipping moodboard"); return; }
      try {
        const name = brandName || brandContent.name || "the brand";
        const cat = brandCategory || brandContent.category || "lifestyle";
        const audDesc = audienceDesc || "general consumers";
        const prodBenefits = productBenefits || "";
        const powerWords = audiencePowerWords || "";

        console.log("Generating moodboard terms...");
        const termsRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: `Generate exactly 6 aesthetic search terms for a moodboard.\n\nUse this framework for each term:\n[audience visual/product scene] + [trust feeling/emotion] + premium minimal e-commerce\n\nBrand: "${name}" (${cat})\nTarget audience: ${audDesc.split('.').slice(0, 3).join('.')}\nProduct benefits: ${prodBenefits || 'quality, convenience, value'}\nPower phrases: ${powerWords || 'convenience, quality, trust'}\n\nReturn ONLY a JSON array of 6 phrases. No explanation.` }],
          }),
        });

        let aestheticTerms: string[] = [];
        if (termsRes.ok) {
          const d = await termsRes.json();
          aestheticTerms = parseStringArrayFromAiText(d.choices?.[0]?.message?.content || "");
        }
        if (aestheticTerms.length === 0) {
          aestheticTerms = [
            `${cat} product showcase + trust + premium minimal e-commerce`,
            `${cat} lifestyle + warm confidence + premium minimal e-commerce`,
            `${cat} texture detail + calm sophistication + premium minimal e-commerce`,
            `clean packaging flat lay + quality assurance + premium minimal e-commerce`,
            `aspirational lifestyle moment + empowerment + premium minimal e-commerce`,
            `editorial product photography + reliability + premium minimal e-commerce`,
          ];
        }
        console.log("Moodboard terms:", aestheticTerms);

        const results = await Promise.allSettled(
          aestheticTerms.slice(0, 6).map(async (term) => {
            const imgs = await scrapePinterestForImages(term, FIRECRAWL_API_KEY);
            return imgs.length > 0 ? imgs[0] : null;
          })
        );

        const urls = results
          .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled" && !!r.value)
          .map(r => r.value);

        enriched.moodboardUrls = [...new Set(urls)].slice(0, 6);
        console.log("Moodboard enriched:", enriched.moodboardUrls.length, "images");
      } catch (e) { console.error("Moodboard pipeline error:", e); enriched.moodboardUrls = []; }
    })();

    // ── Pipeline 2: SVG Illustrations ──
    const illustrationPipeline = (async () => {
      if (!LOVABLE_API_KEY) { console.warn("No LOVABLE_API_KEY, skipping illustrations"); return; }
      try {
        const name = brandName || brandContent.name || "the brand";
        const cat = brandCategory || brandContent.category || "general";
        const colors = brandColors || brandContent.colors || {};
        const benefits = productBenefits || "";
        const triggers = buyingTriggers || "";
        const powerWords = audiencePowerWords || "";

        console.log("Generating SVG illustrations...");
        const illustrationSvgs: string[] = [];

        // Icon grid
        const iconRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: `Generate a complete, valid SVG string (viewBox="0 0 600 800") containing a 3×4 grid of 12 icons representing these product/audience concepts:\n\nProduct benefits: ${benefits || 'quality, convenience, value'}\nAudience needs: ${triggers || 'ease of use, time saving'}\nBrand: "${name}", category: ${cat}\nPrimary color: ${colors.primary || '#333333'}\nSecondary color: ${colors.secondary || '#666666'}\n\nRequirements:\n- Each icon is a simple, clean SVG path/shape\n- Arranged in a 3-column × 4-row grid with generous spacing\n- Mix of outlined and filled styles\n- Use ONLY the brand's primary and secondary colors\n- Each icon ~80×80px in a cell, centered\n- NO text elements, NO <text> tags\n- Clean, professional, minimal line style\n\nReturn ONLY the raw SVG string starting with <svg and ending with </svg>. No markdown.` }],
          }),
        });
        if (iconRes.ok) {
          const d = await iconRes.json();
          const raw = d.choices?.[0]?.message?.content || "";
          const svgMatch = raw.match(/<svg[\s\S]*?<\/svg>/i);
          if (svgMatch) { illustrationSvgs.push(svgMatch[0]); console.log("✓ Icon grid SVG"); }
        }

        // Pattern sheet
        const patternRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: `Generate a complete, valid SVG string (viewBox="0 0 600 900") containing a pattern reference sheet with 3 distinct decorative patterns stacked vertically.\n\nBrand: "${name}"\nAudience emotional keywords: ${powerWords || 'trust, comfort, confidence'}\nPrimary color: ${colors.primary || '#333333'}\nSecondary color: ${colors.secondary || '#666666'}\nBackground: ${colors.background || '#ffffff'}\n\nThe 3 patterns (each ~600×280px, separated by a gap):\n1. A flowing, organic wave/curve pattern using gradients of the brand colors\n2. A geometric/abstract section with rounded shapes, dots, or decorative elements\n3. A subtle tileable texture using thin lines or micro-patterns\n\nRequirements:\n- Use SVG <path>, <circle>, <rect>, <line>, <polygon> elements\n- Use <defs> with <linearGradient> or <radialGradient> for color blends\n- NO <text> tags, NO letters, NO numbers\n- Clean, professional, modern feel\n- Use only the brand color palette\n\nReturn ONLY the raw SVG string starting with <svg and ending with </svg>. No markdown.` }],
          }),
        });
        if (patternRes.ok) {
          const d = await patternRes.json();
          const raw = d.choices?.[0]?.message?.content || "";
          const svgMatch = raw.match(/<svg[\s\S]*?<\/svg>/i);
          if (svgMatch) { illustrationSvgs.push(svgMatch[0]); console.log("✓ Pattern sheet SVG"); }
        }

        if (illustrationSvgs.length > 0) {
          enriched.illustrationSvgs = illustrationSvgs;
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
        } else {
          console.warn("Screenshot scrape failed:", res.status);
        }
      } catch (e) { console.error("Screenshot pipeline error:", e); }
    })();

    // Run all three in parallel
    await Promise.allSettled([moodboardPipeline, illustrationPipeline, screenshotPipeline]);

    // Merge into existing visualIdentity
    const updatedVi = { ...vi };
    if (enriched.moodboardUrls && enriched.moodboardUrls.length > 0) updatedVi.moodboardUrls = enriched.moodboardUrls;
    if (enriched.illustrationSvgs && enriched.illustrationSvgs.length > 0) updatedVi.illustrationSvgs = enriched.illustrationSvgs;
    if (enriched.websiteScreenshot) updatedVi.websiteScreenshot = enriched.websiteScreenshot;

    brandContent.visualIdentity = updatedVi;

    // Update the row
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
