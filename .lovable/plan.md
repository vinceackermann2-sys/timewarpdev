

## Plan: Fix Three Onboarding Issues

### Issue 1: Non-product pages (like TimeWarp) appearing in product discovery
The AI URL picker prompt (line 551) asks the model to select product/service pages but doesn't filter out pages that belong to third-party services embedded on the site. The fix: add domain-aware filtering after AI selection — exclude any URL whose path contains third-party brand names or non-product patterns like `/pages/timewarp`, `/pages/`, generic info pages. Also tighten the AI prompt to explicitly exclude partner/integration/tool pages.

**File:** `supabase/functions/scrape-product/index.ts` (line ~531, ~551)
- Add `/pages/` to `excludePatterns` regex (Shopify info pages live under `/pages/`)
- Update the AI prompt to say: "Exclude partner integrations, third-party tools, and informational pages. Only select pages selling THIS company's own products."

### Issue 2: First product image fails to load
From the screenshot: the first tile shows "Product 1" alt text with a blank area — the image URL is broken or empty. The issue is in `extractImagesFromMarkdown`: it filters out URLs containing "logo", "icon", "badge" etc. but doesn't handle cases where the first product page yields zero valid images, or where the image URL is a relative path that isn't properly resolved.

The real root cause: some product pages have images in `srcset` or `data-src` (lazy-loaded) attributes that the current regex doesn't capture. Also, the Firecrawl markdown may use `![Product 1]()` with an empty parentheses (no URL).

**File:** `supabase/functions/scrape-product/index.ts` (line ~31-63)
- Add `data-src` and `data-srcset` attribute extraction
- Add `srcset="..."` attribute parsing (take the largest/last image)
- Filter out empty URLs before returning

**File:** `src/components/database/BusinessDNAOnboarding.tsx` (image normalization ~216-226)
- When normalizing images, skip empty strings and `data:` URIs
- If a product has zero valid images after normalization, exclude it from display or show a placeholder

### Issue 3: Remove BG creates a new image instead of removing background
The current `remove-bg` edge function uses an AI image generation model (`gemini-3.1-flash-image-preview`) which is designed to generate/edit images — it interprets "remove background" as a creative task and synthesizes a new image. This is fundamentally the wrong tool.

**Fix:** Use the `remove.bg` API (a dedicated background removal service) instead of the AI image generation model. However, this requires a `REMOVE_BG_API_KEY`. Alternative: change the prompt to be much more explicit about preserving the exact original image pixels and only making the background transparent/white.

Since adding a new API key has friction, the practical fix is to heavily constrain the AI prompt:

**File:** `supabase/functions/remove-bg/index.ts`
- Change the prompt to: "This is a product photo. Make the background completely transparent (alpha=0). Do NOT change, redraw, or modify the product in any way. The product pixels must remain exactly identical. Only remove/erase the background behind the product. Output the exact same product with a transparent background."
- This should reduce hallucination, though generative models may still alter the product slightly

**Better alternative:** Ask the user if they want to set up a `REMOVE_BG_API_KEY` for pixel-perfect results, or proceed with the AI approach with improved prompting.

Given the constraint that asking for API keys adds friction, I'll improve the prompt significantly and also add a fallback model order that prioritizes the model better at following precise editing instructions.

### Files Changed
1. `supabase/functions/scrape-product/index.ts` — filter out `/pages/` paths, tighten AI prompt, improve image extraction
2. `supabase/functions/remove-bg/index.ts` — rewrite prompt to be explicit about preserving original pixels
3. `src/components/database/BusinessDNAOnboarding.tsx` — skip empty/broken image URLs during normalization

### Deployment
- Redeploy `scrape-product` and `remove-bg` edge functions after changes

