

## Plan: Filter Placeholder and Junk Images from Product Scraping

### Problem
The scraper picks up placeholder/tracker images (e.g., `https://placehold.it/30`) as valid product images. These are tiny utility images embedded in non-Shopify sites. Shopify works because its product images are real CDN URLs that pass all filters.

### Fix — Two locations

**1. Edge function image filter** (`supabase/functions/scrape-product/index.ts`, line ~127-155)

Add to the filter chain:
- Block known placeholder domains: `placehold.it`, `via.placeholder.com`, `placeholder.com`
- Block tiny images: URLs with dimension params like `w=30` or path segments like `/30` (single small number)
- Block tracking/transparent pixel patterns: `transparent`, `blank`, `spacer`

```ts
// Add after line 133 (existing filter block):
if (lower.includes('placehold') || lower.includes('placeholder') || lower.includes('blank') || lower.includes('transparent')) return false;
// Block tiny dimension in URL query params
if (/[?&](w|width|h|height)=([1-9]|[1-4]\d)(&|$)/i.test(url)) return false;
```

**2. Frontend `isUsableImage` helper** (`src/components/database/BusinessDNAOnboarding.tsx`, line ~908-911)

Add matching filters so even if the edge function misses something, the UI won't display it:

```ts
const isUsableImage = (u?: string) => !!u && /^https?:\/\//.test(u) && 
  !/\/image\/upload\/(?:[a-z]_[a-z0-9]+\/?)*$/i.test(u) &&
  !/\/(?:c_scale|f_auto|q_auto|w_\d+|h_\d+)$/i.test(u) &&
  !u.includes('/**') && !u.includes('/*') &&
  !/(placehold|placeholder|spacer|pixel|blank|transparent|tracking)/i.test(u) &&
  !/[?&](w|width|h|height)=([1-9]|[1-4]\d)(&|$)/i.test(u);
```

Also add a **fallback**: if `find(isUsableImage)` returns null, try the next images in the array rather than showing nothing. The `allImages` array has 3 items — index 0 is `placehold.it/30` but indices 1-2 may be real product images.

**3. Redeploy edge function** after changes.

### Why Shopify works
Shopify product pages serve real CDN image URLs (e.g., `cdn.shopify.com/s/files/...product.jpg`) directly in static HTML. No placeholders, no lazy-load stubs. Non-Shopify sites use JS rendering with placeholder `src` attributes that get replaced client-side — the scraper sees the placeholder, not the final image.

### Summary
Two small filter additions (placeholder domains + tiny dimensions) in both the edge function and frontend. This is the same `pickBestImage` pattern — filter junk first, then pick the best remaining candidate.

