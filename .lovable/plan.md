

## Plan: Fix onboarding persistence by moving DB inserts to a backend function

### Root cause

The 403 errors happen because `auth.uid()` in RLS policies is null/stale during the seconds after signup. Despite retries with `refreshSession` and `setSession`, the client-side JWT never becomes valid fast enough for the RLS check `user_id = auth.uid() AND is_workspace_member(auth.uid(), workspace_id)` to pass. This is a well-known race condition with `immediate_login_after_signup`.

Retrying harder on the client won't fix this — the JWT propagation delay is server-side.

### Solution

Move the brand/product/audience persistence to a new edge function that uses the **service role key** to bypass RLS. This matches the existing pattern used by other edge functions in this project (subscription management, AI agents, etc.).

### Changes

#### 1. New edge function: `supabase/functions/save-onboarding/index.ts`
- Accepts: `{ brandData, productData, audienceData, workspaceId }` in the request body
- Extracts user ID from the Authorization header JWT (verify the token, get the `sub` claim)
- If no workspace_id provided, queries `get_user_workspaces` to find one
- Inserts brand, product, audience rows into `user_business_data` using service role client
- Renames workspace to match brand name
- Returns `{ success: true, brandId }` on success

#### 2. Update `src/components/database/BusinessDNAOnboarding.tsx`
- Replace the entire `insertWithRetry` / step 2 block with a single call: `supabase.functions.invoke("save-onboarding", { body: { ... } })`
- Remove `waitForSession`, `resolveWorkspaceId`, and the exponential backoff retry logic — no longer needed since the edge function handles auth via service role
- Keep the progress animation and milestone flipping as-is
- On success response, update context and transition to step 3
- On error, show retry UI

#### 3. Progress bar fix
- The progress bar currently stalls because phase B (`scrapeComplete && !persistenceComplete`) increments by 0.008 per frame which is ~0.48/sec — too slow to be noticeable
- Increase the crawl rate to 0.05 per frame so it visibly moves from ~75% to 95% over ~7 seconds
- This ensures the bar always appears to be progressing

### Files to create/edit
- `supabase/functions/save-onboarding/index.ts` (new)
- `src/components/database/BusinessDNAOnboarding.tsx` (simplify step 2)

