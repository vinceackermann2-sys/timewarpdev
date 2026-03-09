

# Mobile Optimization Plan

## Current State
The website has partial mobile support — the hero section has inline `<style>` media queries, but many pages and components lack proper mobile optimization. Key issues:

1. **Landing page (HeroSection)**: Already has mobile styles via inline `<style>` tag — mostly functional but could be tightened
2. **ProductDescription sections**: Uses responsive Tailwind (`sm:`, `md:`, `lg:`) reasonably well, but stat numbers (`text-5xl sm:text-7xl lg:text-8xl`) may overflow on small screens and gaps are too wide
3. **Auth page**: `min-h-[1300px]` forces unnecessary scroll; auth card grid works but padding could be better
4. **Pricing page**: `min-h-[1300px]` same issue; 3-column grid stacks on mobile but `scale-[1.02]` on middle card causes overflow; billing toggle buttons crowd on small screens
5. **Database/App page**: `min-h-[1300px]` forces height; sidebar uses shadcn collapsible which works, but the main content views need overflow handling
6. **Footer**: Footer links wrap reasonably but spacing is generous; copyright line may not fit on one row
7. **Bottom CTA input**: Fixed height `h-16` may be awkward on mobile; button inside may get cramped
8. **General**: No `<meta name="viewport">` check needed (Vite adds it), but `App.css` has `max-width: 1280px` on `#root` which could cause issues

## Changes

### 1. Fix `App.css` — Remove restrictive `#root` styles
The `#root` has `max-width: 1280px`, `margin: 0 auto`, `padding: 2rem`, and `text-align: center`. These are Vite defaults that conflict with full-width layouts.

### 2. Auth page (`src/pages/Auth.tsx`)
- Remove `min-h-[1300px]` → use `min-h-screen`
- Adjust padding for mobile

### 3. Pricing page (`src/pages/PricingPage.tsx`)
- Remove `min-h-[1300px]` → use `min-h-screen`
- Make the 3-column grid stack properly on mobile (`grid-cols-1 md:grid-cols-3`)
- Remove `scale-[1.02]` on mobile for the middle card to prevent overflow
- Make billing period toggle wrap-friendly on small screens

### 4. Database page (`src/pages/Database.tsx`)
- Remove `min-h-[1300px]` → use `min-h-screen`

### 5. ProductDescription (`src/components/landing/ProductDescription.tsx`)
- Reduce stat number sizes on mobile (`text-3xl sm:text-5xl lg:text-8xl`)
- Reduce gaps in stat section for mobile
- Make bottom CTA input stack vertically on mobile (input + button)
- Footer: tighten mobile spacing, allow copyright line to wrap

### 6. HeroSection (`src/components/aiceo/HeroSection.tsx`)
- Minor tweaks: ensure navbar doesn't overflow on very small screens (already mostly handled)

### 7. Dashboard sidebar — already uses shadcn collapsible with auto-collapse for dataconversion view, which is solid for mobile

## Summary
~6 files edited. Focus on removing hardcoded `min-h-[1300px]`, fixing overflow on small screens, and ensuring all grids/flex layouts stack properly on mobile.

