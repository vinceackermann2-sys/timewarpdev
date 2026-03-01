

## Problem

The "On This Page" right sidebar uses `position: sticky` inside a Radix `ScrollArea` component. Radix ScrollArea uses a custom viewport element with specific overflow handling that breaks CSS `sticky` positioning. The sidebar cannot stick to the viewport because the scroll container is the Radix viewport wrapper, not a native scrolling ancestor.

This affects both:
- `ProductDetailView.tsx` — sidebar inside `<ScrollArea className="flex-1">`
- `BusinessDNAView.tsx` — sidebar inside `<ScrollArea className="flex-1 w-full">`

## Fix

Replace `ScrollArea` with native overflow scrolling (`overflow-y-auto`) in both views. This makes the scrolling container a regular DOM element where `sticky` works correctly.

### Changes

1. **`src/components/database/ProductDetailView.tsx`**
   - Remove `ScrollArea` import
   - Change `<ScrollArea className="flex-1">` to `<div className="flex-1 overflow-y-auto">`
   - Close with `</div>` instead of `</ScrollArea>`

2. **`src/components/database/BusinessDNAView.tsx`**
   - Remove `ScrollArea` import
   - Change `<ScrollArea className="flex-1 w-full">` to `<div className="flex-1 w-full overflow-y-auto">`
   - Close with `</div>` instead of `</ScrollArea>`

This preserves all existing layout and scroll behavior while enabling native `sticky` support for the sidebar navigation.

