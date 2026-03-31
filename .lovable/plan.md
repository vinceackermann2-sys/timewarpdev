

## Plan: Move BG Removal to Image Picker & Improve Forging Carousel

### Summary
Three changes: (1) Remove automatic background removal on product discovery, instead add a manual "Remove BG" button on the image picker step. (2) Make the forging carousel quotes actually back the verified data/sources. (3) Stop the carousel flipping once `persistenceComplete` is true (finalize button unlocked).

### Changes — `src/components/database/BusinessDNAOnboarding.tsx`

**1. Remove auto BG removal useEffect (lines 234-270)**
- Delete the entire `useEffect` that fires on `discoveredProducts` change and calls `remove-bg` for every image automatically.
- Keep the `bgRemovedImages` state and `bgRemovalInFlight` ref — they'll be used by the manual button.

**2. Add "Remove Background" button on image picker step (around line 986)**
- On each image tile in the grid, add a small button (e.g., bottom-left or overlay) labeled with an eraser/wand icon that calls the `remove-bg` edge function for that specific image on click.
- Show a spinner on the button while processing, then swap the image to the bg-removed version.
- This makes BG removal opt-in per image, avoiding the upfront latency.

**3. Stop carousel when finalize is unlocked (line 302-316)**
- In the source carousel `useEffect`, add `persistenceComplete` to the dependency array and clear the interval (or don't start it) when `persistenceComplete` is true.
- Updated logic: `if (step !== 4 && step !== 5) return; if (persistenceComplete) return;`

**4. Improve carousel quotes to back verified data (lines 1127-1200)**
- Instead of cycling `socialProof[activeSourceIndex % socialProof.length]` (which just rotates quotes generically), match quotes to the current source URL being verified. Filter `socialProof` entries whose `.source` domain matches the current `urls[activeSourceIndex]` domain.
- Fallback: if no quote matches the current source, show a generic data confirmation like "Brand identity confirmed from [source]" or skip the quote for that source.
- When `persistenceComplete` is true, show a final "All sources verified ✓" state instead of continuing to flip.

### Technical Details
- The `remove-bg` edge function already exists and works — no backend changes needed.
- The carousel interval cleanup is straightforward: add `persistenceComplete` check at the top of the effect and to its dependency array.
- Quote matching: parse domain from `urls[activeSourceIndex]` and compare against `socialProof[].source` to find relevant quotes.

### Files Changed
1. `src/components/database/BusinessDNAOnboarding.tsx` — all changes in this single file

