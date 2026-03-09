

# Fix Mobile Performance While Keeping Grain

## Problem
The page is laggy on mobile even without grain. The real performance bottleneck is the SVG aurora itself -- 10 large `<rect>` elements each with `feGaussianBlur` filters (stdDeviation 60-90) that the GPU must composite continuously. The grain is a secondary cost.

## Optimization Strategy

### 1. Replace SVG aurora with a static CSS gradient on mobile
Instead of rendering 10 blurred SVG rects on mobile, use a CSS radial/linear gradient that visually approximates the aurora. This eliminates all SVG filter processing on mobile.

### 2. Add grain back on all devices using a lightweight approach
Use a smaller, fixed-size grain SVG (e.g. 200x200) tiled with CSS `background-repeat` instead of a full-viewport `feTurbulence` render. Or use a tiny base64 noise PNG (~2KB) as a repeating background -- this is nearly free for the GPU compared to real-time fractal noise generation.

### 3. Keep desktop unchanged
Desktop continues using the full SVG aurora + inline grain filters as-is.

## Implementation Details

**File: `src/components/aiceo/HeroSection.tsx`**

- Wrap the SVG aurora in `hidden sm:block` so it only renders on desktop
- Add a mobile-only CSS gradient background that approximates the aurora colors (purples, pinks, blues) using 3-4 radial gradients
- Replace the two `feTurbulence` grain SVGs with a single tiny (200x200) pre-rendered noise PNG encoded as base64, applied as a repeating `background-image` overlay on all screen sizes
- The base64 noise image is ~1-2KB and costs zero GPU compute vs `feTurbulence` which recalculates per-pixel

```text
Desktop path:  SVG aurora (10 blurred rects) + SVG grain filters
Mobile path:   CSS radial gradients + base64 noise PNG tile
Visual result: Nearly identical
```

### Expected Impact
- Eliminates ~10 `feGaussianBlur` filter passes on mobile (biggest win)
- Eliminates 2 `feTurbulence` filter passes on mobile
- Grain texture preserved via lightweight PNG tile (~0ms GPU vs ~100-200ms)
- No visual change on desktop

