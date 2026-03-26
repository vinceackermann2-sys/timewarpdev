

# Plan: Fix Branding in Onboarding + False Data Prevention + Progress Bar

## Issues

1. **False data from AI examples**: The scrape-product prompt contains detailed examples (Scrubby dog gloves, etc.) that the AI sometimes copies into actual output instead of extracting from the page. Need an explicit instruction to leave fields empty when no real data is found.

2. **Progress bar behavior**: Currently creeps slowly from 0→75% during scrape, then 75→95% during persistence. User wants it to **instantly jump to 80%**, then animate 80→100% based on actual loading progress.

3. **Branding completeness**: The `visualIdentity` from scrape-product includes text descriptions (`logoDescription`, `moodboardDescription`, `illustrationGuidelines`) that aren't mapped to the UI's expected format. Need to ensure the fields the UI actually reads (`websiteRules`, `buttonRules`, `imageGuidelines`, `socialMediaRules`, `websiteScreenshot`) are properly passed through onboarding.

## Changes

### File: `supabase/functions/scrape-product/index.ts` (~line 630)
Add critical rules to the AI prompt:
- "NEVER copy example data into your output. Examples are for FORMAT reference only."
- "If you cannot find real data for a field from the page content, leave it as an empty string or empty array. Do NOT fabricate or hallucinate data."
- "Offers should only contain pricing/deals actually found on the page. If none found, return an empty array."

### File: `src/components/database/BusinessDNAOnboarding.tsx`
**Progress bar** (~lines 206-244): Change the animation logic:
- On step start, instantly set `progressRef.current = 80` and `setProgress(80)`
- Then animate from 80→95 (scrape phase) and 95→100 (persistence complete) using the existing asymptotic approach
- Remove the slow 0→75 phase entirely

**Brand visual identity mapping** (~lines 277-287): Ensure `websiteScreenshot` from scraped data is passed through to the brand's `visualIdentity`:
```js
visualIdentity: {
  ...(b.visualIdentity || {}),
  websiteScreenshot: b.visualIdentity?.websiteScreenshot || websiteScreenshot || undefined,
}
```
Note: `websiteScreenshot` is available in the scrape response at `extracted.brand.visualIdentity.websiteScreenshot` or from Firecrawl's screenshot data. In core mode, Firecrawl screenshot IS fetched (line 116) but mobile screenshot is skipped.

### File: `supabase/functions/scrape-product/index.ts` (~line 841, core mode return)
Before returning in core mode, merge the Firecrawl website screenshot into `extracted.brand.visualIdentity.websiteScreenshot` if available:
```js
if (websiteScreenshot && !extracted.brand.visualIdentity.websiteScreenshot) {
  extracted.brand.visualIdentity.websiteScreenshot = websiteScreenshot;
}
```

## Files

| File | Change |
|------|--------|
| `supabase/functions/scrape-product/index.ts` | Add "no fake data" rules to prompt; pass websiteScreenshot in core mode |
| `src/components/database/BusinessDNAOnboarding.tsx` | Progress bar jumps to 80% instantly, then 80→100% based on actual loading |

