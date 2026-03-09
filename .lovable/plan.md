

# Mobile Optimization — Full Plan

## Changes

### 1. `/app` page — Mobile header with menu trigger (`src/pages/Database.tsx`)
Add a mobile-only header bar at the top of `SidebarInset` with a hamburger/menu icon (top-right) that calls `toggleSidebar()` from the `useSidebar` hook. The shadcn sidebar already renders as a Sheet drawer on mobile — it just needs a visible trigger button.

Create a small `MobileHeader` component inline that uses `useSidebar` and renders only on `md:hidden`.

### 2. `/app` page — Block canvas on mobile (`src/components/database/DataConversionView.tsx`)
When on mobile (use `useIsMobile` hook), show a message like "Data Conversion canvas requires a desktop browser" instead of rendering `NodePalette` + `WhiteboardCanvas`.

### 3. Footer mobile fixes (`src/components/landing/ProductDescription.tsx`)
- Footer link columns: change `flex-wrap gap-10` to `gap-6 sm:gap-10` for tighter mobile spacing
- Footer brand + links: use `flex-col` on small screens (already does this)
- Copyright row: already wraps, just tighten gap

### 4. Pricing page (`src/pages/PricingPage.tsx`)
- Billing toggle buttons: reduce padding on mobile with `px-3 sm:px-5`
- Fix typo on line 147: `min-h-screeng-background` → `min-h-screen bg-background`
- Grid already stacks on mobile (`md:grid-cols-3`)

### 5. Auth page (`src/pages/Auth.tsx`)
- Already uses `min-h-screen`, just verify padding is mobile-friendly

### 6. HeroSection (`src/components/aiceo/HeroSection.tsx`)
- Already has comprehensive mobile media queries — no changes needed

## Summary
~4 files modified. Key addition is the mobile menu trigger on `/app` and blocking the canvas view on mobile.

