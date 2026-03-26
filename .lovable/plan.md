
Issue identified: the scrape is failing inside `scrape-product`, not in the onboarding UI.

What the errors actually mean:
- `500 /functions/v1/scrape-product` + `Failed to parse extracted data` is the real blocker.
- The edge logs show the model returned a very large JSON payload (`Raw content length: 62572`) and parsing broke near the end (`Expected ',' or ']' ... position 61714`).
- This happens because company-mode scraping is still asking one model response to return too much at once: shared brand + up to 5 products + 5 audiences + detailed branding rules.
- `409` is a separate workspace race already handled in `useWorkspace.ts`; it is not the scrape failure.
- `403 /logout` is a stale session cleanup issue; also not the scrape failure.
- The `feature_collector` warning is unrelated.

Do I know what the issue is?
Yes. The current monolithic extraction strategy is too large/fragile for some sites, so the model returns malformed JSON and the whole scrape fails.

Plan

1. Refactor `scrape-product` into smaller extraction passes
- Keep Firecrawl scrape/map as-is.
- For company URLs, stop generating one giant JSON blob.
- Extract:
  - brand once from homepage + branding data
  - one product + one audience per selected product page in separate AI calls
- Merge the results server-side into the existing `{ brand, products, audiences }` shape.

2. Add a reusable robust JSON parser in `scrape-product`
- Centralize the existing cleanup logic into helpers:
  - strip code fences
  - isolate JSON boundaries
  - repair trailing commas/control chars
  - detect truncation via brace/bracket mismatch
- If parsing still fails, retry that one smaller extraction call instead of failing the whole scrape.

3. Shrink prompt/input size
- Reduce per-call markdown size substantially.
- Replace the giant “formula manual” prompt with a shorter schema-focused prompt for each pass.
- For company URLs, keep page-specific context only for the current product page being analyzed.

4. Make failures partial, not fatal
- If one product page fails to parse, skip it and continue with the others.
- Only fail the whole request if brand extraction fails or zero valid products are produced.
- This will stabilize both onboarding and add-business flows.

5. Normalize all returned fields before responding
- Force all array fields to arrays and object fields to objects.
- Apply the same defensive shaping before returning core-mode data so UI code never receives malformed collections.

6. Keep onboarding/add-business UI mostly unchanged
- `BusinessDNAOnboarding.tsx` and `AddProductURLView.tsx` already consume the shared `scrape-product` core response.
- I’ll only adjust error handling if needed so they show a clean extraction failure when zero usable data comes back.

Files to update
- `supabase/functions/scrape-product/index.ts`
  - split extraction into brand pass + per-product passes
  - add robust JSON parsing/retry helpers
  - downgrade partial parse failures to non-fatal
  - normalize merged output before returning
- `src/components/database/BusinessDNAOnboarding.tsx`
  - minor resilience only if needed for partial results
- `src/components/database/AddProductURLView.tsx`
  - minor resilience only if needed for partial results

Expected result
- Onboarding and add-business scraping stop failing on large company sites like Apple.
- Brand/product/audience data still comes back in full structure, but assembled from smaller reliable calls.
- 409/403 noise may still appear occasionally, but they will no longer block the scrape flow.
