

## Plan: Two Changes

### 1. Footer & Business DNA — AI-CEO Link to Homepage

The `WorkspaceFooter` already has `AI-CEO` linking to `/` (homepage). This is already correct. If there's another location you're referring to, let me know. No change needed here unless you mean a different component.

### 2. Fix Moodboard Generation (Pinterest Scraping is Broken)

**Root Cause**: The moodboard pipeline scrapes Pinterest for images using Firecrawl and Browserless. Pinterest is now blocking all 3 scraping strategies — every query returns 0 images. The edge function logs confirm: `Moodboard total unique images: 0 (from 0/6 queries)`.

**Fix**: Replace the Pinterest-based moodboard with AI-generated moodboard images. The `enrich-brand` function already uses `generateImage()` successfully for guideline images and social media mockups. We'll use the same approach for moodboard — generate 6 moodboard-style images using AI, based on the brand's name, category, colors, and audience description.

**Changes in `supabase/functions/enrich-brand/index.ts`:**

- Replace the `fetchMoodboardImages` call in the moodboard pipeline (line 748-757) with a new `generateMoodboardImages` function
- The new function generates 6 images via `generateImage()` with prompts like: "Create a premium moodboard-style image for [brand] in [category]. Colors: [primary], [secondary]. Style: [trust/feeling keywords]. Professional aesthetic photography."
- Use 6 different angle prompts (product close-up, lifestyle scene, texture/material, flat lay, ambient/atmosphere, detail shot) for visual diversity
- Remove the now-unused Pinterest scraping functions (~300 lines of dead code)

**Technical details:**
- Each image uses `generateImage(LOVABLE_API_KEY, prompt)` — same proven pattern as guideline images
- Add 500ms delay between generations to avoid rate limits (same pattern as existing code)
- The `moodboardUrls` output format stays identical — array of URL strings — so `BrandExtendedSections` needs no changes
- Remove: `fetchMoodboardImages`, `scrapePinterestPageForImages`, `scrapePinterestPageForImagesWithBrowserless`, `extractPinterestUrls`, `extractPinterestPageUrls`, `canonicalizePinterestUrl`, `isValidPinterestMoodboardUrl`, `parseMoodboardFormula`, `buildMoodboardQueries`, `normalizeMoodboardQuery`, `keywordizeMoodboardPhrase`, `cleanMoodboardToken`, `getPinterestAssetKey`, `deduplicatePinterestUrls`

**Files changed:**
- `supabase/functions/enrich-brand/index.ts` — replace Pinterest pipeline with AI generation

