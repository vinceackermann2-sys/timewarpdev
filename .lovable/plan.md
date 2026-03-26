
Root cause: onboarding is not primarily failing because of Pinterest itself or a true CORS misconfiguration. The `scrape-product` function is crashing while sending its response.

What the code and logs show:
- `BusinessDNAOnboarding.tsx` calls `invokeEdgeFunction("scrape-product", { url, mode: "core" })`.
- The edge function already includes correct CORS headers and an `OPTIONS` handler.
- Recent logs show:
  - `Core mode — returning with assets: ...`
  - then immediately `Http: connection closed before message completed`
- That means the function finishes the work, but the response body is too heavy or unstable while being streamed back.
- In core mode it is currently returning:
  - full extracted product/audience data
  - website screenshot as base64 data URL
  - generated SVG illustration code
  - moodboard URLs
- The browser then reports this as a failed fetch / missing CORS header, because the runtime aborts before the final headers/body complete.

Why it breaks onboarding specifically:
- Onboarding uses `mode: "core"`, and that path is now doing too much asset work before returning.
- The biggest likely payload offenders are:
  1. base64 `websiteScreenshot`
  2. large inline `illustrationSvgs`
  3. possibly oversized extracted text-derived fields across multiple products

Fix plan:
1. Slim down the `scrape-product` core-mode response
   - Do not return base64 screenshots inline in onboarding responses.
   - Return only lightweight structured business data needed to create the business.
   - Keep core mode focused on: brand, products, audiences, colors, typography, logo URLs, text rules.

2. Remove heavy asset generation from the synchronous onboarding request
   - Skip illustration SVG generation during core mode.
   - Skip moodboard generation during core mode.
   - Skip mobile screenshot generation during core mode.
   - Keep these for the full non-core scrape path, or load them later after onboarding.

3. Make branding safe but lightweight
   - Preserve branding text fields and color/font/logo extraction.
   - If a screenshot exists, only keep it if it is already a remote URL; do not wrap base64 into `data:image/...`.
   - If Firecrawl only returns base64 screenshot data, drop it from core mode instead of sending it to the client.

4. Add a strict response sanitizer before returning core mode
   - Trim any oversized arrays to safe limits.
   - Ensure `products`, `audiences`, `logoUrls`, and rules arrays are arrays.
   - Remove undefined / null-heavy optional media fields from the core response.

5. Make onboarding resilient to partial branding
   - In `BusinessDNAOnboarding.tsx`, accept missing screenshot / moodboard / illustration assets without treating that as failure.
   - Continue saving the business if structured brand/product/audience data is present.

6. Keep Pinterest failure non-blocking
   - The 403s from Pinterest scraping are real, but they are not the direct cause of the onboarding crash.
   - Moodboard loading should never block business creation.
   - If Pinterest continues to fail, leave `moodboardUrls: []` and let the brand still be created.

7. Verify after implementation
   - Test onboarding from the homepage and from add-business flow.
   - Confirm `scrape-product` core mode returns 200 reliably.
   - Confirm business creation succeeds even when moodboard is empty.
   - Confirm no white screen after opening the created business.

Files to update:
- `supabase/functions/scrape-product/index.ts`
  - reduce core-mode payload
  - skip heavy asset generation in core mode
  - avoid inline base64 screenshot return in core mode
- `src/components/database/BusinessDNAOnboarding.tsx`
  - tolerate missing media assets in onboarding result
  - continue persistence with lightweight branding data

Technical note:
The “No 'Access-Control-Allow-Origin' header” message is a symptom here, not the real root cause. Since the function already sets CORS headers, the missing-header error appears because the edge runtime aborts the response before completion. The real fix is to reduce/stabilize the payload returned by `scrape-product` in onboarding/core mode.
