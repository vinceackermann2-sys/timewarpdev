
Goal: fix new-user onboarding so it always creates the business, keeps progress believable, and stops the failing scrape/persistence chain.

What I found
- The immediate blocker is not just auth: `scrape-product` is returning 500 before persistence finishes.
- Edge logs pinpoint the 500 at `scrape-product/index.ts` around the AI response parse path (`Unexpected end of JSON input`), so the function is trying to parse an empty/truncated JSON body.
- After that failure, onboarding still proceeds into step 2 and attempts inserts with incomplete state. That leads to the 403 brand insert loop and an empty business.
- The 409 on `workspaces` is likely from duplicate workspace creation in `useWorkspace.ts` when the initial workspace list is temporarily empty for a brand-new account.
- The 403 `/logout` is a side symptom of auth churn during signup, not the main cause of the missing business.
- There are also accessibility warnings from dialogs that should be cleaned up, but they are not causing onboarding failure.

Implementation plan

1. Fix the edge function 500 first
- File: `supabase/functions/scrape-product/index.ts`
- Harden every external `fetch(...).json()` call that can receive an empty/non-JSON body.
- Especially fix the AI extraction response handling near the logged failure point:
  - read `await response.text()` first
  - guard against empty bodies
  - `JSON.parse` inside try/catch
  - return a structured error instead of throwing
- Apply the same defensive parsing to Firecrawl and other AI calls in this function where needed.

2. Stop onboarding from continuing after scrape failure
- File: `src/components/database/BusinessDNAOnboarding.tsx`
- Make step progression strict:
  - if `scrape-product` fails, do not advance into persistence
  - show retry state immediately
- Right now `scrapeComplete` is set in `finally`, which allows step 2 even on failure. Change that so step 2 only starts when extracted data is valid.

3. Fix the new-user auth/workspace race before inserts
- Files: `src/components/database/BusinessDNAOnboarding.tsx`, `src/hooks/useWorkspace.ts`
- In onboarding, resolve a fresh session right before DB writes and use that `session.user.id`.
- Keep the retry for 403, but only after confirming scrape succeeded.
- In `useWorkspace.ts`, stop auto-creating a workspace when RPC briefly returns empty for a new user unless it’s clearly missing after a safer re-check. This should eliminate the 409 conflict path.

4. Make onboarding persistence verifiable
- File: `src/components/database/BusinessDNAOnboarding.tsx`
- Insert brand/product/audience only after:
  - valid extracted payload exists
  - workspace id exists
  - authenticated session exists
- Capture insert results explicitly and only mark completion once required rows succeed.
- If any required insert fails, keep the user in onboarding with a clear retry state.

5. Make progress/logging reflect real phases
- File: `src/components/database/BusinessDNAOnboarding.tsx`
- Tie the flipping text to actual phases:
  - resolving workspace
  - scraping site
  - extracting business data
  - saving brand/product/audience
  - finalizing workspace
- Make progress phase-based:
  - 0–80 only while scrape is actively running
  - 80–95 during confirmed persistence
  - 100 only after inserts and finalization succeed
- If scrape fails, freeze below completion and show the error state instead of moving on.

6. Clean up the dialog accessibility warnings
- Files with `DialogContent` lacking title/description, starting with:
  - `src/components/landing/AuthDialog.tsx`
  - likely `src/components/database/UpgradeGateDialog.tsx`
  - likely `src/components/database/ActionsDialog.tsx`
  - likely `src/components/database/EmployeeDetailView.tsx`
- Add `DialogTitle` and either `DialogDescription` or `aria-describedby={undefined}` where appropriate.
- This won’t fix onboarding, but it will remove the repeated console noise.

Expected result
- New users can complete onboarding without the scrape crashing.
- The business rows are actually created in the workspace before onboarding exits.
- Backing out of Business DNA still shows the created business.
- Progress and flipping logs match the real backend state.
- Console noise is reduced to actionable issues only.
