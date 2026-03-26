

# Plan: Two-Phase Scrape — Moodboard (Pinterest), Illustrations (SVG code), Screenshot

## Problem

Core mode currently strips moodboard URLs, illustration SVGs, and base64 screenshots to prevent response payload crashes. The user wants all three to work after onboarding:
- **Moodboard**: Real Pinterest images
- **Illustrations**: Code-generated SVGs (icon grid + pattern sheet)
- **Website & Digital**: Firecrawl screenshot

## Approach: Two-Phase Architecture

**Phase 1 (core mode — synchronous, during onboarding):** Return lightweight structured data only (brand, products, audiences, colors, typography, logos, text rules). This is what already works.

**Phase 2 (enrich — triggered automatically after business is saved):** A new edge function `enrich-brand` fetches heavy assets (Pinterest moodboard, SVG illustrations, screenshot) and patches the brand record in `user_business_data` directly via service role. The frontend polls or listens for updates and refreshes the brand data.

## Changes

### 1. New edge function: `supabase/functions/enrich-brand/index.ts`
- Accepts `{ brandRowId, brandName, brandCategory, brandColors, audienceDesc, websiteUrl }`
- Runs three parallel pipelines:
  - **Moodboard**: Generate aesthetic terms via AI, scrape Pinterest for each term using existing `scrapePinterestForImages` logic, collect up to 6 images
  - **Illustrations**: Generate 2 SVGs (icon grid + pattern sheet) using existing AI prompts from `scrape-product`
  - **Screenshot**: Scrape the website URL with Firecrawl `formats: ["screenshot"]`, store as remote URL or base64
- Reads the existing `content` JSON from `user_business_data` by `brandRowId`
- Merges `moodboardUrls`, `illustrationSvgs`, and `websiteScreenshot` into `visualIdentity`
- Updates the row via service role
- Returns `{ success: true }` with summary of what was enriched

### 2. Update `src/components/database/BusinessDNAOnboarding.tsx`
- After `reloadData()` succeeds in step 2, fire-and-forget call to `enrich-brand` with the brand's row ID and metadata
- The enrichment runs in background; user proceeds to agent naming (step 3) immediately
- No blocking wait

### 3. Update `src/components/database/BusinessDNAContext.tsx`
- After enrich-brand completes, the context needs to reflect updated data
- Add a `refreshBrand(brandId)` method that re-fetches a single brand row and merges it into state
- The onboarding component calls this after enrich-brand returns

### 4. Keep `scrape-product` core mode as-is
- Still strips moodboard, illustrations, screenshots
- This ensures the onboarding call never crashes

## Technical Details

### enrich-brand edge function structure
```
POST /functions/v1/enrich-brand
Body: {
  brandRowId: string,       // _rowId from user_business_data
  brandName: string,
  brandCategory: string,
  brandColors: { primary, secondary, background, text },
  audienceDesc: string,
  audiencePowerWords: string,
  websiteUrl: string
}
```

The function uses `SUPABASE_SERVICE_ROLE_KEY` to read and update the brand row. It runs the three asset pipelines in parallel using `Promise.allSettled`, so partial failures don't block other assets.

### Flow sequence
```text
Onboarding Step 1 → scrape-product (core) → lightweight data
Onboarding Step 2 → save-onboarding → persist brand/products/audiences
                   → reloadData() → get _rowId
                   → fire enrich-brand (background)
Onboarding Step 3 → agent naming (user sees this immediately)
                   → enrich-brand completes → refreshBrand()
                   → moodboard + illustrations + screenshot appear in brand view
```

## Files

| File | Change |
|------|--------|
| `supabase/functions/enrich-brand/index.ts` | New edge function: Pinterest moodboard, SVG illustrations, website screenshot |
| `src/components/database/BusinessDNAOnboarding.tsx` | After save, call enrich-brand with brand metadata; refresh brand on completion |
| `src/components/database/BusinessDNAContext.tsx` | Add `refreshBrand(brandId)` to re-fetch single brand row from DB |

