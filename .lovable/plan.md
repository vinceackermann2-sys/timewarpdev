

## Problems Identified

### 1. Missing `visualIdentity` initialization
The moodboard and illustration promises write to `extracted.brand.visualIdentity.moodboardUrls` and `.illustrationUrls`, but `visualIdentity` may not exist on the extracted object. The AI sometimes returns it, sometimes doesn't. These writes fail silently inside try/catch blocks.

**Fix**: Add an explicit initialization of `extracted.brand.visualIdentity` right after JSON parsing (before all the async promises start), ensuring it always exists as an object:
```typescript
if (!extracted.brand) extracted.brand = {};
if (!extracted.brand.visualIdentity) extracted.brand.visualIdentity = {};
```

### 2. Moodboard Pinterest search not returning images
The Firecrawl search API with `site:pinterest.com` returns search result pages, but the response metadata (`ogImage`) and markdown don't contain `pinimg.com` CDN URLs — those are lazy-loaded on Pinterest. The regex match for `i.pinimg.com` in markdown content finds nothing.

**Fix**: Instead of searching `site:pinterest.com`, search for aesthetic terms directly (e.g., `"Beauty lifestyle moodboard aesthetic inspiration"`). Then use `scrapeOptions` in the Firecrawl search to get the actual page screenshots or images from the result pages. Also extract images from `links` array in search results that point to image files.

### 3. Illustrations log success but don't appear
The logs show "Generated 2 illustrations" — meaning the AI image generation succeeds and the base64 data URLs are created. But the issue is likely either:
- The `visualIdentity` object doesn't exist when the illustration promise runs (same as #1)
- The base64 URLs are enormous and might be getting truncated in JSON serialization or exceeding response limits

**Fix**: Same initialization fix as #1. Also add logging of URL length to confirm data is being passed correctly.

## Plan

### Edge function changes (`supabase/functions/scrape-product/index.ts`):

1. **Add `visualIdentity` initialization** right after the `extracted` JSON is parsed (after line 436), before any async promises:
   ```typescript
   if (!extracted.brand) extracted.brand = {};
   if (!extracted.brand.visualIdentity) extracted.brand.visualIdentity = {};
   ```

2. **Fix moodboard Pinterest flow**:
   - Change search queries to remove `site:pinterest.com` prefix and use broader aesthetic terms with audience data
   - Add `scrapeOptions: { formats: ["links", "markdown"] }` to the Firecrawl search call to get actual page content
   - Extract image URLs from result `links` arrays (look for `.jpg`, `.png`, `.webp` extensions)
   - Also try extracting from `metadata.ogImage` and any `image` field in results
   - Keep Pinterest-preferred approach: first try with `pinterest moodboard` in query, then fallback to general aesthetic search

3. **Add error logging** for illustration and moodboard promise failures to surface silent errors

4. **Redeploy** the edge function

