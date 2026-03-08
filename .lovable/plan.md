

# Mobile Optimization Plan

The hero page already has basic responsive styles at 1024px, but needs further optimization for smaller screens (phones).

## Changes to `src/components/aiceo/HeroSection.tsx`

1. **Navbar mobile**: Reduce logo size, reduce padding, shrink button/link text and padding for small screens
2. **Hero heading**: Already uses `clamp()` which is good — reduce bottom margins on mobile
3. **Subtitle**: Reduce font size on mobile
4. **URL input bar**: Reduce height from 64px, make the input and button stack or shrink gracefully
5. **Hint text**: Reduce font size
6. **Badges**: Allow wrapping, reduce size
7. **Add mobile breakpoint** at 640px in the existing `<style>` block covering:
   - Navbar: smaller logo, tighter padding, smaller gap
   - Hero main: less padding, less gap
   - H1: smaller margins
   - Subtitle: smaller font
   - Input bar: shorter height (52px), smaller button padding
   - Badges: flex-wrap, smaller text

All changes in a single file — extend the existing `<style>` block with a `@media (max-width: 640px)` rule and add classNames to elements that need them.

