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

const fetchPageFallback = async (targetUrl: string) => {
  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TimeWarpBot/1.0; +https://timewarpdev.com)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Direct fetch failed with status ${response.status}`);
  }

  const html = await response.text();
  return {
    markdown: htmlToText(html),
    metadata: {
      title: extractTitleFromHtml(html),
      sourceURL: targetUrl,
      statusCode: response.status,
    },
  };
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

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Extract base URL for homepage screenshots
    let baseUrl: string;
    try {
      baseUrl = new URL(formattedUrl).origin;
    } catch {
      baseUrl = formattedUrl;
    }

    console.log("Scraping URL:", formattedUrl, "Base URL:", baseUrl);

    // Step 1: Scrape with Firecrawl (desktop + branding) — use BASE URL for screenshots
    let scrapeData: any = null;
    let usedDirectFallback = false;

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: baseUrl,
        formats: ["markdown", "links", "branding", "screenshot"],
        onlyMainContent: false,
      }),
    });

    if (scrapeResponse.ok) {
      scrapeData = await scrapeResponse.json();
    } else {
      console.warn("Firecrawl scrape failed: status", scrapeResponse.status, "- retrying with lighter formats (no screenshot)");
      const retryResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: baseUrl,
          formats: ["markdown", "links", "branding"],
          onlyMainContent: false,
        }),
      });

      if (retryResponse.ok) {
        scrapeData = await retryResponse.json();
        console.log("Retry succeeded without screenshot");
      } else {
        console.error("Firecrawl retry also failed: status", retryResponse.status);
        try {
          const fallbackPage = await fetchPageFallback(formattedUrl);
          usedDirectFallback = true;
          scrapeData = {
            data: {
              markdown: fallbackPage.markdown,
              metadata: fallbackPage.metadata,
              branding: null,
              screenshot: null,
              links: [],
            },
          };
          console.log("Falling back to direct HTML fetch for extraction");
        } catch (fallbackError) {
          console.error("Direct fetch fallback also failed:", fallbackError);
          return new Response(
            JSON.stringify({ success: false, error: `Scraping failed for ${formattedUrl}. The site may be blocking automated requests or timing out.` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // For company URLs: discover product pages via Map API
    let productMarkdown = "";
    let productMetadata: any = {};
    let productPageContents: { url: string; markdown: string }[] = [];

    if (isCompanyUrl) {
      try {
        console.log("Company URL detected — mapping site for product pages...");
        const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: formattedUrl, search: "product", limit: 200 }),
        });
        if (mapRes.ok) {
          const mapData = await mapRes.json();
          const allUrls: string[] = (mapData.links || []).filter((u: string) => u && u.startsWith("http"));
          console.log("Map found", allUrls.length, "URLs");
          if (allUrls.length > 0) {
            const pickResText = await (await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [{ role: "user", content: `From these URLs, select up to 5 that are individual PRODUCT pages (pages showcasing a specific product or service for sale/subscription). Exclude category/collection pages, blog posts, about/legal/career/support pages.\n\nReturn ONLY a JSON array of URL strings. If none are product pages, return [].\n\nURLs:\n${allUrls.slice(0, 300).join('\n')}` }],
              }),
            })).text();
            try {
              const pickData = JSON.parse(pickResText);
              const raw = pickData.choices?.[0]?.message?.content || "";
              const arrMatch = raw.match(/\[[\s\S]*?\]/);
              if (arrMatch) {
                const selected: string[] = JSON.parse(arrMatch[0]).filter((u: any) => typeof u === 'string').slice(0, 5);
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
        } else {
          console.warn("Map API failed:", mapRes.status);
        }
      } catch (e) { console.warn("Map API error (non-fatal):", e); }
    } else if (!usedDirectFallback && baseUrl !== formattedUrl) {
      // Single product URL: scrape the specific product page
      try {
        const productScrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: formattedUrl,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        });
        if (productScrapeRes.ok) {
          const pd = await productScrapeRes.json();
          productMarkdown = pd.data?.markdown || pd.markdown || "";
          productMetadata = pd.data?.metadata || pd.metadata || {};
        } else {
          const fallbackPage = await fetchPageFallback(formattedUrl);
          productMarkdown = fallbackPage.markdown;
          productMetadata = fallbackPage.metadata;
        }
      } catch (e) {
        console.warn("Product page scrape failed (non-fatal):", e);
      }
    }

    const homepageMarkdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    let markdown: string;
    let metadata: any;

    if (isCompanyUrl && productPageContents.length > 0) {
      markdown = `--- HOMEPAGE: ${baseUrl} ---\n${homepageMarkdown.slice(0, 5000)}\n\n` +
        productPageContents.map(p => `--- PRODUCT PAGE: ${p.url} ---\n${p.markdown.slice(0, 5000)}`).join('\n\n');
      metadata = scrapeData.data?.metadata || scrapeData.metadata || {};
    } else {
      markdown = productMarkdown || homepageMarkdown;
      metadata = productMarkdown ? productMetadata : (scrapeData.data?.metadata || scrapeData.metadata || {});
    }

    const firecrawlBranding = scrapeData.data?.branding || scrapeData.branding || null;
    const websiteScreenshot = scrapeData.data?.screenshot || scrapeData.screenshot || null;

    console.log("Scraped content length:", markdown.length, "screenshot:", !!websiteScreenshot, "productPages:", productPageContents.length);
    if (firecrawlBranding) console.log("Firecrawl branding data found");

    // Step 1b: Mobile screenshot (parallel) — use BASE URL
    const mobileScreenshotPromise = (async () => {
      try {
        console.log("Fetching mobile screenshot for base URL...");
        const mobileRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: baseUrl,
            formats: ["screenshot"],
            mobile: true,
          }),
        });
        if (mobileRes.ok) {
          const mobileData = await mobileRes.json();
          const mobileSS = mobileData.data?.screenshot || mobileData.screenshot;
          if (mobileSS) {
            return typeof mobileSS === 'string' && mobileSS.startsWith('http')
              ? mobileSS
              : `data:image/png;base64,${mobileSS}`;
          }
        }
      } catch (e) {
        console.warn("Mobile screenshot error (non-fatal):", e);
      }
      return null;
    })();

    // Step 2: Extract structured data with AI
    const extractionPrompt = `You are a Product & Audience DNA analyst. Your job is to extract structured data from a product page using the exact formulas and output style below. Study the formulas and example outputs carefully — they define the TONE, DEPTH, and FORMAT of your answers.

If you cannot confidently extract or infer a field, leave it as "" for strings or [] for arrays. Never omit a field. Never be generic — every output must feel specific to THIS product.

Return ONLY valid JSON, no markdown wrapping.

═══════════════════════════════════════
🧬 PRODUCT DNA FORMULAS & EXAMPLES
═══════════════════════════════════════

1. PRODUCT DESCRIPTION
Formula: [WHAT IT IS] + [NEW MECHANISM] + [OUTCOME] + [HOW IT WORKS] + [GUARANTEE]
Example: "Scrubby is the first shampoo-infused dog cleaning glove that removes dirt, mud, and harmful bacteria in seconds — no bath needed. Wet, lather, scrub, wipe. Done. Backed by a 100% money-back guarantee."

2. KEY FEATURES
Formula: [OBSERVABLE THING ABOUT THE PRODUCT] — just the facts, no spin
Example:
- "Shampoo pre-infused into the glove material"
- "Single-use glove format (5 per pack)"
- "Rinse-free — no water needed after use"

3. KEY BENEFITS
Formula: [FEATURE] → [WHAT IT MEANS FOR THE CUSTOMER]
Example:
- "Pre-infused shampoo → clean dog with nothing extra to buy or carry"
- "Works in seconds → mud stopped at the door before it hits your floors"
- "Glove format → you're in control — feels natural, not clinical"

4. TARGET PAIN POINTS
Formula: [FRUSTRATION] + [SPECIFIC MOMENT] + [CONSEQUENCE]
Example:
- "Muddy paws post-walk → frustration + stress → dirty floors, furniture, carpets ruined"
- "Full bath nightmare → dog resists, takes 20 mins, soaks the bathroom → owner dreads it daily"
- "Time pressure → no time for a proper clean → walk becomes a source of anxiety"

5. PRIMARY USE CASES
Formula: [SPECIFIC SITUATION] + [WHO IS IN IT] + [WHAT THIS PRODUCT REPLACES]
Example:
- "Post-walk muddy paw cleanup — replaces full bath"
- "Travel/camping with dog — replaces carrying shampoo and finding water source"
- "Daily maintenance between full grooms — replaces expensive groomer visits"

6. TARGET SCENARIOS
Formula: [DAY IN THE LIFE MOMENT] where the customer reaches for this product
Example:
- "It's 7am, raining, dog just sprinted through mud, you're leaving for work in 10 minutes"
- "Guests arriving in an hour, dog smells from this morning's walk"
- "Partner complaining about muddy paw prints on the sofa — again"

7. POSITIONING STATEMENT
Formula: "For [TARGET], [PRODUCT] is the [CATEGORY] that [KEY BENEFIT] because [REASON TO BELIEVE]"
Example: "For busy dog owners who dread post-walk cleanup, Scrubby is the only cleaning glove that eliminates the need for a bath entirely — because the shampoo is already built in, and it works in under 60 seconds."

8. UNIQUE SELLING POINTS
Formula: [ONLY WE] + [CLAIM] + [MECHANISM] + [OUTCOME]
Example:
- "Only shampoo-infused glove — no other product has soap pre-loaded into the material"
- "Only solution that's simultaneously rinse-free, fragrance-free, and bacteria-eliminating"

9. COMPETITIVE ADVANTAGES
Formula: [COMPETITOR APPROACH] vs [THIS PRODUCT'S APPROACH] + [WHY THIS WINS]
Example:
- "Dog wipes: No shampoo, bacteria remain → Scrubby kills bacteria, not just wipes surface"
- "Full bath: 20+ minutes, dog resists → Scrubby is 60 seconds, dog tolerates it"

10. COMMON OBJECTIONS
Formula: [OBJECTION] → [REFRAME] → [PROOF]
Example:
- objection: "Does it actually work or just smear the mud around?"
- response: "The shampoo activates on contact and lifts dirt from the coat — it doesn't smear, it emulsifies. Proof: Cocamidopropyl Betaine is a professional-grade surfactant used in premium pet groomers"

11. PROOF POINTS
Formula: [CLAIM] + [TYPE OF PROOF] + [HOW TO USE IN AD]
Example:
- category: "Mechanism", items: ["UGC video: Works in 60 seconds — before/after in real time"]
- category: "Cost Efficiency", items: ["4 cleanings for less than one groomer visit"]
- category: "Risk-free", items: ["Money-back guarantee — Try it. If it doesn't work, we pay you back."]

12. DO'S AND DON'TS
Formula: [WHAT TO SAY] vs [WHAT KILLS CONVERSION]
Example Do's:
- "Use sensory language: 'muddy paws', 'clean coat', 'spotless floors'"
- "Lean into the guarantee: 'zero risk', 'money back, no questions'"
Example Don'ts:
- "Never say 'innovative' or 'revolutionary' — sounds like every other brand"
- "Never be vague: 'cleaner dog' is weak. 'Clean in 60 seconds at the door' is strong"

13. POWER PHRASES
Formula: Full phrases that work as standalone hooks, CTAs, or body copy lines
Example:
- "Clean dog. 60 seconds. No bath."
- "The shampoo is already in the glove."
- "Mud stops at the door."

14. POWER WORDS
Formula: Single words that trigger emotion, urgency, or trust
Example: Speed: Seconds, Instant, Done | Ease: Simple, Effortless | Trust: Guaranteed, Risk-free, Proven

15. TECHNICAL LEVEL
Formula: How much jargon can the audience handle?
Example: "LOW — Zero ingredient names in hooks. Lead with outcome."

16. REFINEMENT CHECKLIST
Formula: Quality gates to run every ad/copy through before publishing
Example:
- "Does it feel NEW? → First [mechanism] in the category"
- "Is the mechanism 3 steps or fewer?"
- "Does the hook lead with pain before solution?"

═══════════════════════════════════════
👥 AUDIENCE DNA FORMULAS & EXAMPLES
═══════════════════════════════════════

1. AUDIENCE DESCRIPTION
Formula: [WHO] + [VALUES] + [CORE PAIN] + [DREAM OUTCOME] + [BUYING SIGNAL]
Example: "Busy dog owners aged 28–55 who treat their pets like family. House-proud, convenience-driven, fed up with muddy paws wrecking their home after every walk. They want a 60-second clean at the door — no bath, no drama. They buy once they see proof it works, especially with a guarantee."

2. BUYING TRIGGERS
Formula: [EMOTIONAL STATE] + [SPECIFIC MOMENT] + [WHAT PUSHES THEM OVER THE LINE]
Example:
- "Dog comes back filthy from a rainy walk — AGAIN → 'I need to fix this today'"
- "Sees UGC video of product working in real time → 'That's exactly my problem'"

3. USE CASE REQUIREMENTS
Formula: [WHAT THE PRODUCT MUST DO] for this audience to consider it a success
Example:
- "Must work in under 2 minutes — they're time-poor"
- "Must not require additional tools — or it's as bad as a bath"

4. KEY SUCCESS INDICATORS
Formula: [HOW THE CUSTOMER KNOWS IT WORKED] — their definition of success, not yours
Example:
- "Dog's coat looks and feels clean — no visible mud, no smell"
- "Took under 60 seconds — didn't disrupt the morning routine"

5. ADDITIONAL CHARACTERISTICS
Formula: [BEHAVIOURAL PATTERNS] that affect how and when they buy
Example: "Scrolls Facebook/Instagram in the evening after walks — peak ad window: 7–9pm. Buys pet products online regularly — not a new behaviour, low friction. Influenced by UGC over polished ads."

6. AUDIENCE POSITIONING STATEMENT
Formula: "For [TARGET], [PRODUCT] is the [CATEGORY] that [BENEFIT] because [REASON TO BELIEVE]"

7. VALUE PROPOSITIONS
Formula: [SPECIFIC OUTCOME] + [TIME/EFFORT SAVED] + [RISK REMOVED] + [UNIQUE MECHANISM]

8. ENGAGEMENT TRIGGERS
Formula: [CONTENT TYPE] + [EMOTIONAL RESPONSE IT CREATES] + [ACTION IT DRIVES]
Example:
- "Before/after video → relief + surprise → share + comment + buy"
- "Bundle deal with countdown → FOMO + urgency → direct purchase"

9. ATTENTION HOOKS
Formula: [SCROLL STOPPER] + [CURIOSITY GAP] + [BENEFIT PROMISE] — by awareness stage if possible
Example:
- Unaware: "Dog owners are wasting 3 hours a week on something that now takes 60 seconds"
- Problem Aware: "Muddy paws after every walk — there's finally something that actually fixes it"

10. AUDIENCE OBJECTIONS
Formula: [OBJECTION] → [EMOTIONAL REFRAME] → [LOGICAL PROOF]

11. AUDIENCE PROOF POINTS
Formula: [WHAT THIS AUDIENCE TRUSTS MOST] → [HOW TO DELIVER IT]
Example:
- category: "UGC video", items: ["Dog owners trust other dog owners — real person, real dog, real walk"]

12. AUDIENCE DO'S AND DON'TS
Formula: [WHAT RESONATES] vs [WHAT REPELS] for this specific audience
Example Do's:
- "Speak like a fellow dog owner, not a brand"
- "Make the time benefit specific: '60 seconds' beats 'quick and easy'"
Example Don'ts:
- "Don't use clinical language in the hook — save ingredient names for body copy"

13. AUDIENCE POWER PHRASES
Example:
- "No bath. No rinse. No drama."
- "Your dog is clean before you take your coat off."

14. AUDIENCE POWER WORDS
Example: Relief: Finally, Done, Over, Never again | Trust: Guaranteed, Proven, Safe | Urgency: Today, Now, Most popular

15. AUDIENCE TECHNICAL LEVEL
Formula: Calibrate complexity by segment
Example: "LOW — Pure outcome: 'clean dog in 60 seconds, no bath'"

16. AUDIENCE REFINEMENT CHECKLIST
Formula: Quality gates for audience-targeted content
Example:
- "Can you picture this exact person?"
- "Is this a daily frustration, not a hypothetical?"
- "Are you using their language?"

═══════════════════════════════════════

═══════════════════════════════════════
🎨 BRANDING DNA FORMULAS & EXAMPLES
═══════════════════════════════════════

1. PRIMARY LOGO
Formula: [MARK TYPE] + [WHAT IT SYMBOLISES] + [WHERE IT MUST WORK] + [WHAT BREAKS IT]
Example: "Wordmark logo in deep blue. Symbolises clarity and precision. Must work at 32px favicon, full-width header, and white/dark backgrounds. Never stretch, recolour, or place on busy backgrounds."

2. BRAND COLORS
Formula: [PRIMARY EMOTION] + [COLOR ROLE] + [WHAT IT MUST NEVER DO] + [ACCESSIBILITY RULE]
Example: "Primary #3B82F6 → Trust + action. Used on all CTAs and highlights. Never used as background behind small text. Minimum 4.5:1 contrast ratio."

3. TYPOGRAPHY
Formula: [FONT PERSONALITY] + [HIERARCHY RULES] + [WHAT IT MUST NEVER BE] + [BRAND VOICE IT EXPRESSES]

4. MOODBOARD
Formula: [WORLD THE BRAND LIVES IN] + [LIGHTING & TEXTURE] + [WHAT IT FEELS LIKE] + [WHAT IT MUST NEVER FEEL LIKE]
Example: "The brand lives in a world of precision and possibility — dark UI interfaces, glowing data lines. Lighting is cool, controlled, intentional. Looking at it should feel like stepping into the future. It must never feel warm, rustic, or human-casual."

5. ILLUSTRATIONS
Formula: [STYLE FINGERPRINT] + [WHERE THEY'RE USED] + [WHAT THEY COMMUNICATE] + [WHAT MAKES THEM OWNABLE]
Example: "Flat-vector with thin strokes and blue/gray palette. Used for explainer graphics, empty states, and social posts. Ownable because of the consistent node/network motif."

6. IMAGE GUIDELINES
Formula: [WHAT TO SHOOT/USE] + [LIGHTING RULE] + [SUBJECT RULE] + [WHAT TO NEVER SHOW]

7. WEBSITE & DIGITAL
Formula: [LAYOUT PHILOSOPHY] + [CONTENT HIERARCHY] + [EMOTIONAL JOURNEY] + [WHAT ONE PAGE MUST ALWAYS DO]
Example: "Minimalist grid with generous white space. Content flows: problem → mechanism → solution → proof → CTA. Every page must end with one clear, frictionless next action."

8. BUTTONS & UI ELEMENTS
Formula: [HIERARCHY RULE] + [SHAPE LANGUAGE] + [COLOR SYSTEM] + [WHAT INTERACTION FEELS LIKE]
Example: "Primary = filled blue, white text, 6px radius → 'Take this action now'. Secondary = outlined. Hover darkens 10% — feels responsive, confident, not flashy."

9. SOCIAL MEDIA
Formula: [CONTENT PILLARS] + [VISUAL RULES] + [TONE OF VOICE] + [WHAT SUCCESS LOOKS LIKE PER FORMAT]

═══════════════════════════════════════

${isCompanyUrl && productPageContents.length > 0
  ? `MULTI-PRODUCT MODE: Multiple product pages from the same company are provided below. Extract up to ${productPageContents.length} products (one per page) and one matching audience per product. All share a single brand.`
  : `SINGLE-PRODUCT MODE: Extract exactly one product and one audience from the page content below. Return arrays with exactly 1 element each.`}

JSON structure to return:
{
  "products": [{
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
  }],
  "brand": {
    "name": "",
    "category": "",
    "colors": {
      "primary": "#hex",
      "secondary": "#hex",
      "background": "#hex",
      "text": "#hex"
    },
    "typography": {
      "fontFamily": "",
      "fontStyle": "",
      "fontWeight": "400"
    },
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
  },
  "audiences": [{
    "name": "",
    "description": "",
    "avatarPrompt": "",
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
  }]
}

IMPORTANT RULES:
- Follow the formula EXACTLY for each field — match the tone and specificity of the examples
- Every output should feel like it was written by a direct-response copywriter, not a generic AI
- For audience fields, infer from the product's marketing language, tone, and who they're clearly targeting
- Extract real image URLs if visible in the content
- Be thorough — fill as many fields as possible with quality data
- For brand colors: extract the dominant primary, secondary, background, and text colors visible on the page (use hex format)
- For brand typography: identify the main font family, describe the style, and estimate the dominant weight (300-700)
- For brand logoUrls: extract ONLY actual logo image URLs (not product photos). Look for images with 'logo' in the URL or alt text.
- For brand visualIdentity: apply the Branding DNA formulas above to fill logoDescription, moodboardDescription, illustrationGuidelines, imageGuidelines, websiteRules, buttonRules, and socialMediaRules. Be specific and actionable — not generic.
- For multi-product mode: create one entry per product page. Each product gets a matching audience.

Page URL: ${formattedUrl}
Page title: ${metadata.title || "Unknown"}

${firecrawlBranding ? `Firecrawl extracted branding data (use this as primary source for brand colors, fonts, and logos):
${JSON.stringify(firecrawlBranding, null, 2)}

