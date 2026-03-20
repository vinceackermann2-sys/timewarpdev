

## Plan: Three Changes

### 1. Remove Workspace Selector from Data Conversion NodePalette
The `NodePalette` component has a full workspace selector (lines 160-213). Since workspace is now in the main sidebar, remove the workspace section and keep only the business selector.

| File | Change |
|------|--------|
| `src/components/database/dataconversion/NodePalette.tsx` | Remove workspace imports, state, and the "Workspace" section (lines 162-213). Keep only the "Business" selector. Remove `useWorkspace` import and usage. |

### 2. Fix RestrictedFeatureGate for Free Users
The gate logic in `RestrictedFeatureGate` looks correct on paper, but there is a likely root cause: the `increment_actions_used` DB function (line 5-6) does `INSERT INTO user_subscriptions (user_id, plan, ...) VALUES (_user_id, 'co_founder', 0, 0, 'active') ON CONFLICT DO NOTHING`. This means any user who has ever triggered an action check gets a `co_founder` row with `active` status. Then `check-subscription` reads this row, finds `plan = co_founder, status = active`, and returns `subscribed: true, plan: co_founder` — making the gate think they are paid.

**Fix:** The `RestrictedFeatureGate` should not solely rely on `useSubscription` (which can be polluted by the DB fallback). Instead, it should also verify against Stripe by checking if `subscription?.product_id` exists, OR use a stricter check: only consider the user as paid if `hasActivePlan` is true AND `plan` is not null. Additionally, since we cannot change the DB function easily, the gate should also query `user_subscriptions` directly and check if `actions_used < limit` to distinguish real paid users from auto-created rows.

Simpler approach: Check if the user has a Stripe subscription (product_id is set) OR a legitimate DB plan. The `check-subscription` function returns `product_id` which is only non-null if Stripe confirms an active subscription. Use this as the ground truth.

| File | Change |
|------|--------|
| `src/components/database/RestrictedFeatureGate.tsx` | Change gating logic: user is free if `!subscription?.product_id` AND the DB plan came from auto-creation (no Stripe backing). Simplest fix: check `!hasActivePlan || !subscription?.product_id` alongside the plan check. Actually, the cleanest: use `subscription?.subscribed && subscription?.product_id` as the "is paid" signal. |

Wait — re-reading `check-subscription`: for users with no Stripe customer, it returns `subscribed: Boolean(fallbackPlan)`. If `fallbackPlan` is `co_founder` (from the auto-created row), it returns `subscribed: true, plan: 'co_founder', product_id: null`. So `hasActivePlan = true` and `plan = 'co_founder'`, making `isFreeUser = false`. The gate doesn't trigger.

**Root cause confirmed:** The `increment_actions_used` function auto-creates a `co_founder` subscription row for every user, which poisons the subscription check.

**Fix approach:** In `RestrictedFeatureGate`, require `product_id` to be non-null to consider a user as paid. Users with auto-created DB-only rows (no Stripe product) are treated as free.

| File | Change |
|------|--------|
| `src/components/database/RestrictedFeatureGate.tsx` | Change `isFreeUser` to: `!isLoading && !subscription?.product_id` — only users with a real Stripe product are considered paid. |

### 3. Create `decrement_action` Database Function for Desktop Agent
The user's desktop app expects a `decrement_action(p_user_id uuid) RETURNS boolean` function. Our schema uses `user_subscriptions` (not `profiles`), so adapt the function to work with our existing tables. It should check plan limits and increment `actions_used`, returning `true` if allowed and `false` if limit reached. This is essentially a boolean wrapper around the existing `increment_actions_used` logic.

Also update the desktop-agent edge function to use `decrement_action` instead of `increment_actions_used`, since the app expects this function name.

| File | Change |
|------|--------|
| DB migration | Create `decrement_action(p_user_id uuid) RETURNS boolean` that checks plan limits and increments `actions_used`, returning true/false |
| `supabase/functions/desktop-agent/index.ts` | Switch from `increment_actions_used` RPC to `decrement_action` RPC, check boolean return |

### Summary

| # | Task | Files |
|---|------|-------|
| 1 | Remove workspace from NodePalette | `NodePalette.tsx` |
| 2 | Fix gate for free users | `RestrictedFeatureGate.tsx` |
| 3 | Create `decrement_action` function | DB migration, `desktop-agent/index.ts` |

### Technical Detail
The `decrement_action` function will mirror `increment_actions_used` logic but return a simple boolean:
- Check plan limits (timewarp_og=unlimited, aristotle=1000, co_founder=100, free=0)
- If `actions_used >= limit + bonus_actions`, return `false`
- Otherwise increment `actions_used` and return `true`
- Uses `SECURITY DEFINER` to bypass RLS

