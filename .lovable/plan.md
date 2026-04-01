

## Plan: Fix Tesla/Cloudinary Image Extraction

### Root Cause

Tesla's product images use Cloudinary-style URLs like:
```
https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Model-3-Standard-Affordable-Desktop.jpg
```

These URLs exist in raw HTML (in CSS, inline styles, JSON data, script blocks) but are NOT captured by any of the current 11 extraction patterns because:
1. They're not in standard `<img src>` tags (Tesla uses JS rendering)
2. The bare image URL regex (pattern 6) requires URLs to end with `.jpg`/`.png` etc., but the comma-separated transform params (`f_auto,q_auto`) can confuse the regex or the URLs are embedded in contexts where whitespace splitting breaks them
3. The markdown from Firecrawl strips these out since they're in JS/CSS contexts

### Fix — Two changes

**1. Edge function: Add dedicated Cloudinary/CDN image extractor** (`supabase/functions/scrape-product/index.ts`)

Add pattern 12 to `extractImagesFromMarkdown` that specifically targets Cloudinary-style `image/upload` URLs with a real filename at the end:

```ts
// 12. Cloudinary-style CDN URLs (Tesla, etc.) embedded anywhere in content
const cloudinaryRegex = /https?:\/\/[^"'\s>)]+\/image\/upload\/[^"'\s>)]+\.(?:jpg|jpeg|png|webp|avif)/gi;
while ((m = cloudinaryRegex.exec(markdown)) !== null) {
  addImg(m[1] || m[0]);
}
```

This catches URLs like `digitalassets.tesla.com/.../image/upload/f_auto,q_auto/Model-3...jpg` that the other patterns miss.

**2. Frontend: Fix overly aggressive `isUsableImage` filter** (`src/components/database/BusinessDNAOnboarding.tsx`)

The current regex on line 909 blocks ALL URLs containing `/image/upload/` followed by transform params. But valid Cloudinary URLs have transform params AND a real filename. Fix to only block URLs that END with transform params (no filename):

```ts
// Current (too aggressive - blocks valid Cloudinary URLs WITH filenames):
!/\/image\/upload\/(?:[a-z]_[a-z0-9]+\/?)*$/i.test(u)

// Fixed (only blocks if there's NO real filename after transforms):
!/\/image\/upload\/(?:[a-z]_[a-z0-9,]+\/?)*$/i.test(u)
```

Also update line 910 to handle comma-separated transforms:
```ts
!/\/(?:c_scale|f_auto|q_auto|w_\d+|h_\d+|c_fill|c_fit|c_crop)$/i.test(u)
```

**3. Redeploy edge function.**

### Why This Fixes It
- The new Cloudinary regex explicitly captures Tesla's `image/upload/.../filename.jpg` pattern from raw HTML
- The relaxed frontend filter stops rejecting valid Cloudinary URLs that have real filenames after the transform params
- Shopify continues working because its CDN URLs don't use `/image/upload/` patterns

### Files Changed
- `supabase/functions/scrape-product/index.ts` — add Cloudinary extraction pattern
- `src/components/database/BusinessDNAOnboarding.tsx` — fix `isUsableImage` regex

