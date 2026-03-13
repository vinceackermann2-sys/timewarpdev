## Completed: Reduce Cloud Usage & Fix Microsoft Redirect

### Changes Made

1. **Removed all polling intervals** — `useSubscription` (was 5min), `useActionGate` (was 2min), workspace members (was 10s). All now fetch once and rely on manual `refetch()`/`refreshUsage()` calls.

2. **Deduplicated queries** — `ActionsCard` and `ActionsDialog` now consume `useActionGate()` context instead of running their own `actions-used` queries. `PlanUsageSummary` reads from the shared query cache.

3. **Fixed Microsoft OAuth redirect** — Frontend now passes `window.location.origin` through the OAuth state. `microsoft-oauth-callback` reads it from state and redirects back to the correct origin (preview or published URL).
