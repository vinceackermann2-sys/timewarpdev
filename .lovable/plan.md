

# Fix: Moodboard Not Loading + Generate 9 Icons & 1 Pattern

## Root Cause Analysis

1. **enrich-brand function has zero logs** — it's either not deployed or never reached. The onboarding code calls it only if `rowId` exists, which depends on `reloadedBrands` having a `_rowId`. If the `reloadData()` call doesn't return the brand (timing issue or match failure), the enrichment never fires.

2. **Pinterest moodboard may fail silently** — Firecrawl's `formats: ["html"]` on Pinterest may not return enough rendered HTML (Pinterest is heavily JS-rendered). The regex finds no `i.pinimg.com` URLs in the returned HTML, resulting in 0 images.

3. **Illustrations currently generate a single SVG grid of 12 icons** — user wants 9 separate individual icon SVGs and 1 pattern SVG.

## Plan

### 1. Deploy and verify `enrich-brand` edge function
- Deploy the function
- Test it with a sample payload to confirm it runs

### 2. Fix the enrichment trigger in `BusinessDNAOnboarding.tsx`
- Add debug logging to confirm whether `rowId` is null
- If `reloadedBrands` doesn't contain the brand yet (race condition), add a small delay + retry to find the row
- Alternatively, have `save-onboarding` return the brand row ID directly and pass it to `enrich-brand`

### 3. Fix Pinterest moodboard scraping
- Pinterest blocks most scraping; Firecrawl with `formats: ["html"]` may return a login wall
- Switch approach: use Firecrawl **search** endpoint (`/v1/search`) to search for `"{brandName} {category} aesthetic pinterest"` which returns actual image URLs from Google image results pointing to Pinterest
- Alternatively, use `rawHtml` format with a longer `waitFor` (5000ms) to let Pinterest render
- Extract `i.pinimg.com` URLs from whichever method yields results

### 4. Generate 9 individual icon SVGs + 1 pattern SVG
- Replace the current single "icon grid" prompt with 9 separate smaller AI calls (or batch 3 at a time) that each produce one standalone icon SVG based on a specific product/audience concept
- Keep the pattern SVG as a single call
- Store as `illustrationSvgs` array with 10 entries (9 icons + 1 pattern)

### 5. Update `BrandExtendedSections.tsx` display
- Render the 9 icons in a 3x3 grid (each as an individual SVG card)
- Render the 1 pattern as a full-width banner below the icon grid
- Label icons based on the concept they represent

## Files

| File | Change |
|------|--------|
| `supabase/functions/enrich-brand/index.ts` | Fix Pinterest scraping (try search API fallback), generate 9 individual icons + 1 pattern, add retry logic |
| `src/components/database/BusinessDNAOnboarding.tsx` | Fix rowId resolution with retry; ensure enrich-brand is always called |
| `src/components/database/BrandExtendedSections.tsx` | Display 9 icons in 3x3 grid + 1 pattern as full-width |

## Technical Details

### Pinterest fix approach
```text
Primary: Firecrawl search API → "brand aesthetic pinterest" → extract image URLs
Fallback: Firecrawl scrape with rawHtml + waitFor: 5000
```

### Icon generation approach
```text
For each of 9 concepts derived from product benefits + audience needs:
  → AI call: "Generate a single SVG icon (viewBox 0 0 100 100) for [concept]. Use colors [primary] and [secondary]. No text."
  → Extract <svg>...</svg> from response
Run 3 batches of 3 in parallel to balance speed and reliability
```

