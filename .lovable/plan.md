

## Plan: Add Annotated Arrows to Robot Image

### Overview
Add three white arrows with glassmorphic circle icons and labels pointing to the robot's head (brain), eyes (eye), and hands (computer) in the HeroBanner section. The arrows and labels will extend outside the pink grained card using CSS positioning.

### Implementation

**File: `src/components/landing/ProductDescription.tsx`**

Modify the `HeroBanner` component's right-side image container:

1. Remove `overflow-hidden` from the outer image wrapper div so arrows can extend outside the card
2. Add a wrapper with `overflow-hidden` only on the inner card (to still clip the grain texture)
3. Add three absolutely-positioned annotation elements, each consisting of:
   - A glassmorphic circle icon (backdrop-blur, white/10 bg, white border, rounded-full)
   - A small white label text
   - A clean white SVG arrow/line pointing from the icon toward the respective body part

**Annotation positions (approximate, using percentage-based positioning):**
- **Brain / "Analyzing everything"** — top area, arrow points to head (~top 10-15%)
- **Eye / "Sees everything"** — middle area, arrow points to eyes (~top 35-40%)
- **Computer / "Executes from DNA"** — lower area, arrow points to hands (~top 65-70%)

**Icons used from lucide-react:** `Brain`, `Eye`, `Monitor` (already have Brain and Eye imported, add Monitor)

**Glassmorphic circle style:**
```
bg-white/10 backdrop-blur-md border border-white/30 rounded-full p-2
```

**Arrow style:** Simple white SVG lines with a small arrowhead, clean and minimal.

**Responsive:** Hide annotations on mobile (`hidden md:flex`) to keep layout clean on small screens.

### Files Changed
- `src/components/landing/ProductDescription.tsx` — Update HeroBanner with arrow annotations

