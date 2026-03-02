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

    // ── Moodboard: Scrape Pinterest search page for audience-related aesthetic images ──
    const moodboardPromise = (async () => {
      try {
        const audienceDesc = extracted.audience?.description || "";
        const brandCategory = extracted.brand?.category || "";
        const audienceShort = audienceDesc.split('.')[0].replace(/[^a-zA-Z0-9 ]/g, '').trim();
        
        const searchQuery = audienceShort 
          ? `${audienceShort} ${brandCategory} aesthetic`.trim()
          : `${brandCategory} lifestyle aesthetic moodboard`;
        
        const pinterestUrl = `https://pinterest.com/search/pins/?q=${encodeURIComponent(searchQuery)}`;
        console.log("Scraping Pinterest for moodboard:", pinterestUrl);
        
        const pinRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: pinterestUrl,
            formats: ["links", "markdown"],
            waitFor: 3000,
            onlyMainContent: true,
          }),
        });
        
        if (pinRes.ok) {
          const pinData = await pinRes.json();
          const pinMarkdown = pinData.data?.markdown || pinData.markdown || "";
          const pinLinks = pinData.data?.links || pinData.links || [];
          
          const pinterestImages: string[] = [];
          
          // Extract pinimg URLs from markdown and links
          const pinimgPattern = /(https?:\/\/i\.pinimg\.com\/[^\s"')]+)/gi;
          let match;
          while ((match = pinimgPattern.exec(pinMarkdown)) !== null) {
            pinterestImages.push(match[1]);
          }
          for (const link of pinLinks) {
            if (typeof link === 'string' && link.includes('pinimg.com')) {
              pinterestImages.push(link);
            }
          }
          
          const uniqueMoodboard = [...new Set(pinterestImages)]
            .filter(u => u && !u.includes('75x75') && !u.includes('favicon'))
            .slice(0, 6);
          
          if (uniqueMoodboard.length > 0) {
            extracted.brand.visualIdentity.moodboardUrls = uniqueMoodboard;
            console.log("Found", uniqueMoodboard.length, "Pinterest moodboard images");
            return;
          }
        }
      } catch (e) {
        console.warn("Pinterest moodboard scrape error (non-fatal):", e);
      }
      
      // Fallback: web search for aesthetic images
      try {
        const audienceDesc = extracted.audience?.description || "";
        const brandCategory = extracted.brand?.category || "";
        const query = `${brandCategory} ${audienceDesc.split('.')[0]} aesthetic moodboard`;
        
        const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, limit: 10 }),
        });
        
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const results = searchData.data || [];
          const imageUrls: string[] = [];
          for (const r of results) {
            if (r.metadata?.ogImage) imageUrls.push(r.metadata.ogImage);
            const imgs = (r.markdown || "").match(/(https?:\/\/[^\s)"']+\.(?:jpg|jpeg|png|webp))/gi);
            if (imgs) imageUrls.push(...imgs);
          }
          const unique = [...new Set(imageUrls)].filter(u => !u.includes('favicon')).slice(0, 6);
          if (unique.length > 0) {
            extracted.brand.visualIdentity.moodboardUrls = unique;
            console.log("Fallback: found", unique.length, "moodboard images from web search");
            return;
          }
        }
      } catch (e) {
        console.warn("Fallback moodboard error:", e);
      }
      
      // Final fallback: page images
      const imageUrlRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)|src=["'](https?:\/\/[^\s"']+)["']/gi;
      const pageImages: string[] = [];
      let imgMatch;
      while ((imgMatch = imageUrlRegex.exec(markdown)) !== null) {
        const imgUrl = imgMatch[1] || imgMatch[2];
        if (imgUrl && !imgUrl.includes('favicon') && !imgUrl.includes('tracking') && !imgUrl.includes('pixel')) {
          pageImages.push(imgUrl);
        }
      }
      if (firecrawlBranding?.images?.ogImage) pageImages.push(firecrawlBranding.images.ogImage);
      extracted.brand.visualIdentity.moodboardUrls = [...new Set(pageImages)].slice(0, 6);
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

    // ── Logo: use found URLs, or use screenshot of the logo area (no AI recreation) ──
    if (!extracted.brand.logoUrls || extracted.brand.logoUrls.length === 0) {
      // We already have the full page screenshot — use it as the logo reference
      // The screenshot captures the header/logo area naturally
      if (websiteScreenshot) {
        const ssUrl = typeof websiteScreenshot === 'string' && websiteScreenshot.startsWith('http')
          ? websiteScreenshot
          : `data:image/png;base64,${websiteScreenshot}`;
        extracted.brand.logoUrls = [ssUrl];
        console.log("Using page screenshot as logo (text logo detected)");
      }
    }

    // ── Generate patterns + mascots based on audience + brand ──
    aiImagePromises.push((async () => {
      try {
        console.log("Generating brand patterns and mascots...");
        const illustrationUrls: string[] = [];
        
        // Pattern
        const patternPrompt = `Generate a seamless brand pattern for "${brandName}". 
Brand category: ${brandCategory}. Target audience: ${audienceDesc}.
Brand colors: primary ${brandColors.primary || '#333'}, secondary ${brandColors.secondary || '#666'}.
Create a repeating decorative pattern that reflects the brand identity. Use brand colors. No text. Clean, professional design suitable for packaging, backgrounds, and social media.`;
        
        const patternRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: patternPrompt }],
            modalities: ["image", "text"],
          }),
        });
        if (patternRes.ok) {
          const d = await patternRes.json();
          const img = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (img) illustrationUrls.push(img);
        }

        // Mascot
        const mascotPrompt = `Generate a brand mascot character for "${brandName}".
Brand category: ${brandCategory}. Target audience: ${audienceDesc}.
Brand colors: primary ${brandColors.primary || '#333'}, secondary ${brandColors.secondary || '#666'}.
Create a friendly, memorable mascot character that appeals to the target audience and represents the brand personality. Modern illustration style. No text. White/clean background.`;

        const mascotRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: mascotPrompt }],
            modalities: ["image", "text"],
          }),
        });
        if (mascotRes.ok) {
          const d = await mascotRes.json();
          const img = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (img) illustrationUrls.push(img);
        }

        if (illustrationUrls.length > 0) {
          extracted.brand.visualIdentity.illustrationUrls = illustrationUrls;
          console.log("Generated", illustrationUrls.length, "illustrations (pattern + mascot)");
        }
      } catch (e) { console.warn("Illustration gen error:", e); }
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
