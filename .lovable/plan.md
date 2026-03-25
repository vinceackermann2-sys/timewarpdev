
Diagnosis

The current failure is not the same old client-side RLS problem anymore. The save step is now failing inside the backend function itself.

What’s actually happening:
- `save-onboarding` is returning HTTP 500.
- The backend logs show the exact cause:
  - `insert or update on table "user_business_data" violates foreign key constraint "user_business_data_workspace_id_fkey"`
  - The function is trying to save with a `workspace_id` that does not exist.
- I also checked the database:
  - the current user does have a real workspace
  - but the `workspace_id` being passed from onboarding is a different, nonexistent one

Why it works through Business DNA but not onboarding:
- Business DNA runs after the normal workspace state has loaded and been normalized.
- Onboarding runs earlier and currently trusts `localStorage.getItem("preferred_workspace_id")`.
- If that local value is stale from an older session/account/deleted workspace, onboarding sends a bad workspace id to `save-onboarding`.
- `save-onboarding` currently trusts that client-provided id and inserts with it directly, so the foreign key fails and the whole save aborts.
- That is why manual creation works, while onboarding does not.

Also:
- the `feature_collector.js` deprecation warning is unrelated to the save failure
- the current blocking bug is the invalid workspace id path
- there is still a separate intermittent `scrape-product` JSON parse issue in logs, but the specific error you’re seeing now is the invalid workspace save path

Implementation plan

1. Fix `save-onboarding` so it never trusts the client workspace id blindly
- File: `supabase/functions/save-onboarding/index.ts`
- Treat `workspaceId` from the request as a hint only
- Resolve the user’s real workspace server-side using `get_user_workspaces`
- If the provided `workspaceId` is not one of the user’s actual workspaces, ignore it
- If no workspace exists yet, create one server-side and add the user as owner before inserting business data
- Only insert brand/product/audience after a verified workspace id exists
- Return the resolved workspace id actually used

2. Stop onboarding from sending stale workspace ids
- File: `src/components/database/BusinessDNAOnboarding.tsx`
- Remove the early `localStorage`-based workspace capture as the source of truth
- Call `save-onboarding` without a workspace id, or only with a validated one
- After success, store the backend-returned workspace id in localStorage
- Use that returned workspace id for the rest of the onboarding completion flow

3. Make the app resilient to cross-account stale local state
- Likely files: `src/hooks/useWorkspace.ts` and/or logout/auth flow
- Clear or overwrite `preferred_workspace_id` when it does not belong to the signed-in user
- This prevents an old browser session from poisoning onboarding for a newly signed-up account

4. Tighten the progress bar so it matches the real phases
- File: `src/components/database/BusinessDNAOnboarding.tsx`
- Keep scrape progress for phase 1
- During save phase, move from ~80 to low 90s only while the backend save request is in flight
- Jump to 100 only after the backend confirms success
- If save fails, freeze below completion and show the error immediately instead of appearing stuck

5. Secondary stabilization pass for scrape
- File: `supabase/functions/scrape-product/index.ts`
- Recheck the AI-response JSON parsing path because logs still show intermittent parse failures
- This is not the current save blocker, but it can still break onboarding on some runs

Files to edit
- `supabase/functions/save-onboarding/index.ts`
- `src/components/database/BusinessDNAOnboarding.tsx`
- `src/hooks/useWorkspace.ts`
- possibly the logout/auth cleanup path if needed
- optionally `supabase/functions/scrape-product/index.ts`

Expected result
- Onboarding will save into a real workspace every time
- New businesses created through onboarding will appear the same way as businesses created manually
- The 500 from `save-onboarding` will be eliminated
- The progress bar will no longer hang at 80/95 while the save is failing underneath
