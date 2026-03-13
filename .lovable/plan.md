

## Plan: Reduce Cloud Usage & Fix Microsoft Redirect

### Problem Analysis

**Cloud usage (78% database):**
- `actions-used` query polls every **2 minutes** across 3 components (ActionGateProvider, ActionsCard, ActionsDialog) — but action counts only change when an action is actually used
- `useSubscription` calls the `check-subscription` **edge function** (which hits Stripe API) every **5 minutes** — but subscription status only changes on purchase/cancel
- `SettingsDialog` and `WorkspaceDialog` poll workspace members every **10 seconds** via `setInterval`
- `BusinessDNAContext` polls localStorage every interval (unnecessary DB-adjacent overhead)

**Microsoft redirect:**
- `microsoft-oauth-callback` uses `FRONTEND_URL` env var with fallback to `https://digital-guide-genie.lovable.app` (wrong/old URL)
- Neither the published URL (`timewarpdev.lovable.app`) nor the preview URL is set as `FRONTEND_URL`

### Changes

#### A. Eliminate all polling — switch to event-driven refreshes

1. **`useSubscription.ts`** — Remove `refetchInterval`. Keep `staleTime: 30 * 60 * 1000` (30 min). Data is fetched once on mount and cached. The existing `refetch()` function is already exposed for manual refresh after checkout.

2. **`useActionGate.tsx`** — Remove `refetchInterval`. The `refreshUsage()` function already exists and is called after each action. That's the only time the count changes.

3. **`ActionsCard.tsx`** — Remove the **duplicate** `useQuery` for `actions-used`. Instead, consume the `useActionGate()` context which already has `remaining`. This eliminates a redundant query definition entirely.

4. **`ActionsDialog.tsx`** — Same: remove duplicate `useQuery`, use `useActionGate()` for remaining count.

5. **`SettingsDialog.tsx`** — Remove `PlanUsageSummary`'s duplicate query (it shares `actions-used` key, fine). Remove the **10-second `setInterval`** for workspace members — fetch once on workspace select, no polling.

6. **`WorkspaceDialog.tsx`** — Remove the **10-second `setInterval`** for workspace members.

#### B. Fix Microsoft OAuth redirect

1. **Pass frontend origin in OAuth state** — In `ConnectorGrid.tsx` and `SettingsDialog.tsx`, include `origin: window.location.origin` in the request body to `connect-provider`.

2. **`connect-provider/index.ts`** — Read `body.origin` and encode it into the OAuth state alongside `userId` and `returnPath`.

3. **`microsoft-oauth-callback/index.ts`** — Read `origin` from the decoded state and use it as `frontendUrl` instead of the env var. Fall back to `FRONTEND_URL` or the published URL if not present.

### Files to modify
- `src/hooks/useSubscription.ts` — remove polling
- `src/hooks/useActionGate.tsx` — remove polling  
- `src/components/database/ActionsCard.tsx` — use context instead of duplicate query
- `src/components/database/ActionsDialog.tsx` — use context instead of duplicate query
- `src/components/database/SettingsDialog.tsx` — remove 10s interval, remove duplicate query
- `src/components/database/WorkspaceDialog.tsx` — remove 10s interval
- `src/components/aiceo/ConnectorGrid.tsx` — pass origin
- `supabase/functions/connect-provider/index.ts` — pass origin in state
- `supabase/functions/microsoft-oauth-callback/index.ts` — use origin from state

### Impact
This should reduce database server usage dramatically — from constant polling every 2-10 seconds to purely on-demand queries. No functionality changes; data still refreshes when it actually changes.

