import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
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

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping URL:", formattedUrl);

    // Step 1: Scrape with Firecrawl
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown", "links"],
        onlyMainContent: false,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    if (!scrapeResponse.ok) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to scrape page" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    console.log("Scraped content length:", markdown.length);

    // Step 2: Extract structured data with AI
    const extractionPrompt = `You are analyzing a product page. Extract the following structured data from the page content.
Return ONLY valid JSON, no markdown wrapping.

The JSON should have this structure:
{
  "product": {
    "name": "product name",
    "category": "product category (e.g. Consumer Product, SaaS, Digital Product)",
    "description": "detailed product description",
    "features": ["feature 1", "feature 2", ...],
    "benefits": ["benefit 1", "benefit 2", ...],
    "painPoints": ["pain point the product solves 1", ...],
    "useCases": ["use case 1", ...],
    "positioningStatement": "one sentence positioning",
    "uniqueSellingPoints": ["usp 1", ...],
    "images": ["image url 1", ...],
    "offers": [
      {
        "title": "offer name",
        "originalPrice": "original price",
        "salePrice": "sale price if any",
        "discount": "discount label",
        "bundleDetails": "details",
        "freeGifts": [],
        "isPopular": false
      }
    ]
  },
  "brand": {
    "name": "brand name extracted from the page",
    "category": "industry category"
  },
  "audience": {
    "name": "target audience segment name (e.g. 'Health-Conscious Women 25-40')",
    "description": "description of who this product targets based on the page content",
    "buyingTriggers": ["trigger 1", ...],
    "valuePropositions": ["value prop 1", ...],
    "engagementTriggers": ["engagement trigger 1", ...],
    "attentionHooks": ["hook 1", ...]
  }
}

Rules:
- Only include data you can confidently extract from the page
- Leave arrays empty [] if you can't find relevant data
- Leave strings empty "" if you can't find the data
- For audience, infer from the product's marketing language who they're targeting
- For brand, look for the company/brand name in the page
- Extract real image URLs if visible in the content
- Be thorough with features, benefits, and pain points

Page URL: ${formattedUrl}
Page title: ${metadata.title || "Unknown"}

Page content:
${markdown.slice(0, 15000)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: extractionPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: "AI extraction failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from the response
    let extracted;
    try {
      // Try to find JSON in the response
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw:", rawContent.slice(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse extracted data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Extraction successful:", extracted.product?.name);

    return new Response(
      JSON.stringify({ success: true, extracted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("scrape-product error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
