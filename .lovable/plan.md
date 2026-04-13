

## Plan: Dashboard Cards Persistence, Update Button, and Icon Fixes

### Problems Identified
1. **No persistence**: Dashboard cards are stored only in React state (`allTabCards`). On every navigation away and back, or brand change, they re-fetch from the API.
2. **No manual refresh button**: Users must reload the page to get new insights.
3. **Card button placement**: The "View Details" button is on the right side; user wants it on the left.
4. **Broken integration icons**: `SOURCE_META` uses `/src/assets/...` paths (e.g., `/src/assets/logo-hubspot.svg`) which don't resolve in production builds. These need to be proper ES module imports.

### Changes

**1. Fix integration icons (`src/components/database/dashboardTypes.ts`)**
- Import SVG assets using ES module imports (`import logoHubspot from "@/assets/logo-hubspot.svg"`) instead of raw file paths.
- Update `SOURCE_META` to use the imported variables.

**2. Cache cards in localStorage (`src/components/database/ManageDashboardView.tsx`)**
- On successful fetch, persist `allTabCards` + `brandId` to `localStorage` (keyed by brand ID).
- On mount / brand change, load from localStorage first (instant display), then allow manual refresh.
- Remove the auto-reset of `cachedBrandId` on brand change so cached data stays visible.

**3. Add "Update" refresh button**
- Add a `RefreshCw` button in the dashboard header area that clears the cache for the current brand and re-fetches insights.
- Show a loading spinner on the button while fetching.

**4. Move card button to the left**
- In the `DashCard` component, swap the layout of the footer row so the "View Details" button is on the left and the timestamp is on the right.

### Files Modified
- `src/components/database/dashboardTypes.ts` — fix icon imports
- `src/components/database/ManageDashboardView.tsx` — localStorage caching, update button, button placement

