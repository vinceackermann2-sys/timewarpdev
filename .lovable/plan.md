

## Plan: Fix `isUsableImage` to Require Image-Like URLs

### Root Cause

The `isUsableImage` filter on line 908 uses a blocklist approach (block known bad patterns). But `https://www.apple.com/shop/beacon/atb` passes all blocklist checks because "beacon" isn't in the list. Meanwhile, valid Apple CDN images sit at `allImages[1]` and `allImages[2]` but never get picked because `find()` stops at index 0.

**The fix**: Switch from blocklist to allowlist. A valid image URL must either end with an image extension OR match known image CDN patterns. This is what the technical advisor suggested.

### Changes

**File: `src/components/database/BusinessDNAOnboarding.tsx` (lines 908-913)**

Replace the current `isUsableImage` with a positive-match approach:

```ts
const isUsableImage = (u?: string) => !!u && /^https?:\/\//i.test(u) &&
  // Block known junk patterns
  !/(beacon|atb|tracking|pixel|spacer|blank|transparent|placehold|placeholder)/i.test(u) &&
  !/[?&](w|width|h|height)=([1-9]|[1-4]\d)(&|$)/i.test(u) &&
  // MUST look like an actual image: has image extension OR known image CDN pattern
  (
    /\.(?:jpe?g|png|webp|avif|gif)(?:[?#]|$)/i.test(u) ||
    /\/image\/upload\/.+\/[^/?#]+\.(?:jpe?g|png|webp|avif)/i.test(u) ||
    /storeimages\.cdn-apple\.com\/.+\/as-images?/i.test(u) ||
    /cdn\.shopify\.com\/.*\.(jpg|png|webp)/i.test(u) ||
    /digitalassets.*tesla.*\.(?:jpg|png|webp)/i.test(u)
  );
```

This ensures:
- `beacon/atb` is blocked (no image extension, no CDN pattern match)
- Apple CDN URLs like `store.storeimages.cdn-apple.com/.../as-images` pass
- Shopify CDN, Tesla Cloudinary, and standard `.jpg/.png` URLs all pass
- The `find()` call skips index 0 and picks the valid image at index 1

### Files Changed
- `src/components/database/BusinessDNAOnboarding.tsx` — rewrite `isUsableImage` filter

