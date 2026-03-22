

## Plan: Fix Annotation Visibility, Reposition, and Add Scroll Animations

### Changes

**File: `src/components/landing/ProductDescription.tsx`**

#### 1. Move annotations to the RIGHT side, make bigger, fix light mode visibility

- Move all three annotation groups from `left` positioning to `right` (e.g., `-right-48` instead of `-left-44`)
- Reverse the layout order: arrow first (pointing left toward robot), then icon + text
- Make icon circles bigger: `p-3.5` instead of `p-2.5`, icon size `w-6 h-6` instead of `w-4 h-4`
- Fix light mode: change icon circle from `bg-white/10 border-white/30` to theme-aware styling: `bg-black/10 dark:bg-white/10 border-black/20 dark:border-white/30` and icon/text colors to `text-foreground dark:text-white`

#### 2. Scroll-based image swap and icon reveal

- Save new robot image as `src/assets/timewarp-robot-2.png` (the uploaded AD_EVO_4.png)
- Add an Intersection Observer (`useRef` + `useEffect`) on the HeroBanner section
- Track scroll progress through the section using a scroll listener
- When user scrolls into the banner area:
  - Cross-fade from current robot image to new robot image (both absolutely positioned, opacity transitions based on scroll progress)
  - The 3 annotation icons fade in with a staggered delay (opacity 0 → 1, slight translateX) triggered when section enters viewport
- Use CSS transitions (`transition-all duration-700`) and state-driven class toggling for smooth animations

### Files Changed
- `src/assets/timewarp-robot-2.png` — new image asset
- `src/components/landing/ProductDescription.tsx` — annotation repositioning, sizing, theme colors, scroll animation logic

