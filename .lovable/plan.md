

## Plan: Fix Integration Disconnect Visibility and Slack Sync

### Problem Summary
1. **Disconnect button never appears** in Business DNA Database and Employee Settings because all existing `user_connections` rows have `brand_id = null`, but the backend strictly requires `brand_id = exactUUID`.
2. **Slack sync produces no data** because the connection status check fails (same root cause), so the sync flow either cannot find the token or the UI does not trigger it.

### Root Cause
The `connect-provider` edge function's `check-status` action filters strictly by `brand_id = resolvedBrandId`. However, the OAuth callbacks (Slack, Microsoft, HubSpot) store the `brandId` from the state parameter, which goes through `resolveBrandRowId`. If the logical brand ID resolves to a row UUID that differs from what was stored, or if the callback stored `null`, connections become invisible.

Current DB state: all `user_connections` rows have `brand_id = null`.

### Changes

#### 1. Backend: Re-add legacy fallback in `check-status` (connect-provider edge function)
- When a `brandId` is provided, query for connections where `brand_id = resolvedBrandId` **OR** `brand_id IS NULL`.
- This ensures existing unscoped connections are visible when viewing any business, while new connections get properly scoped.
- For the `disconnect` action, keep strict scoping (already correct).

#### 2. Backend: Ensure OAuth callbacks store `brand_id` correctly
- Review `slack-oauth-callback`, `microsoft-oauth-callback`, and `hubspot-oauth-callback` to verify they correctly write the `brand_id` from the state to `user_connections`.
- The `brandId` in the state comes from `resolveBrandRowId` in `connect-provider`, which converts logical IDs to row UUIDs. Verify callbacks pass this value through to the upsert.

#### 3. Frontend: Add Slack to OAuth success handler in BusinessDataListView
- The `oauth_success` handler currently only checks for `["microsoft", "slack"]` — confirm this includes slack and that sync is triggered.

#### 4. Verify Slack sync-provider-data flow
- Confirm the Slack sync code in `sync-provider-data` correctly fetches the token (the `getValidToken` function handles Slack by returning the access token directly).
- The Slack sync fetches channels, users, messages, pinned items, and files — this code exists and should work once the connection is properly detected.

### Files to Edit
- `supabase/functions/connect-provider/index.ts` — re-add `IS NULL` fallback in `check-status`
- Possibly `supabase/functions/slack-oauth-callback/index.ts` — verify `brand_id` is written correctly
- Possibly `supabase/functions/microsoft-oauth-callback/index.ts` and `hubspot-oauth-callback/index.ts` — same verification

### Expected Outcome
- Existing connections (with `brand_id = null`) show as connected with disconnect buttons in all views
- New connections get properly scoped with `brand_id` set
- Slack sync works after OAuth redirect because the connection is now detected

