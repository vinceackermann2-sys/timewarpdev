

## Findings

### 1. Data Limit Enforcement — NOT plan-aware
- The DB trigger `enforce_user_data_limit` uses a **hardcoded 3GB limit** for all users regardless of plan.
- Plan limits exist only on the frontend (`useSubscription.ts`): Free=1GB, Co-Founder=5GB, Aristotle=10GB, OG=unlimited.
- **Gap**: A free user could store up to 3GB (the trigger limit) instead of being capped at 1GB. No server-side plan check.

### 2. Microsoft Sync — hardcoded limits, no user choice
- `fetchMicrosoftData` fetches exactly **15 emails, 20 events, 10 files** — no user input.
- `sync-provider-data` blindly persists everything returned. No size budget or category selection.

---

## Plan

### A. Enforce plan-based data limits server-side

1. **Update `enforce_user_data_limit` trigger** — Instead of hardcoded 3GB, look up the user's plan from `user_subscriptions` and apply the correct limit (Free=1GB, Co-Founder=5GB, Aristotle=10GB, OG=unlimited). Fall back to 1GB if no subscription row exists.

2. **Add a pre-sync check in `sync-provider-data`** — Before inserting, estimate total data size for the user and reject/truncate if it would exceed their plan limit. Return a clear error message.

### B. Let users choose what Microsoft data to sync and how much

1. **Accept sync preferences in `sync-provider-data`** — New optional request body fields:
   - `categories`: array of `"emails" | "events" | "files"` (default: all)
   - `limits`: `{ emails?: number, events?: number, files?: number }` (default: 50 each, max based on plan)

2. **Update `fetchMicrosoftData`** to accept these limits and use them in the `$top` query param.

3. **Add a sync preferences UI** in `BusinessDataListView.tsx` — Before syncing, show a dialog/popover where users can:
   - Toggle which categories to sync (Emails, Calendar, Files)
   - Set a slider or input for how many items per category
   - See estimated data usage vs their plan limit
   - Confirm to start sync

### Files to modify
- `supabase/functions/sync-provider-data/index.ts` — accept preferences, enforce plan limits
- `src/components/database/BusinessDataListView.tsx` — add sync preferences dialog
- DB migration — update `enforce_user_data_limit` trigger to be plan-aware

