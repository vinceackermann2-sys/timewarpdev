

## Plan: Fix UpgradeGateDialog, Free Plan Gate Logic, and Cloud Optimization

### 1. UpgradeGateDialog — Change from "Apply" to Direct Purchase

**File:** `src/components/database/UpgradeGateDialog.tsx`

- Change CTA button from "Apply Now — No Credit Card Required" to **"Get TimeWarp OG — $799/mo"**
- On click, invoke `create-checkout` with the TimeWarp OG monthly price ID (`price_1T7WkLGKbzbe9CQLd7zjQtl7`) and open the Stripe checkout URL
- Remove the navigate to `/timewarp-og`
- Update subtitle text to: "Get unlimited actions, employees, data conversion, and priority support."
- Remove "No Credit Card Required" messaging since this is now a direct purchase
- Update bottom text to: "Free users can analyze one Business DNA. Subscribe for full access."
- Add loading state while checkout session is being created

### 2. Fix Free Plan Gate — Only Show for Truly Free Users

**File:** `src/hooks/useFreePlanGate.ts`

The bug: `isFreeUser = !hasActivePlan` — but `hasActivePlan` comes from `subscription?.subscribed`, which queries Stripe. If the `check-subscription` call hasn't resolved yet (loading), `hasActivePlan` defaults to `false`, making paid users appear free.

Fix:
- Also check `isLoading` from `useSubscription()`
- When loading, `isFreeUser` should be `false` (don't gate while loading)
- This prevents paid users (co_founder, aristotle, timewarp_og) from seeing the upgrade popup

### 3. Cloud Usage Optimization Suggestions

After auditing the codebase, the main edge function calls are all event-driven (good). However:

**PricingPage.tsx** — calls `check-subscription` directly on mount (line 84) instead of using the cached `useSubscription()` hook. This creates a **duplicate Stripe API call** every time the pricing page loads.

**Fix:** Replace the manual `checkSubscription()` call in PricingPage with `useSubscription()` hook, reusing the cached result.

No other unnecessary calls found — all other function invocations are click-triggered.

### Technical Details

| File | Change |
|------|--------|
| `src/components/database/UpgradeGateDialog.tsx` | Direct Stripe checkout instead of navigate to /timewarp-og |
| `src/hooks/useFreePlanGate.ts` | Add `isLoading` check so paid users aren't gated |
| `src/pages/PricingPage.tsx` | Use `useSubscription()` hook instead of manual `check-subscription` call |