` : ""}Page content:
${markdown.slice(0, isCompanyUrl ? 30000 : 15000)}`;

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
      console.error("AI extraction error: status", aiResponse.status);
      return new Response(
        JSON.stringify({ success: false, error: "AI extraction failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Defensive: read as text first to avoid "Unexpected end of JSON input"
    const aiBodyText = await aiResponse.text();
    if (!aiBodyText || !aiBodyText.trim()) {
      console.error("AI extraction returned empty body");
      return new Response(
        JSON.stringify({ success: false, error: "AI extraction returned empty response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    let aiData: any;
    try {
      aiData = JSON.parse(aiBodyText);
    } catch (jsonErr) {
      console.error("AI extraction response is not valid JSON:", (jsonErr as Error).message);
      return new Response(
        JSON.stringify({ success: false, error: "AI extraction returned invalid response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let extracted;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (parseErr) {
      console.error("JSON parse error in AI response");
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse extracted data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ══════════════════════════════════════════════════
    // NORMALIZE: Ensure products[] and audiences[] arrays exist
    // ══════════════════════════════════════════════════
    if (extracted.products && !extracted.product) {
      extracted.product = extracted.products[0] || {};
    }
    if (extracted.product && !extracted.products) {
      extracted.products = [extracted.product];
    }
    if (extracted.audiences && !extracted.audience) {
      extracted.audience = extracted.audiences[0] || null;
    }
    if (extracted.audience && !extracted.audiences) {
      extracted.audiences = [extracted.audience];
    }
    if (!extracted.products) extracted.products = [];
    if (!extracted.audiences) extracted.audiences = [];

    // ══════════════════════════════════════════════════
    // POST-EXTRACTION: Merge branding + generate assets
    // ══════════════════════════════════════════════════

    // Ensure visualIdentity always exists before async promises write to it
    if (!extracted.brand) extracted.brand = {};
    if (!extracted.brand.visualIdentity) extracted.brand.visualIdentity = {};

    if (firecrawlBranding && extracted.brand) {
      // ── Logos: ONLY actual logos, not product photos ──
      const fcLogos: string[] = [];
      if (firecrawlBranding.logo) fcLogos.push(firecrawlBranding.logo);
      if (firecrawlBranding.images?.logo && firecrawlBranding.images.logo !== firecrawlBranding.logo) {
        fcLogos.push(firecrawlBranding.images.logo);
      }
      if (fcLogos.length === 0 && firecrawlBranding.images?.favicon) {
        fcLogos.push(firecrawlBranding.images.favicon);
      }
      // Filter AI logos to only those that look like actual logos
      const aiLogos = (Array.isArray(extracted.brand.logoUrls) ? extracted.brand.logoUrls : [])
        .filter((u: string) => u && (u.toLowerCase().includes('logo') || u.toLowerCase().includes('brand') || u.endsWith('.svg')));
      extracted.brand.logoUrls = [...new Set([...fcLogos, ...aiLogos])].filter(Boolean);

      // ── Colors fallback ──
      if (firecrawlBranding.colors) {
        const fc = firecrawlBranding.colors;
        if (!extracted.brand.colors || extracted.brand.colors.primary === "#hex" || !extracted.brand.colors.primary) {
          extracted.brand.colors = {
            primary: fc.primary || fc.accent || "#4A86FF",
            secondary: fc.secondary || "#6B7280",
            background: fc.background || "#FFFFFF",
            text: fc.textPrimary || fc.textSecondary || "#000000",
          };
        }
      }

      // ── Typography fallback ──
      if (firecrawlBranding.typography?.fontFamilies) {
        const fcFonts = firecrawlBranding.typography.fontFamilies;
        if (!extracted.brand.typography?.fontFamily || extracted.brand.typography.fontFamily === "") {
          extracted.brand.typography = {
            ...extracted.brand.typography,
            fontFamily: fcFonts.primary || fcFonts.heading || "Sans-serif",
          };
        }
      }

      // ── Visual identity from Firecrawl components ──
      if (!extracted.brand.visualIdentity?.buttonRules?.length && !extracted.brand.visualIdentity?.websiteRules?.length) {
        const vi: any = { imageGuidelines: [], websiteRules: [], buttonRules: [], socialMediaRules: [] };
        if (firecrawlBranding.components?.buttonPrimary) {
          const btn = firecrawlBranding.components.buttonPrimary;
          vi.buttonRules.push(`Primary buttons: ${btn.borderRadius || '8px'} radius, ${btn.background || 'brand color'} fill, ${btn.textColor || 'white'} text`);
        }
        if (firecrawlBranding.components?.buttonSecondary) {
          const btn = firecrawlBranding.components.buttonSecondary;
          vi.buttonRules.push(`Secondary buttons: ${btn.borderRadius || '8px'} radius, ${btn.background || 'transparent'} fill`);
        }
        if (firecrawlBranding.spacing) {
          vi.websiteRules.push(`Base spacing unit: ${firecrawlBranding.spacing.baseUnit || 8}px`);
          vi.websiteRules.push(`Border radius: ${firecrawlBranding.spacing.borderRadius || '8px'}`);
        }
        if (vi.buttonRules.length || vi.websiteRules.length) {
          extracted.brand.visualIdentity = { ...extracted.brand.visualIdentity, ...vi };
        }
      }
    }

    // ── Moodboard: Search web for aesthetic images, AI fallback ──
    const moodboardPromise = (async () => {
      try {
        const audienceDesc = extracted.audience?.description || "general consumers";
        const brandCategory = extracted.brand?.category || "lifestyle";
        const brandName = extracted.brand?.name || "the brand";
        const audiencePainPoints = (extracted.product?.painPoints || []).slice(0, 3).join('; ');
        const audiencePowerPhrases = (extracted.audience?.powerPhrases || []).slice(0, 3).join('; ');
        const productDescription = (extracted.product?.description || '').slice(0, 200);

        // Step 1: Generate 6 aesthetic search terms using AI
        console.log("Generating moodboard aesthetic terms...");
        const termsRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{
              role: "user",
              content: `Generate exactly 6 aesthetic search terms for a moodboard.

Use this framework for each term:
[audience visual/product scene] + [trust feeling/emotion] + premium minimal e-commerce

Brand: "${brandName}" (${brandCategory})
Product: ${productDescription}
Target audience: ${audienceDesc.split('.').slice(0, 3).join('.')}
Pain points: ${audiencePainPoints || 'general consumer frustrations'}
Power phrases: ${audiencePowerPhrases || 'convenience, quality, trust'}

Return ONLY a JSON array of 6 phrases. No explanation.`
            }],
          }),
        });

        let aestheticTerms: string[] = [];
        if (termsRes.ok) {
          const termsData = await termsRes.json();
          const termsRaw = termsData.choices?.[0]?.message?.content || "";
          try {
            const arrMatch = termsRaw.match(/\[[\s\S]*?\]/);
            if (arrMatch) aestheticTerms = JSON.parse(arrMatch[0]);
          } catch (e) { console.warn("Terms parse error:", e); }
        }

        if (aestheticTerms.length === 0) {
          aestheticTerms = [
            `${brandCategory} product showcase + trust + premium minimal e-commerce`,
            `${brandCategory} lifestyle + warm confidence + premium minimal e-commerce`,
            `${brandCategory} texture detail + calm sophistication + premium minimal e-commerce`,
            `clean packaging flat lay + quality assurance + premium minimal e-commerce`,
            `aspirational lifestyle moment + empowerment + premium minimal e-commerce`,
            `editorial product photography + reliability + premium minimal e-commerce`,
          ];
        }
        console.log("Moodboard terms:", aestheticTerms);

        // Step 2: Search the web for each term, extract image URLs from results
        const imgUrlRegex = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/gi;

        const moodboardResults = await Promise.allSettled(
          aestheticTerms.slice(0, 6).map(async (term) => {
            try {
              console.log(`Searching for: ${term}`);
              const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  query: `${term} aesthetic photography`,
                  limit: 5,
                  scrapeOptions: { formats: ["markdown"] },
                }),
              });

              if (!searchRes.ok) {
                console.warn(`Search failed for "${term}": ${searchRes.status}`);
                return null;
              }

              const searchData = await searchRes.json();
              const results = searchData.data || [];

              // Collect image URLs from search results' markdown content and metadata
              const allImgUrls: string[] = [];
              for (const r of results) {
                // Check metadata for og:image
                if (r.metadata?.ogImage) allImgUrls.push(r.metadata.ogImage);
                // Extract from markdown content
                const content: string = r.markdown || r.description || "";
                imgUrlRegex.lastIndex = 0;
                let match;
                while ((match = imgUrlRegex.exec(content)) !== null) {
                  allImgUrls.push(match[0]);
                }
              }

              // Filter out tiny/icon images
              const goodImg = allImgUrls.find(url =>
                !url.includes('/icon') && !url.includes('/favicon') &&
                !url.includes('/logo') && url.length > 30
              );
              if (goodImg) {
                console.log(`✓ Found moodboard image for "${term}": ${goodImg.slice(0, 80)}...`);
                return goodImg;
              }

              console.warn(`No image found for "${term}"`);
              return null;
            } catch (e) {
              console.warn(`Moodboard error for "${term}":`, e);
              return null;
            }
          })
        );

        const moodboardUrls = moodboardResults
          .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && !!r.value)
          .map(r => r.value);

        // Step 3: AI generation fallback for missing slots
        const missing = 6 - moodboardUrls.length;
        if (missing > 0) {
          console.log(`Generating ${missing} moodboard images with AI...`);
          const fallbackTerms = aestheticTerms.slice(moodboardUrls.length, moodboardUrls.length + missing);
          const fallbackResults = await Promise.allSettled(
            fallbackTerms.map(async (term) => {
              try {
                const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    model: "google/gemini-2.5-flash-image",
                    messages: [{ role: "user", content: `Create a beautiful moodboard reference image for a ${brandCategory} brand called "${brandName}". Aesthetic: ${term}. Professional, editorial quality. No text, no logos, no watermarks. Pure visual mood and atmosphere.` }],
                    modalities: ["image", "text"],
                  }),
                });
                if (res.ok) {
                  const d = await res.json();
                  return d.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
                }
                return null;
              } catch { return null; }
            })
          );
          for (const r of fallbackResults) {
            if (r.status === 'fulfilled' && r.value) moodboardUrls.push(r.value);
          }
        }

        extracted.brand.visualIdentity.moodboardUrls = moodboardUrls;
        console.log("Final moodboard count:", moodboardUrls.length);
      } catch (e) {
        console.error("Moodboard pipeline error:", e);
        extracted.brand.visualIdentity.moodboardUrls = [];
      }
    })();

    // ── Desktop screenshot ──
    if (websiteScreenshot) {
      extracted.brand.visualIdentity.websiteScreenshot = typeof websiteScreenshot === 'string' && websiteScreenshot.startsWith('http')
        ? websiteScreenshot
        : `data:image/png;base64,${websiteScreenshot}`;
    }

    // ── Wait for mobile screenshot ──
    const mobileScreenshot = await mobileScreenshotPromise;
    if (mobileScreenshot) {
      extracted.brand.visualIdentity.mobileScreenshot = mobileScreenshot;
      console.log("Mobile screenshot captured");
    }

    // ══════════════════════════════════════════════
    // AI IMAGE GENERATION (logo, illustrations, guideline images, social media)
    // ══════════════════════════════════════════════

    const brandName = extracted.brand?.name || "the brand";
    const brandColors = extracted.brand?.colors || {};
    const brandCategory = extracted.brand?.category || "general";
    const audienceDesc = extracted.audience?.description || "general consumers";
    const guidelines = extracted.brand?.visualIdentity?.imageGuidelines || [];
    const productImages = extracted.product?.images || [];

    const aiImagePromises: Promise<void>[] = [];

    // ── Logo: use found image URLs, or AI-recreate the logo ──
    if (!extracted.brand.logoUrls || extracted.brand.logoUrls.length === 0) {
      if (websiteScreenshot) {
        aiImagePromises.push((async () => {
          try {
            console.log("Recreating logo with AI from screenshot...");
            const ssUrl = typeof websiteScreenshot === 'string' && websiteScreenshot.startsWith('http')
              ? websiteScreenshot
              : `data:image/png;base64,${websiteScreenshot}`;
            const logoRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-3-pro-image-preview",
                messages: [{
                  role: "user",
                  content: [
                    { type: "text", text: `Faithfully reproduce this exact logo visible in the top/header area of this website screenshot. Match every detail precisely: letterforms, icon/symbol, colors, proportions, and spacing. The reproduction must be pixel-accurate to the original. Output the logo isolated on a clean white background. No extra elements, no interpretation — just the exact logo as it appears.` },
                    { type: "image_url", image_url: { url: ssUrl } }
                  ]
                }],
                modalities: ["image", "text"],
              }),
            });
            if (logoRes.ok) {
              const d = await logoRes.json();
              const img = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
              if (img) {
                extracted.brand.logoUrls = [img];
                console.log("AI-recreated logo from screenshot");
              }
            }
          } catch (e) { console.warn("Logo recreation error:", e); }
        })());
      }
    }

    // ── Generate icon grid + pattern sheet — NO TEXT allowed ──
    aiImagePromises.push((async () => {
      try {
        console.log("Generating brand icon grid and pattern sheet...");
        const illustrationUrls: string[] = [];
        const ssUrl = websiteScreenshot
          ? (typeof websiteScreenshot === 'string' && websiteScreenshot.startsWith('http')
              ? websiteScreenshot
              : `data:image/png;base64,${websiteScreenshot}`)
          : null;

        const audienceBuyingTriggers = (extracted.audience?.buyingTriggers || []).slice(0, 3).join('; ');
        const productBenefits = (extracted.product?.benefits || []).slice(0, 4).join('; ');
        const productUseCases = (extracted.product?.useCases || []).slice(0, 3).join('; ');
        
        // Image 1: Icon grid — ICONS ONLY, NO TEXT whatsoever
        const iconsMessages: any[] = [
          { role: "system", content: "You are an image generator. ABSOLUTE RULE: Never include any text, letters, numbers, labels, captions, or words of any kind in generated images. Output pure visual graphics only. No annotations, no watermarks, no signatures." },
          {
          role: "user",
          content: ssUrl ? [
            { type: "text", text: `Study this website screenshot for visual style reference only. Create a set of 12 individual icons arranged in a clean 3-column × 4-row grid on a white background.

CRITICAL RULE — ZERO TEXT: Do NOT include any labels, captions, titles, watermarks, or any form of written language beneath, beside, or on top of the icons. The output must contain ZERO readable characters. No letters. No numbers. No words. Pure graphic symbols only.

The icons must represent concepts from the AUDIENCE's world and the PRODUCT's benefits:
- Product benefits: ${productBenefits || 'quality, convenience, value'}
- Audience needs: ${audienceBuyingTriggers || 'ease of use, time saving, reliability'}
- Use cases: ${productUseCases || 'daily use, convenience'}

Each icon should symbolize a benefit, pain point, or use case (e.g., clock for speed, shield for protection, heart for care, target for precision, thumbs-up for ease).
- Drawn in a clean style using the brand's color palette: primary ${brandColors.primary || '#333'}, secondary ${brandColors.secondary || '#666'}
- Well-separated with generous spacing
- Mix of outlined and filled styles
- ABSOLUTELY NO TEXT, NO LABELS, NO CAPTIONS, NO LETTERS, NO NUMBERS. White background.
Brand: "${brandName}", category: ${brandCategory}` },
            { type: "image_url", image_url: { url: ssUrl } }
          ] : `Generate a set of 12 individual icons arranged in a clean 3-column × 4-row grid on a white background.

CRITICAL RULE — ZERO TEXT: Do NOT include any labels, captions, titles, watermarks, or any form of written language beneath, beside, or on top of the icons. The output must contain ZERO readable characters. Pure graphic symbols only.

Icons should represent: ${productBenefits || 'quality, convenience, value'} and audience needs: ${audienceBuyingTriggers || 'ease of use, time saving'}. Brand: "${brandName}", category: ${brandCategory}. Brand colors: primary ${brandColors.primary || '#333'}, secondary ${brandColors.secondary || '#666'}. Mix of outlined and filled styles. Clean, professional. ABSOLUTELY NO TEXT, NO LABELS, NO LETTERS, NO NUMBERS.`
        }];

        const iconsRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: iconsMessages,
            modalities: ["image", "text"],
          }),
        });
        if (iconsRes.ok) {
          const d = await iconsRes.json();
          const img = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (img) {
            illustrationUrls.push(img);
            console.log("✓ Generated icon grid");
          }
        }

        // Image 2: Pattern sheet — NO TEXT allowed
        const audiencePowerWords = (extracted.audience?.powerWords || []).slice(0, 5).join(', ');
        const patternMessages: any[] = [
          { role: "system", content: "You are an image generator. ABSOLUTE RULE: Never include any text, letters, numbers, labels, captions, or words of any kind in generated images. Output pure visual graphics only. No annotations, no watermarks, no signatures." },
          {
          role: "user",
          content: ssUrl ? [
            { type: "text", text: `Study this website screenshot for color reference. Create a pattern reference sheet showing 2-3 distinct decorative patterns/backgrounds stacked vertically.

CRITICAL RULE — ZERO TEXT: The output must contain ZERO readable characters. Do NOT include any labels, captions, titles, watermarks, signatures, annotations, or any form of written language anywhere in the image. Pure abstract visual patterns only.

These patterns should evoke the EMOTIONAL WORLD of the target audience:
- Audience: ${(extracted.audience?.description || '').split('.').slice(0, 2).join('.')}
- Emotional keywords: ${audiencePowerWords || 'trust, comfort, confidence'}
- Brand tone: ${extracted.product?.positioningStatement?.slice(0, 150) || brandCategory}

Include:
1. A flowing, organic wave/curve pattern using the brand's color palette — evoking the audience's aspirational feelings
2. A geometric/abstract section showing rounded shapes or decorative elements that feel approachable and on-brand
3. A subtle tileable texture suitable for website section backgrounds

Brand colors: primary ${brandColors.primary || '#333'}, secondary ${brandColors.secondary || '#666'}, background ${brandColors.background || '#fff'}.
Each pattern clearly separated. Professional quality. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO LABELS, NO WATERMARKS.` },
            { type: "image_url", image_url: { url: ssUrl } }
          ] : `Generate a pattern reference sheet for "${brandName}" targeting audience: ${(extracted.audience?.description || '').split('.').slice(0, 2).join('.')}. Emotional keywords: ${audiencePowerWords || 'trust, comfort'}.

CRITICAL RULE — ZERO TEXT: The output must contain ZERO readable characters. No labels, no captions, no titles, no watermarks, no signatures, no annotations. Pure abstract visual patterns only.

Show 2-3 distinct patterns stacked vertically:
1. Flowing organic wave/curve pattern with gradients in brand colors
2. Geometric/abstract section with rounded shapes
3. Subtle tileable texture for backgrounds
Brand colors: primary ${brandColors.primary || '#333'}, secondary ${brandColors.secondary || '#666'}, background ${brandColors.background || '#fff'}. Professional, modern. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO LABELS.`
        }];

        const patternRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: patternMessages,
            modalities: ["image", "text"],
          }),
        });
        if (patternRes.ok) {
          const d = await patternRes.json();
          const img = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (img) {
            illustrationUrls.push(img);
            console.log("✓ Generated pattern sheet");
          }
        }

        if (illustrationUrls.length > 0) {
          extracted.brand.visualIdentity.illustrationUrls = illustrationUrls;
          console.log("Generated", illustrationUrls.length, "illustrations");
        }
      } catch (e) { console.error("Illustration gen error:", e); }
    })());

    // ── Audience Avatar: Generate a portrait based on audience description ──
    aiImagePromises.push((async () => {
      try {
        const audienceDesc = extracted.audience?.description || "";
        const audienceName = extracted.audience?.name || "Target Customer";
        const avatarPromptHint = extracted.audience?.avatarPrompt || "";
        
        if (!audienceDesc || audienceDesc.length < 20) {
          console.log("Skipping avatar generation — no audience description");
          return;
        }

        console.log("Generating audience avatar...");
        
        const avatarPrompt = `Generate a professional, realistic portrait photograph of a single person who represents this target audience:

"${audienceDesc.slice(0, 500)}"
${avatarPromptHint ? `\nAdditional visual hints: ${avatarPromptHint}` : ''}

Create a high-quality headshot or upper-body portrait with:
- Natural lighting, professional quality
- Neutral or slightly warm background (blurred)
- Authentic, relatable appearance matching the demographic
- Friendly, approachable expression
- Professional but not overly corporate
- Age, style, and appearance that matches the target customer description

This should look like a real customer testimonial photo or persona portrait. NO text, NO labels, NO watermarks. Just the portrait.`;

        const avatarRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: avatarPrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (avatarRes.ok) {
          const d = await avatarRes.json();
          const avatarUrl = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (avatarUrl) {
            extracted.audience.avatarUrl = avatarUrl;
            console.log("✓ Generated audience avatar");
          }
        } else {
          console.warn("Avatar generation failed:", avatarRes.status);
        }
      } catch (e) { console.error("Avatar generation error:", e); }
    })());

    // ── Generate per-guideline images ──
    if (guidelines.length > 0) {
      aiImagePromises.push((async () => {
        try {
          console.log("Generating per-guideline images for", guidelines.length, "guidelines...");
          
          const productImageUrl = productImages.length > 0 ? productImages[0] : null;
          
          const guidelineResults = await Promise.allSettled(
            guidelines.map(async (g: any) => {
              const ruleText = `${g.rule} ${g.example || ''}`.toLowerCase();
              const mentionsProduct = ruleText.includes('product') || ruleText.includes('unboxing') || ruleText.includes('packaging') || ruleText.includes('in-hand') || ruleText.includes('close-up');
              
              let messages: any[];
              if (mentionsProduct && productImageUrl) {
                messages = [{
                  role: "user",
                  content: [
                    { type: "text", text: `Create a brand photography reference image for "${brandName}".
Guideline: "${g.rule}"${g.example ? ` — Example: "${g.example}"` : ''}
Target audience: ${audienceDesc}
Brand colors: primary ${brandColors.primary || '#333'}, secondary ${brandColors.secondary || '#666'}.

CRITICAL RULE: The product in this image must NOT be altered, modified, redesigned, or changed in ANY way. Keep the product EXACTLY as it appears — same shape, same colors, same details, same proportions. You may ONLY change the product's position, angle, or placement within the scene. The product itself is sacred and untouchable.

Use the product shown in this image as the subject. Place it in a scene that demonstrates this specific photography guideline. Professional, authentic, on-brand. No text overlays.` },
                    { type: "image_url", image_url: { url: productImageUrl } }
                  ]
                }];
              } else {
                messages = [{ role: "user", content: `Create a brand photography reference image for "${brandName}".
Guideline: "${g.rule}"${g.example ? ` — Example: "${g.example}"` : ''}
Target audience: ${audienceDesc}
Brand category: ${brandCategory}.
Brand colors: primary ${brandColors.primary || '#333'}, secondary ${brandColors.secondary || '#666'}.
Create a clean, professional mood/reference photo that demonstrates this specific photography guideline for this audience. No text overlays. Authentic and on-brand.` }];
              }
              
              const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash-image",
                  messages,
                  modalities: ["image", "text"],
                }),
              });
              if (res.ok) {
                const d = await res.json();
                return d.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
              }
              return null;
            })
          );
          const results = guidelineResults
            .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && !!r.value)
            .map(r => r.value);
          if (results.length > 0) {
            extracted.brand.visualIdentity.guidelineImageUrls = results;
            console.log("Generated", results.length, "guideline images");
          }
        } catch (e) { console.warn("Guideline image gen error:", e); }
      })());
    }

    // ── Product images: remove backgrounds ──
    const productImgUrls = extracted.product?.images || [];
    if (productImgUrls.length > 0) {
      aiImagePromises.push((async () => {
        try {
          const imagesToProcess = productImgUrls.slice(0, 4).filter((u: string) => u && typeof u === 'string');
          console.log("Removing backgrounds from", imagesToProcess.length, "product images...");

          const bgResults = await Promise.allSettled(
            imagesToProcess.map(async (imgUrl: string, idx: number) => {
              try {
                const bgRemoveRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    model: "google/gemini-2.5-flash-image",
                    messages: [{
                      role: "user",
                      content: [
                        { type: "text", text: "Remove the background from this product image completely. Keep ONLY the product itself with a clean, pure white background. No shadows, no floor, no props — just the isolated product on white. Maintain the exact product appearance, colors, and details." },
                        { type: "image_url", image_url: { url: imgUrl } }
                      ]
                    }],
                    modalities: ["image", "text"],
                  }),
                });
                if (bgRemoveRes.ok) {
                  const d = await bgRemoveRes.json();
                  const cleanImg = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
                  if (cleanImg) {
                    console.log(`✓ Background removed for product image ${idx + 1}`);
                    return cleanImg;
                  }
                }
                return imgUrl;
              } catch (e) {
                console.warn("BG removal error for image:", e);
                return imgUrl;
              }
            })
          );

          const cleanImages = bgResults.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean) as string[];

          if (cleanImages.length > 0) {
            extracted.product.images = cleanImages;
            console.log("Product images updated with", cleanImages.length, "clean images");
          }
        } catch (e) { console.error("Product BG removal pipeline error:", e); }
      })());
    }

    // ── Social Media: Generate UGC product images ──
    aiImagePromises.push((async () => {
      try {
        console.log("Generating social media UGC images...");
        const productName = extracted.product?.name || "the product";
        const productDesc = (extracted.product?.description || '').slice(0, 200);
        const productImageUrl = productImages.length > 0 ? productImages[0] : null;
        const socialMediaUrls: string[] = [];

        const socialPrompts = [
          {
            label: "Feed post (1:1)",
            prompt: `Create a UGC-style social media feed post image (square 1:1 ratio). Show the product "${productName}" in a real-life lifestyle setting that resonates with the target audience.

Target audience: ${audienceDesc.split('.').slice(0, 2).join('.')}
Brand colors: primary ${brandColors.primary || '#333'}, secondary ${brandColors.secondary || '#666'}
Product: ${productDesc}

The image should look like authentic user-generated content — natural lighting, real setting, casual composition. Show the product being used or displayed in a way the target audience would naturally photograph it. NO text, NO logos, NO overlays. Just a beautiful, authentic product lifestyle shot.${productImageUrl ? `\n\nCRITICAL: The product must look EXACTLY like the product in the reference image — same shape, colors, details. Do NOT redesign or alter the product.` : ''}`
          },
          {
            label: "Story (9:16)",
            prompt: `Create a UGC-style social media story image (vertical 9:16 ratio). Show the product "${productName}" in a dynamic, eye-catching vertical composition.

Target audience: ${audienceDesc.split('.').slice(0, 2).join('.')}
Brand colors: primary ${brandColors.primary || '#333'}, secondary ${brandColors.secondary || '#666'}
Product: ${productDesc}

The image should feel like a real person's Instagram story — close-up, personal, intimate perspective. Show someone interacting with or unboxing the product. Natural, warm lighting. NO text, NO logos, NO overlays. Authentic UGC feel.${productImageUrl ? `\n\nCRITICAL: The product must look EXACTLY like the product in the reference image — same shape, colors, details. Do NOT redesign or alter the product.` : ''}`
          },
          {
            label: "Reel (1:1)",
            prompt: `Create a UGC-style social media reel thumbnail image (square 1:1 ratio). Show the product "${productName}" in an action/in-use moment.

Target audience: ${audienceDesc.split('.').slice(0, 2).join('.')}
Brand colors: primary ${brandColors.primary || '#333'}, secondary ${brandColors.secondary || '#666'}
Product: ${productDesc}

The image should capture a dynamic moment — the product being actively used, demonstrating its key benefit. Should feel like a frame from a real user's video. Energetic, authentic, relatable. NO text, NO logos, NO overlays.${productImageUrl ? `\n\nCRITICAL: The product must look EXACTLY like the product in the reference image — same shape, colors, details. Do NOT redesign or alter the product.` : ''}`
          }
        ];

        const socialResults = await Promise.allSettled(
          socialPrompts.map(async ({ label, prompt }) => {
            try {
              const messages: any[] = [{
                role: "user",
                content: productImageUrl ? [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: productImageUrl } }
                ] : prompt
              }];

              const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash-image",
                  messages,
                  modalities: ["image", "text"],
                }),
              });
              if (res.ok) {
                const d = await res.json();
                const img = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
                if (img) {
                  console.log(`✓ Generated social media: ${label}`);
                  return img;
                }
              }
              return null;
            } catch (e) {
              console.warn(`Social media gen error (${label}):`, e);
              return null;
            }
          })
        );

        for (const r of socialResults) {
          if (r.status === 'fulfilled' && r.value) {
            socialMediaUrls.push(r.value);
          }
        }

        if (socialMediaUrls.length > 0) {
          extracted.brand.visualIdentity.socialMediaUrls = socialMediaUrls;
          console.log("Generated", socialMediaUrls.length, "social media UGC images");
        }
      } catch (e) { console.error("Social media generation error:", e); }
    })());

    // Wait for moodboard + all AI image generation
    await Promise.all([moodboardPromise, ...aiImagePromises]);

    console.log("Extraction successful:", extracted.product?.name, "logos:", extracted.brand?.logoUrls?.length || 0);

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
