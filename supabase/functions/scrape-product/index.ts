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
    const extractionPrompt = `You are analyzing a product/business page. Extract ALL of the following structured data.
Return ONLY valid JSON, no markdown wrapping. If you cannot find data for a field, leave it as "" for strings or [] for arrays. Never omit a field.

Use these formulas to guide extraction:

PRODUCT DNA:
- description: [WHAT IT IS] + [NEW MECHANISM] + [OUTCOME] + [HOW IT WORKS] + [GUARANTEE]
- features: [OBSERVABLE THING ABOUT THE PRODUCT] — just the facts, no spin
- benefits: [FEATURE] → [WHAT IT MEANS FOR THE CUSTOMER]
- painPoints: [FRUSTRATION] + [SPECIFIC MOMENT] + [CONSEQUENCE] the product solves
- useCases: [SPECIFIC SITUATION] + [WHO IS IN IT] + [WHAT THIS PRODUCT REPLACES]
- targetScenarios: [DAY IN THE LIFE MOMENT] where the customer reaches for this product
- positioningStatement: "For [TARGET], [PRODUCT] is the [CATEGORY] that [KEY BENEFIT] because [REASON TO BELIEVE]"
- uniqueSellingPoints: [ONLY WE] + [CLAIM] + [MECHANISM] + [OUTCOME]
- competitiveAdvantages: [COMPETITOR APPROACH] vs [THIS PRODUCT'S APPROACH] + [WHY THIS WINS]
- commonObjections: [OBJECTION] → [REFRAME] → [PROOF]
- proofPoints: [CLAIM] + [TYPE OF PROOF] + [HOW TO USE]
- dosAndDonts: [WHAT TO SAY] vs [WHAT KILLS CONVERSION]
- powerPhrases: Full phrases that work as standalone hooks, CTAs, or body copy lines
- powerWords: Single words that trigger emotion, urgency, or trust
- technicalLevel: "Beginner", "Intermediate", or "Advanced" — how much jargon can the audience handle?
- refinementChecklist: Quality gates to run every ad/copy through before publishing

AUDIENCE DNA:
- description: [WHO] + [VALUES] + [CORE PAIN] + [DREAM OUTCOME] + [BUYING SIGNAL]
- buyingTriggers: [EMOTIONAL STATE] + [SPECIFIC MOMENT] + [WHAT PUSHES THEM OVER THE LINE]
- useCaseRequirements: [WHAT THE PRODUCT MUST DO] for this audience to consider it a success
- keySuccessIndicators: [HOW THE CUSTOMER KNOWS IT WORKED] — their definition of success
- additionalCharacteristics: [BEHAVIOURAL PATTERNS] that affect how and when they buy
- positioningStatement: "For [TARGET], [PRODUCT] is the [CATEGORY] that [BENEFIT] because [REASON TO BELIEVE]"
- valuePropositions: [SPECIFIC OUTCOME] + [TIME/EFFORT SAVED] + [RISK REMOVED] + [UNIQUE MECHANISM]
- engagementTriggers: [CONTENT TYPE] + [EMOTIONAL RESPONSE IT CREATES] + [ACTION IT DRIVES]
- attentionHooks: [SCROLL STOPPER] + [CURIOSITY GAP] + [BENEFIT PROMISE] — by awareness stage if possible
- commonObjections: [OBJECTION] → [EMOTIONAL REFRAME] → [LOGICAL PROOF]
- proofPoints: [WHAT THIS AUDIENCE TRUSTS MOST] → [HOW TO DELIVER IT]
- dosAndDonts: [WHAT RESONATES] vs [WHAT REPELS] for this specific audience
- powerPhrases: Phrases that resonate with this audience specifically
- powerWords: Words that trigger this audience's emotions
- technicalLevel: How much jargon can this audience handle?
- refinementChecklist: Quality checks specific to content targeting this audience

JSON structure:
{
  "product": {
    "name": "",
    "category": "",
    "description": "",
    "features": [],
    "benefits": [],
    "painPoints": [],
    "useCases": [],
    "targetScenarios": [],
    "positioningStatement": "",
    "uniqueSellingPoints": [],
    "competitiveAdvantages": [],
    "commonObjections": [{"objection": "", "response": ""}],
    "proofPoints": [{"category": "", "items": []}],
    "dosAndDonts": {"dos": [], "donts": []},
    "powerPhrases": [],
    "powerWords": [],
    "technicalLevel": "",
    "refinementChecklist": [],
    "images": [],
    "offers": [{"title": "", "originalPrice": "", "salePrice": "", "discount": "", "bundleDetails": "", "freeGifts": [], "isPopular": false}]
  },
  "brand": {
    "name": "",
    "category": ""
  },
  "audience": {
    "name": "",
    "description": "",
    "buyingTriggers": [],
    "useCaseRequirements": [],
    "keySuccessIndicators": [],
    "additionalCharacteristics": "",
    "positioningStatement": "",
    "valuePropositions": [],
    "engagementTriggers": [],
    "attentionHooks": [],
    "commonObjections": [{"objection": "", "response": ""}],
    "proofPoints": [{"category": "", "items": []}],
    "dosAndDonts": {"dos": [], "donts": []},
    "powerPhrases": [],
    "powerWords": [],
    "technicalLevel": "",
    "refinementChecklist": []
  }
}

Rules:
- Only include data you can confidently extract or intelligently infer from the page
- For audience fields, infer from the product's marketing language, tone, and who they're clearly targeting
- For brand, look for the company/brand name in the page
- Extract real image URLs if visible in the content
- Be thorough — fill as many fields as possible with quality data
- For commonObjections, think about what a skeptical buyer would ask
- For proofPoints, look for testimonials, guarantees, stats, certifications
- For dosAndDonts, infer from the brand's tone what communication style works

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
