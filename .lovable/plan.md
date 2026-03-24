

## Plan: Enhanced Scanning Sources & Progress UX

### File: `src/components/database/BusinessDNAOnboarding.tsx`

### Change 1: Show actual sources being analyzed
Replace the generic sources list with contextual, URL-derived sources. Extract the domain from the user's URL and generate realistic sub-page sources (e.g., `/about`, `/products`, `/pricing`, `/blog`) plus relevant third-party research sources (Google, LinkedIn, Crunchbase). The right card will show a running list of already-scanned sources (stacking up) instead of just flipping one at a time.

### Change 2: Two-phase progress bar
- **Phase 1 (0-80%)**: Rush from 0 to 80% in ~3 seconds using an ease-out curve — gives an immediate sense of speed.
- **Phase 2 (80-100%)**: Progress from 80% is tied to real scrape completion. It creeps slowly while waiting, then jumps to 100% when `scrapeComplete` is true.

### Change 3: "What it's doing" examples below the flipping text
Add a secondary area beneath the step icon + rotating text on the left card that shows concrete examples of extracted data in real-time. For step 1: rotating snippets like "Found 12 product features", "Identified 3 competitor brands", "Extracted pricing tiers". For step 2: "Creating brand profile...", "Mapping 5 audience segments", "Generating positioning strategy". These will be small pill/chip-style items that fade in below the main text.

### Technical details
- New `STEP_1_EXAMPLES` and `STEP_2_EXAMPLES` arrays with concrete action descriptions
- New `ACTUAL_SOURCES` function that derives realistic page paths from the input URL domain
- Scanned sources accumulate in a visible list (last 4-5 shown) rather than single flip
- Progress `useEffect` rewritten with two-phase logic using `Math.min(80, ...)` for fast phase and `80 + (scrapeComplete ? 20 : slowCreep)` for real phase
- All changes in a single file

