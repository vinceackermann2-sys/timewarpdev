

## Plan: Free Plan Gating, OG-Only Upgrade Modal, and Optimization

### Summary
1. Free users get **0 actions** and can only analyze Business DNA (brand, product, audience) **once** (one business). Attempting to use Employees, Data Conversion, or adding a second business triggers a **TimeWarp OG upgrade popup** showing pricing and "23 spots left" (decrements on purchase, expires April 1st).
2. Rename "Scale assistance" → "Priority" across all references.
3. Ensure `create-action-purchase` and other edge functions are only called on explicit user action (already the case — no changes needed there).

### Changes

#### 1. New `UpgradeGateDialog` Component
Create `src/components/database/UpgradeGateDialog.tsx`:
- A modal showing TimeWarp OG pricing (monthly/yearly from the existing TimewarpOG page style)
- Shows "Only **X** spots left" badge — reads from a new DB row or uses a simple counter approach
- "Offer ends April 1st, 2026" urgency text
- "Apply Now" button links to `/timewarp-og` or opens checkout directly
- Spots counter: Store a `timewarp_og_spots` value in a lightweight config table or hardcode starting at 23 and decrement via a DB counter

#### 2. Database: Spots Counter
- Create a `platform_config` table with a single row: `key = 'og_spots_remaining'`, `value = '23'`
- Create a DB function `decrement_og_spots()` called when a timewarp_og subscription is created
- RLS: public SELECT, no direct INSERT/UPDATE/DELETE from client

#### 3. Free Plan Gating Hook — `useFreePlanGate`
Create `src/hooks/useFreePlanGate.ts`:
- Checks if user has **no active subscription** (plan is null/free)
- Checks if user already has ≥1 business (brand) in `user_business_data`
- Returns `{ isFreeUser, hasUsedFreeTrial, showUpgradeGate() }`
- `showUpgradeGate()` opens the UpgradeGateDialog

#### 4. Gate Integration Points
- **DatabaseSidebar.tsx**: When free user clicks "Data Conversion" or "Employees", intercept and show upgrade dialog instead of navigating
- **MyBusinessesView.tsx**: When free user clicks "Add Business" and already has ≥1 brand, show upgrade dialog
- **Database.tsx**: Pass gate state down or use context

#### 5. Update `useSubscription.ts`
- Change `actionsPerMonth: 20` → `actionsPerMonth: 0` in FREE_LIMITS
- Rename `scaleAssistance` → `priority` everywhere

#### 6. Rename "Scale assistance" → "Priority"
Files to update:
- `src/hooks/useSubscription.ts` — rename field
- `src/pages/PricingPage.tsx` — rename in features table
- `src/components/database/SettingsDialog.tsx` — rename in features table

#### 7. Update `useActionGate.tsx`
- Change `FREE_LIMIT` from `20` to `0`

#### 8. Cloud Usage — No Changes Needed
`create-action-purchase` is already only called on explicit button click. `check-subscription` uses 30-min stale time and no window refocus. `create-referral` only fires when the refer tab is active. All edge function calls are already event-driven, not polling.

### File Summary
| File | Action |
|------|--------|
| `src/components/database/UpgradeGateDialog.tsx` | **Create** — OG-only upgrade modal with spots counter |
| `src/hooks/useFreePlanGate.ts` | **Create** — free plan gating logic |
| `src/hooks/useSubscription.ts` | **Edit** — free actions → 0, rename scaleAssistance → priority |
| `src/hooks/useActionGate.tsx` | **Edit** — FREE_LIMIT → 0 |
| `src/components/database/DatabaseSidebar.tsx` | **Edit** — gate Data Conversion & Employees for free users |
| `src/components/database/MyBusinessesView.tsx` | **Edit** — gate second business add |
| `src/pages/PricingPage.tsx` | **Edit** — rename Scale assistance → Priority |
| `src/components/database/SettingsDialog.tsx` | **Edit** — rename Scale assistance → Priority |
| DB migration | **Create** — `platform_config` table with spots counter + `decrement_og_spots()` function |

