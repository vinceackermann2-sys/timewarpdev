
Goal: make onboarding and “Add Business” reliably create a business by returning the scrape result before the platform times out.

Why it still fails
- The console “CORS” message is misleading. The real failure is the `504 Gateway Timeout`.
- `scrape-product` already includes proper CORS headers, and the logs show it gets very far through the pipeline, so this is not a browser-origin policy bug.
- The actual blocker is that `scrape-product` is doing far too much before responding:
  - homepage scrape + site map
  - AI product-page selection
  - multi-page extraction
  - moodboard search/generation
  - mobile screenshot
  - logo recreation
  - illustration generation
  - guideline images
  - background removal
  - social media image generation
- The function only returns after `await Promise.all([moodboardPromise, ...aiImagePromises])`, so onboarding waits for all heavy enrichment work. That pushes the request past the gateway limit, which is why the browser sees:
  - `504`
  - then fake-looking “No Access-Control-Allow-Origin” noise
  - then `TypeError: Failed to fetch`
- The other console warnings are unrelated to the save failure:
  - `feature_collector.js` deprecated init warning = third-party script noise
  - `DialogContent` missing description = accessibility warning only

Implementation plan

1. Split “core extraction” from “asset enrichment”
- Keep `scrape-product` responsible for the business-critical part only:
  - scrape URL(s)
  - detect company URL vs product URL
  - select up to 5 relevant product pages
  - run AI extraction
  - normalize `brand`, `products[]`, `audiences[]`
  - return immediately
- Move the expensive visual generation work behind a flag or into a second function:
  - moodboard
  - recreated logo
  - website/mobile screenshots if expensive
  - illustration URLs
  - guideline images
  - social media assets
  - background removal
- This is the main fix. Without it, the gateway will keep timing out no matter how long the browser waits.

2. Add a fast mode for onboarding and Add Business
- Update `scrape-product` to accept something like:
  - `mode: "core"` or `includeAssets: false`
- In fast mode, skip all enrichment promises and return only the extracted business/product/audience data needed to create records.
- Use this fast mode from:
  - `BusinessDNAOnboarding.tsx`
  - `AddProductURLView.tsx`
  - likely `ProductListView.tsx` and `AudienceListView.tsx` too, since they also call the same function and can hit the same timeout.

3. Keep richer extraction where it actually matters
- `BrandingEditor.tsx` can keep using full extraction if needed, because that screen is specifically about branding enrichment.
- If full extraction is still too slow there, I’ll switch it to a two-step flow:
  - save the business immediately with core data
  - load/generated visual assets afterward

4. Harden the company-URL path
- The current company mode can pick bad URLs (the logs show App Store links were selected for Apple). That wastes time and lowers extraction quality.
- Tighten URL filtering before AI selection:
  - same domain only
  - exclude app stores, auth, support, blog, careers, legal, docs, etc.
  - prefer product/service/commercial paths
- Cap the page content sent to AI more aggressively so extraction stays fast and predictable.

5. Preserve compatibility in the client
- `BusinessDNAOnboarding.tsx` already handles arrays and persists via `save-onboarding`, so I’ll keep that flow but make the scrape call fast-mode.
- `AddProductURLView.tsx` already handles arrays too; it just needs the same fast-mode request.
- No schema change should be required.

6. Clean up non-blocking console noise
- Add `aria-describedby={undefined}` or a proper description to the option dialog in `MyBusinessesView.tsx` to remove the repeated Dialog warning.
- I will not chase the `feature_collector.js` deprecation inside app code unless I find a project-owned initialization path, because it does not cause the scrape failure.

Files to update
- `supabase/functions/scrape-product/index.ts`
  - return core data before heavy asset generation
  - add fast/core mode
  - tighten company URL filtering
- `src/components/database/BusinessDNAOnboarding.tsx`
  - call scrape in fast/core mode
- `src/components/database/AddProductURLView.tsx`
  - call scrape in fast/core mode
- `src/components/database/ProductListView.tsx`
  - same fast/core mode for imports
- `src/components/database/AudienceListView.tsx`
  - same fast/core mode for imports
- `src/components/database/BrandingEditor.tsx`
  - decide whether to keep full mode or use a follow-up enrichment step
- `src/components/database/MyBusinessesView.tsx`
  - fix dialog description warning

Expected result
- Onboarding and Add Business stop failing with 504/CORS-style errors.
- Businesses are created quickly because the function returns once the structured data is ready.
- Heavy visual assets no longer block business creation.
- Console noise is reduced to actual actionable issues.
