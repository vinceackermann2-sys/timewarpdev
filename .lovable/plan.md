

## Redesign "On This Page" Sidebar with Smooth Tree-Line Navigation

The reference HTML uses a sophisticated approach with:
- An SVG mask-based tree path on the left showing the full hierarchy structure
- A sliding colored indicator (`--toc-top` / `--toc-height` CSS variables with `transition-all`) that smoothly moves to the active item
- Diagonal SVG connectors between parent→child indentation levels
- Vertical line segments connecting siblings
- Fade masks at top/bottom of the scroll container
- Hidden scrollbar

### Plan

1. **Rewrite `ProductPageSidebar.tsx`** with the reference pattern:
   - Container: `overflow-auto [scrollbar-width:none]` with fade mask via `[mask-image:linear-gradient(...)]`
   - Generate an SVG path dynamically based on item count and indent levels (the tree line on the left)
   - Overlay a colored `div` that uses CSS variables `--toc-top` and `--toc-height` computed from the active item's position, with `transition-all` for smooth movement
   - Each item is an `<a>` or `<button>` with:
     - `padding-inline-start: 14px` for parents, `26px` for children
     - Diagonal SVG connector (`<line>`) when transitioning from parent→child or child→parent indentation
     - Vertical `w-px bg-foreground/10` line segments connecting siblings
   - Active item gets `data-active=true` → `text-primary` via data attribute selector
   - Use `useRef` on each item + `useEffect` to compute `--toc-top` and `--toc-height` from the active element's `offsetTop` and `offsetHeight`

2. **Rewrite `BrandPageSidebar.tsx`** with the same pattern, adapted for its parent/children structure.

### Technical Details

- Each sidebar item ref is stored in a `Map<string, HTMLElement>` via callback refs
- On `activeSection` change, look up the element in the map, read `offsetTop` and `offsetHeight`, set CSS variables on the container
- The SVG tree path is generated at render time by iterating items and computing Y coordinates based on item heights (each ~32px)
- Diagonal lines appear where indent level changes (parent→child: line from x=0→x=10, child→parent: line from x=10→x=0)
- The colored indicator div is absolutely positioned with `bg-primary` and uses the CSS variables for positioning, `transition-all` handles smooth animation

