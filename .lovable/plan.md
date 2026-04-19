

## Goal

Convert the **Business DNA** sidebar item into an expandable dropdown (mirroring the Dashboard pattern), with 9 sub-items for the pillars: Brand, Product, Audience, Market, Financial, Operations, People, Growth, Strategy.

The Assistant item (agent name + brain orb icon) stays unchanged. No real values from the uploaded zip are pulled in — UI only.

## Scope

**Files to edit:**
- `src/components/database/DatabaseSidebar.tsx` — add the dropdown UI
- `src/pages/Database.tsx` — track active pillar, pass it down
- `src/components/database/BusinessDNAView.tsx` — accept `activePillar` prop and sync `activeSegment`
- `src/components/database/TopBreadcrumb.tsx` — show pillar name as third crumb when on Business DNA

## Design

### 1. Sidebar — Business DNA dropdown

Identical visual pattern to the existing Dashboard `Collapsible`:
- Trigger row: `Dna` icon, "Business DNA" label, chevron that rotates 180° when open.
- Clicking the trigger row both navigates to the Business DNA view AND expands the group (same behavior as Dashboard).
- Expanded list (collapsed sidebar hides this; only icons in tooltip mode):
  - Indented under a left-border (`ml-6 border-l border-border/50 pl-2`), small `text-sm` rows, each with a 3.5×3.5 icon + label.
  - Active pillar highlighted with `bg-primary/10 text-primary font-medium`.

Pillar list (icons from lucide-react, all already imported in BusinessDNAView):

| # | Pillar | Icon |
|---|--------|------|
| 1 | Brand | `Palette` |
| 2 | Product | `Package` |
| 3 | Audience | `Users` |
| 4 | Market | `TrendingUp` |
| 5 | Financial | `DollarSign` |
| 6 | Operations | `Cog` |
| 7 | People | `Users2` |
| 8 | Growth | `Rocket` |
| 9 | Strategy | `Target` |

### 2. State wiring

- Add `dnaPillar` state (default `"brand"`) in `Database.tsx`, similar to existing `dashboardTab`.
- Pass `activePillar` + `onPillarChange` into `DatabaseSidebar` and `BusinessDNAView`.
- In `DatabaseSidebar`, new `dnaExpanded` local state (default true if `currentView === "businessdna"`).
- Clicking a pillar item: calls `onViewChange("businessdna")`, sets `activePillar`, and (if a brand is already active) the BusinessDNAView jumps directly to that segment via `setActiveSegment(pillarId)` in a `useEffect` keyed on the prop.
- If no brand selected yet (MyBusinessesView is showing), still switch view; the pillar will apply once a business is opened.

### 3. BusinessDNAView change

- Add 6 missing `BrainSegment` entries (`market`, `financial`, `operations`, `people`, `growth`, `strategy`) to the `BRAIN_SEGMENTS` array — currently only 5 exist (brand, product, audience, database, settings). Reuse the same primary color tokens (no new colors).
- `setActiveSegment` initialised from `activePillar` prop and synced via `useEffect`.
- The pillars without backed-in entity counts simply use `segmentEntries[id]?.length || 0` (already supported by `getSegmentCount`).

### 4. Breadcrumb

Already shows `Business DNA` as final crumb when on that view. Append a third crumb showing the pillar name when on Business DNA, e.g. `Acme / Business DNA / Brand`.

### 5. What is NOT changed

- Assistant nav item (agent name, brain orb) — untouched.
- AI CEO logic, no example values from the uploaded zip are surfaced.
- No DB / RPC changes; no edge functions touched.
- Onboarding flow untouched.

## Visual reference (sidebar after change)

```text
Workspace
  🤖  Assistant
  🧬  Business DNA           ▾
       │  🎨 Brand
       │  📦 Product
       │  👥 Audience
       │  📈 Market
       │  💲 Financial
       │  ⚙️ Operations
       │  👥 People
       │  🚀 Growth
       │  🎯 Strategy
  🔌  Connectors

Manage
  🗂  Dashboard              ▾
       │  ...
```

