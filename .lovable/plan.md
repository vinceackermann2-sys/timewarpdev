

## Plan: Reliable Product Image Discovery for All Websites

### Problem
The current `isUsableImage` allowlist requires URLs to match specific CDN patterns (Shopify, Apple, Tesla) or have standard file extensions. This fails for most non-Shopify sites because modern CDNs serve images without extensions (e.g., Apple's `as-images` paths, Cloudflare Image Resizing, imgix, etc.). The allowlist approach is fundamentally unscalable.

### New Approach — Let the AI Pick the Best Image

Instead of regex-guessing which URL is a product image, pass the list of extracted image URLs to the AI during discovery and let it choose the best product image.

### Changes

**1. Edge function discover mode** (`supabase/functions/scrape-product/index.ts`, ~line 854-871)

Update the AI prompt in discover mode to include the list of extracted `pageImages` and ask the AI to select the best product image URL from that list:

```
From this product page content, extract the product name and a 1-sentence description.
Here are image URLs found on this page: ${JSON.stringify(pageImages.slice(0, 15))}
Select the 1-3 URLs that are most likely the MAIN product photo (not logos, icons, banners, or tracking pixels).
Return JSON: {"name": "", "description": "", "bestImages": []}
```

Then use `bestImages` as the primary image source, falling back to the regex-extracted list.

**2. Frontend `isUsableImage`** (`src/components/database/BusinessDNAOnboarding.tsx`, ~line 908-917)

Replace the restrictive allowlist with a simple blocklist-only approach. Since the AI already picked the best images, we just need to block obvious junk:

```ts
const isUsableImage = (u?: string) => !!u && /^https?:\/\//i.test(u) &&
  u.length > 30 &&
  !/(beacon|atb|tracking|pixel|spacer|blank|transparent|placehold|placeholder|favicon|1x1|badge)/i.test(u) &&
  !/[?&](w|width|h|height)=([1-9]|[1-4]\d)(&|$)/i.test(u) &&
  !u.endsWith('.svg') &&
  !u.includes('data:image');
```

No extension allowlist, no CDN pattern matching. Any real image URL passes.

**3. Redeploy edge function.**

### Why This Works
- The AI understands context — it knows a product photo from a tracking pixel
- No more regex arms race against every CDN format
- Shopify continues working (unchanged)
- Apple, Tesla, Nike, etc. work because the AI picks the right URL from the extracted list

### Files Changed
- `supabase/functions/scrape-product/index.ts` — update discover AI prompt to include image selection
- `src/components/database/BusinessDNAOnboarding.tsx` — simplify `isUsableImage` to blocklist-only

