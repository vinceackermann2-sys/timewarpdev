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

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping URL:", formattedUrl);

    // Step 1: Scrape with Firecrawl (desktop + branding)
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown", "links", "branding", "screenshot"],
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
    const firecrawlBranding = scrapeData.data?.branding || scrapeData.branding || null;
    const websiteScreenshot = scrapeData.data?.screenshot || scrapeData.screenshot || null;

    console.log("Scraped content length:", markdown.length, "screenshot:", !!websiteScreenshot);
    if (firecrawlBranding) console.log("Firecrawl branding data found:", JSON.stringify(firecrawlBranding).slice(0, 200));

    // Step 1b: Mobile screenshot (parallel)
    const mobileScreenshotPromise = (async () => {
      try {
        console.log("Fetching mobile screenshot...");
        const mobileRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: formattedUrl,
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

JSON structure to return:
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
      "imageGuidelines": [{"rule": "", "example": ""}],
      "websiteRules": [],
      "buttonRules": [],
      "socialMediaRules": []
    }
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

IMPORTANT RULES:
- Follow the formula EXACTLY for each field — match the tone and specificity of the examples
- Every output should feel like it was written by a direct-response copywriter, not a generic AI
- For audience fields, infer from the product's marketing language, tone, and who they're clearly targeting
- Extract real image URLs if visible in the content
- Be thorough — fill as many fields as possible with quality data
- For brand colors: extract the dominant primary, secondary, background, and text colors visible on the page (use hex format)
- For brand typography: identify the main font family, describe the style, and estimate the dominant weight (300-700)
- For brand logoUrls: extract ONLY actual logo image URLs (not product photos). Look for images with 'logo' in the URL or alt text.
- For brand visualIdentity: infer image guidelines (photography rules & examples), website design rules, button/UI rules (corner radius, styles), and social media content rules based on what you observe on the page. Be specific and actionable — not generic.

VISUAL IDENTITY EXTRACTION RULES:
- imageGuidelines: Describe the photography style, composition, and imagery approach used on the page. Each rule should have a concrete example.
- websiteRules: Layout patterns, spacing, color usage, header/footer styling, responsive hints visible on the page.
- buttonRules: Corner radius, fill styles, hover patterns, sizing conventions observed.
- socialMediaRules: Infer from the brand's tone, imagery style, and content approach what their social media presence should look like.

Page URL: ${formattedUrl}
Page title: ${metadata.title || "Unknown"}

${firecrawlBranding ? `Firecrawl extracted branding data (use this as primary source for brand colors, fonts, and logos):
${JSON.stringify(firecrawlBranding, null, 2)}

` : ""}Page content:
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

    let extracted;
    try {
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

    // ── Moodboard: Pinterest pin screenshots via aesthetic search terms ──
    const moodboardPromise = (async () => {
      try {
        const audienceDesc = extracted.audience?.description || "general consumers";
        const brandCategory = extracted.brand?.category || "lifestyle";
        const brandColors = extracted.brand?.colors || {};

        // Step 1: Generate 6 aesthetic search terms using AI
        console.log("Generating moodboard aesthetic terms...");
        const termsRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{
              role: "user",
              content: `Generate exactly 6 short aesthetic/visual search terms for a Pinterest moodboard. These should describe textures, colors, moods, and visual styles that match this brand and audience.

Brand category: ${brandCategory}
Brand colors: primary ${brandColors.primary || 'neutral'}, secondary ${brandColors.secondary || 'warm'}
Target audience: ${audienceDesc.split('.').slice(0, 2).join('.')}

Return ONLY a JSON array of 6 short phrases (3-5 words each). Example:
["Muted botanical motifs", "Sun-drenched linen texture", "Soft rounded edges", "Natural wood tones", "Earthy pastel palette", "Warm golden hour light"]

No explanation, just the JSON array.`
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
            `${brandCategory} moodboard aesthetic`,
            `${brandCategory} lifestyle texture`,
            `${brandCategory} color palette inspiration`,
            `warm tones lifestyle photography`,
            `minimal aesthetic flat lay`,
            `editorial brand photography`,
          ];
        }
        console.log("Moodboard terms:", aestheticTerms);

        // Step 2: For each term, search Pinterest, scrape screenshot of first pin
        const moodboardUrls: string[] = [];

        for (const term of aestheticTerms.slice(0, 6)) {
          try {
            console.log(`Searching Pinterest for: ${term}`);
            const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: `site:pinterest.com ${term}`,
                limit: 3,
              }),
            });

            let pinUrl = "";
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const results = searchData.data || [];
              // Find a proper pin URL (individual pin page)
              for (const r of results) {
                const u = r.url || "";
                if (u.includes("pinterest.com/pin/") || u.includes("pinterest.com")) {
                  pinUrl = u;
                  break;
                }
              }
            }

            if (pinUrl) {
              console.log(`Scraping pin screenshot: ${pinUrl}`);
              const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  url: pinUrl,
                  formats: ["screenshot"],
                }),
              });

              if (scrapeRes.ok) {
                const scrapeData = await scrapeRes.json();
                const screenshot = scrapeData.data?.screenshot || scrapeData.screenshot;
                if (screenshot) {
                  const imgUrl = typeof screenshot === 'string' && screenshot.startsWith('http')
                    ? screenshot
                    : `data:image/png;base64,${screenshot}`;
                  moodboardUrls.push(imgUrl);
                  console.log(`✓ Got Pinterest screenshot for "${term}"`);
                  continue;
                }
              }
            }

            // Fallback: try broader Pinterest search without site: filter
            console.log(`Pinterest site: search failed for "${term}", trying broader search...`);
            try {
              const broadRes = await fetch("https://api.firecrawl.dev/v1/search", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  query: `pinterest ${term} aesthetic`,
                  limit: 5,
                }),
              });
              if (broadRes.ok) {
                const broadData = await broadRes.json();
                const broadResults = broadData.data || [];
                for (const r of broadResults) {
                  const u = r.url || "";
                  if (u.includes("pinterest.com/pin/")) {
                    console.log(`Found pin via broad search: ${u}`);
                    const retryRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ url: u, formats: ["screenshot"] }),
                    });
                    if (retryRes.ok) {
                      const retryData = await retryRes.json();
                      const ss = retryData.data?.screenshot || retryData.screenshot;
                      if (ss) {
                        const imgUrl = typeof ss === 'string' && ss.startsWith('http') ? ss : `data:image/png;base64,${ss}`;
                        moodboardUrls.push(imgUrl);
                        console.log(`✓ Got Pinterest screenshot (broad) for "${term}"`);
                        break;
                      }
                    }
                  }
                }
              }
            } catch (broadErr) {
              console.warn(`Broad Pinterest search also failed for "${term}":`, broadErr);
            }
          } catch (e) {
            console.warn(`Moodboard error for "${term}":`, e);
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
    // AI IMAGE GENERATION (logo screenshot, illustrations, guideline images)
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
      // No logo image found — recreate it with AI using the screenshot as reference
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

    // ── Generate patterns + mascots based on audience + brand ──
    aiImagePromises.push((async () => {
      try {
        console.log("Generating brand patterns and mascots...");
        const illustrationUrls: string[] = [];
        
        // Pattern 1: Brand-specific icons and symbols set
        const iconsPrompt = `Generate a set of brand-specific icons and symbols for "${brandName}".
Brand category: ${brandCategory}. Target audience: ${audienceDesc}.
Brand colors: primary ${brandColors.primary || '#333'}, secondary ${brandColors.secondary || '#666'}.
Create a collection of 9-12 small iconographic elements arranged in a grid on a clean white background. The icons should be related to the product category and audience lifestyle. Flat, minimal style using only the brand colors. Each icon should be simple, recognizable, and suitable for website UI, packaging, and marketing materials. No text labels.`;
        
        const patternRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: iconsPrompt }],
            modalities: ["image", "text"],
          }),
        });
        if (patternRes.ok) {
          const d = await patternRes.json();
          const img = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (img) illustrationUrls.push(img);
        }

        // Pattern 2: Website pattern/texture using brand symbols
        const patternTexturePrompt = `Generate a seamless repeating website pattern/texture for "${brandName}".
Brand category: ${brandCategory}. Target audience: ${audienceDesc}.
Brand colors: primary ${brandColors.primary || '#333'}, secondary ${brandColors.secondary || '#666'}, background ${brandColors.background || '#fff'}.
Create a subtle, tileable pattern using small symbols and icons related to ${brandCategory}. The symbols should be arranged in a repeating layout suitable for website section backgrounds, hero overlays, and digital interfaces. Use brand colors at low opacity on a clean background. Professional, modern, not overwhelming. No text.`;

        const textureRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: patternTexturePrompt }],
            modalities: ["image", "text"],
          }),
        });
        if (textureRes.ok) {
          const d = await textureRes.json();
          const img = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (img) illustrationUrls.push(img);
        }

        if (illustrationUrls.length > 0) {
          extracted.brand.visualIdentity.illustrationUrls = illustrationUrls;
          console.log("Generated", illustrationUrls.length, "illustrations, URL lengths:", illustrationUrls.map(u => u.length));
        } else {
          console.warn("No illustrations generated - both AI calls returned no images");
        }
      } catch (e) { console.error("Illustration gen error:", e); }
    })());

    // ── Generate per-guideline images using product images when relevant ──
    if (guidelines.length > 0) {
      aiImagePromises.push((async () => {
        try {
          console.log("Generating per-guideline images for", guidelines.length, "guidelines...");
          const results: string[] = [];
          const productImageUrl = productImages.length > 0 ? productImages[0] : null;
          
          for (const g of guidelines.slice(0, 4)) {
            const ruleText = `${g.rule} ${g.example || ''}`.toLowerCase();
            const mentionsProduct = ruleText.includes('product') || ruleText.includes('unboxing') || ruleText.includes('packaging') || ruleText.includes('in-hand') || ruleText.includes('close-up');
            
            let messages: any[];
            if (mentionsProduct && productImageUrl) {
              // Use the product image as input for product-related guidelines
              messages = [{
                role: "user",
                content: [
                  { type: "text", text: `Create a brand photography reference image for "${brandName}".
Guideline: "${g.rule}"${g.example ? ` — Example: "${g.example}"` : ''}
Target audience: ${audienceDesc}
Brand colors: primary ${brandColors.primary || '#333'}, secondary ${brandColors.secondary || '#666'}.
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
              const imgUrl = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
              if (imgUrl) results.push(imgUrl);
            }
          }
          if (results.length > 0) {
            extracted.brand.visualIdentity.guidelineImageUrls = results;
            console.log("Generated", results.length, "guideline images");
          }
        } catch (e) { console.warn("Guideline image gen error:", e); }
      })());
    }

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
