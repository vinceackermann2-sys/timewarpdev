

## Plan: Fix Product Discovery for Non-Shopify Sites

### Root Cause (Two Issues)

**Issue 1 — AI returns relative paths instead of absolute URLs**: The AI URL picker returns paths like `/modely/design` instead of `https://tesla.com/modely/design`. Firecrawl fails on these, resulting in 0 scraped product pages. The system falls back to the homepage, producing only 1 generic product.

Evidence from logs:
```
AI selected 4 product pages: ["/modely/design", "/tesla-diner", ...]
Scraped 0 product pages
```

**Issue 2 — Products without images get dropped**: Line 871 filters out products that have no name AND no images. On non-Shopify sites where image extraction fails, valid products get excluded.

### Fix

**File: `supabase/functions/scrape-product/index.ts`**

1. **Resolve relative URLs to absolute** (line ~737): After parsing the AI-selected URLs, resolve each one against `baseUrl` before passing to Firecrawl:
   ```ts
   const selected: string[] = JSON.parse(arrMatch[0])
     .filter((u: any) => typeof u === 'string')
     .map((u: string) => {
       // AI sometimes returns relative paths — resolve to absolute
       if (u.startsWith('/')) return `${parsedBase.origin}${u}`;
       if (!u.startsWith('http')) return `${parsedBase.origin}/${u}`;
       return u;
     })
     .slice(0, maxPages);
   ```

2. **Don't drop products without images** (line ~871): Change the filter to keep all products that have a name, even without images:
   ```ts
   .filter(p => p.name || p.description || p.images.length > 0);
   ```

3. **Add the Firecrawl `screenshot` format to discover-mode page scrapes** to ensure a visual fallback always exists even when regex/AI image extraction fails on JS-heavy sites (already present in the code, just verify it works with resolved URLs).

**File: `src/components/database/BusinessDNAOnboarding.tsx`**

4. **Remove the product exclusion based on images** (line ~888): The continue button check `extractedProducts.some((p: any) => p.images?.length > 0)` skips the image picker step if no products have images — this is correct behavior. But ensure products without images still show in the card grid (already happens with the Globe fallback icon — no change needed).

### Summary
The core fix is 3 lines: resolve relative URLs to absolute before Firecrawl, and relax the product filter. This will make Tesla, Apple, Nike etc. work because their product pages will actually get scraped instead of silently failing.

