

## Plan: Fix Add Business / Onboarding Flow (5 Issues)

### Issue 1: Logging correctness
The logging milestones and console logs are already in place. The `ANALYSIS_MILESTONES` array cycles through 10 steps. The scrape and persistence steps log correctly. No changes needed here unless there's a specific logging bug — the current implementation logs scrape start, product extraction counts, persistence results, and enrichment status.

### Issue 2: "Scanning Sources" — show only sources label and display ALL sources
Currently `visibleSources = scannedSources.slice(-5)` limits display to only the last 5 sources. Change this to show ALL scanned sources with a scrollable container so users can see every source that was analyzed.

**Files**: `src/components/database/BusinessDNAOnboarding.tsx`
- Remove the `slice(-5)` limit on `visibleSources`
- Add `overflow-y-auto max-h-[200px]` to the sources list container so it scrolls if many sources
- Keep the heading as "Scanning Sources" (already correct) and the count at the bottom

### Issue 3: Only add products/audiences that were actually found
Currently both `BusinessDNAOnboarding.tsx` and `AddProductURLView.tsx` do `.slice(0, 5)` which forces up to 5. The scrape function already returns only what it finds (1 product = 1 product). The `.slice(0, 5)` is just a cap, not padding — so if only 1 is found, only 1 is added. The `save-onboarding` edge function also does `.slice(0, 5)`. This is already correct behavior — the slice is a maximum cap. No changes needed.

### Issue 4: Product offers showing data from another business
The `DEFAULT_PRODUCT` in `ProductDetailView.tsx` contains hardcoded offers from a hair dye business (Hairsaver). When new products are created with `...DEFAULT_PRODUCT` and the scraped product has no offers, it inherits these fake offers. Same issue with description, features, benefits, etc.

**Fix**: Clear out the `DEFAULT_PRODUCT` so all text fields default to empty strings/arrays instead of hardcoded business data. The offers array should default to `[]`, description to `""`, features/benefits/etc to `[]`.

**Files**: `src/components/database/ProductDetailView.tsx`
- Reset `DEFAULT_PRODUCT.offers` to `[]`
- Reset `DEFAULT_PRODUCT.description` to `""`  
- Reset all other text arrays (features, benefits, painPoints, useCases, etc.) to `[]`
- Reset all text fields (positioningStatement, commonObjections, proofPoints, etc.) to empty
- Keep the images array with null placeholders (that's structural, not data)

### Issue 5: Progress bar — still run to 80% but slower
Currently the progress bar instantly jumps to 80% (`progressRef.current = 80; setProgress(80);`). Change this to animate from 0 to 80% over ~8-10 seconds instead of jumping instantly.

**Files**: `src/components/database/BusinessDNAOnboarding.tsx`
- Remove the instant jump to 80%
- In the progress animation tick, use an asymptotic approach from 0→80% over time (similar to how 80→95 works currently), with a slower speed multiplier
- Keep the 80→95→100% behavior the same after scrape/persistence complete

### Technical Details

**BusinessDNAOnboarding.tsx changes:**
- Line ~519: Change `visibleSources = scannedSources.slice(-5)` to `visibleSources = scannedSources` and add scroll container
- Lines 229-268: Rework progress animation to animate 0→80% gradually instead of instant jump

**ProductDetailView.tsx changes:**
- Lines 53-230: Replace all hardcoded Hairsaver business data in `DEFAULT_PRODUCT` with empty defaults

**AddProductURLView.tsx**: The `...DEFAULT_PRODUCT` spread will automatically benefit from the cleaned defaults — no separate changes needed.

