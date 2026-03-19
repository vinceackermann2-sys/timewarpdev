

## Plan: Fix Three Broken Features

### Issue 1: Brand Extractor Returns 500
**Root cause:** Firecrawl returns HTTP 408 (timeout) when scraping the URL. The `scrape-product` function treats any non-2xx Firecrawl response as a fatal error and returns 500 to the client.

**Fix:** Add a retry with a simplified format (just `markdown` and `branding`, no `screenshot`) when Firecrawl times out (408). Screenshots are the most expensive format and often cause timeouts. If the retry also fails, return a more descriptive error message instead of a generic 500.

| File | Change |
|------|--------|
| `supabase/functions/scrape-product/index.ts` | Add retry logic on 408 with reduced formats; improve error message |

### Issue 2: Free Users Not Seeing Upgrade Gate
**Root cause:** The `useFreePlanGate` hook depends on `useSubscription`, which calls `check-subscription` edge function. If that call fails or returns an error (e.g., no auth header on initial load), `hasActivePlan` defaults to `false` and `plan` defaults to `null`, making `isFreeUser = true`. However, the sidebar gating code at lines 137 and 162 checks `isFreeUser === true || isFreeUser === null` — this should work.

The likely issue is that `useSubscription` caches results with a 30-minute stale time. If the query previously succeeded (returning `{ subscribed: false, plan: null }`), then `isFreeUser` should be `true`. But if `check-subscription` errors out with a 500, the `useQuery` throws, `subscription` becomes `undefined`, and `hasActivePlan` = `undefined ?? false` = `false`, `plan` = `undefined?.plan ?? null` = `null`. This still yields `isFreeUser = true`.

After deeper inspection: the actual problem might be that the `check-subscription` edge function throws for free users who have no Stripe customer record — but the code handles that at line 64-73. Let me check if the issue is that `check-subscription` returns a 500 due to auth issues.

Actually, looking more carefully at `useSubscription` line 61: `const remoteSubscription = error ? null : (data as SubscriptionData | null)`. If `supabase.functions.invoke` returns an error (e.g., the function returns a non-2xx), `error` is truthy and `remoteSubscription` is null. Then at line 79, `storedSubscriptionError` might also be null if the DB query works. So it falls through to line 86 returning `{ subscribed: false, plan: null }`. This means `isFreeUser = true`, which SHOULD trigger the gate.

**I need to verify the actual behavior.** The code logic looks correct. The issue may be that `isFreeUser` is `null` during loading but `openGate` has a stale closure where `isFreeUser` was `false`. Let me check the `openGate` callback — it has `[isFreeUser]` dependency, so it should update.

Wait — there's a subtle bug. The `openGate` function checks `if (isFreeUser === false) return;` but the default state of `isFreeUser` depends on the query being loaded. The `useSubscription` hook uses `staleTime: 30 * 60 * 1000` and `refetchOnWindowFocus: false`. If a previous session had a subscription check that returned data, the cached result persists. But actually, React Query's cache is in-memory and resets on page reload.

The more likely issue: `useSubscription` query might be **erroring silently** and never resolving, keeping `isLoading: true` indefinitely, which means `isFreeUser = null`. Then `openGate` is called (since `null` passes the check), and `openGate` checks `if (isFreeUser === false) return` — null is not false, so it proceeds to `setShowGate(true)`. This should work...

Let me reconsider. The user says "they don't get the popup." Perhaps `UpgradeGateDialog` isn't rendering. Let me check if it's actually mounted.

Looking at the sidebar code — `UpgradeGateDialog` is rendered at line 280-ish. It receives `open={showGate}` and `onOpenChange={closeGate}`. This should work.

**Alternative theory:** The `useFreePlanGate` hook might not be re-rendering when the subscription loads. The `openGate` callback has `[isFreeUser]` as dependency. When the user clicks, if `isFreeUser` is still `null` (loading), `openGate` runs and calls `setShowGate(true)`. But then when `isFreeUser` resolves to `true`, the component re-renders, but `showGate` is already `true` so the dialog shows. This should work.

**Most likely cause:** The `check-subscription` function is actually working fine and returning `{ subscribed: false, plan: null }` for free users. But `useSubscription` returns `hasActivePlan: false` and `plan: null`. Then `useFreePlanGate` computes `isFreeUser = !false && !null = true`. The gate SHOULD work.

I'll add defensive console logging and ensure the gate logic is bulletproof by simplifying the condition.

**Fix:** Simplify the gating logic — instead of the complex `isFreeUser` check, directly check in the click handler whether the user has an active plan. Also ensure the `UpgradeGateDialog` is properly rendered.

| File | Change |
|------|--------|
| `src/components/database/DatabaseSidebar.tsx` | Simplify gate check to be more explicit |
| `src/hooks/useFreePlanGate.ts` | Add logging, simplify logic |

### Issue 3: Free Users Can't Add One Business DNA
**Root cause:** In `AddProductURLView` (line 58) and `BrandingEditor` (line 126), both call `checkCanUseAction()` before proceeding. For free users, `remaining = 0` (limit is 0, no bonus actions), so `checkCanUseAction()` returns `false` and shows the upgrade dialog instead of allowing the extraction.

**Fix:** The Business DNA extraction flow should bypass the action gate for free users' first business. Instead of calling `checkCanUseAction()` in `AddProductURLView.handleContinue`, check if the user already has any business data. If they have zero businesses, allow the extraction regardless of action balance. Keep the gate for subsequent businesses.

| File | Change |
|------|--------|
| `src/components/database/AddProductURLView.tsx` | Skip action gate if user has 0 existing businesses |
| `src/components/database/BrandingEditor.tsx` | Skip action gate if user has 0 existing brands |

### Summary of Changes

| # | Issue | Files | Approach |
|---|-------|-------|----------|
| 1 | Scrape 500 error | `scrape-product/index.ts` | Retry on 408 with lighter formats |
| 2 | Gate not showing | `DatabaseSidebar.tsx`, `useFreePlanGate.ts` | Simplify and harden gate logic |
| 3 | Free user first business blocked | `AddProductURLView.tsx`, `BrandingEditor.tsx` | Allow first business without action check |

