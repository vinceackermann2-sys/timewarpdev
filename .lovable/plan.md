

## Problem

The current moodboard pipeline searches cosmos.so via Firecrawl, trying to extract CDN image URLs from the search results' `links` array. The issue is:

1. **Cosmos.so doesn't expose direct CDN image links in page links** — the `links` array from Firecrawl search results contains page URLs, not image CDN URLs
2. **Screenshot fallback returns base64 data URIs** which are large and don't persist well
3. **Unsplash fallback** also relies on finding `images.unsplash.com` in page links, which is unreliable via search

## Proposed Solution: Use Firecrawl Scrape with Screenshot Format

Instead of searching and hoping to find image URLs in links, we should:

1. **Search cosmos.so** for relevant pages (keep current approach)
2. **Scrape the top result page** using Firecrawl's `screenshot` format to get an actual rendered image
3. **Upload the screenshot to storage** (business-data bucket) so it's a persistent, CORS-free URL
4. **Fall back to Unsplash scrape** using the same screenshot approach

### Changes

**File: `supabase/functions/scrape-product/index.ts`** (moodboard section ~lines 604-695)

- For each aesthetic term, after getting cosmos.so search results:
  - Take the first result URL and **scrape it** with `formats: ["screenshot"]` to get a reliable image
  - If screenshot is base64, upload it to the `business-data` storage bucket and return the public/signed URL
  - Same approach for Unsplash fallback
- This guarantees we get actual visual content instead of hoping for CDN links in page metadata

### Implementation Details

```text
Current flow:
  Search cosmos.so → extract links[] → hope for CDN URL → fallback to screenshot base64

New flow:
  Search cosmos.so → get page URL → scrape page with screenshot format
  → upload screenshot to storage → return persistent URL
  → fallback: search Unsplash → same scrape+upload pattern
```

- Storage path: `business-data/{user_id}/moodboard/{term-slug}.png`
- The uploaded URLs will be standard backend storage URLs, no CORS/hotlink issues
- Frontend `BrandExtendedSections.tsx` needs no changes — it already renders image URLs in `<img>` tags

### Alternative: Use Firecrawl `scrapeOptions` with `formats: ["screenshot"]` directly in the search call

The current code already requests `scrapeOptions: { formats: ["links", "screenshot"] }` in the search — but screenshots from search results may be unreliable. The more reliable approach is a dedicated scrape call on the top result URL.

### Scope

- **1 file changed**: `supabase/functions/scrape-product/index.ts` — rewrite the moodboard image extraction logic (~lines 604-695)
- Requires the `SUPABASE_SERVICE_ROLE_KEY` secret (already configured) for storage uploads from the edge function

