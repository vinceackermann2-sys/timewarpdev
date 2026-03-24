
Fixes to implement

1. Onboarding “Analyzing business” should flip through real tasks, not fake copy
- File: `src/components/database/BusinessDNAOnboarding.tsx`
- Replace the stacked history as the primary status with a single animated “current task” line that flips/crossfades through actual phases only.
- Drive it from real milestones in the flow:
  - resolving workspace
  - starting website scrape
  - scraping homepage
  - scraping submitted URL
  - extracting brand/product/audience data
  - saving brand
  - saving product
  - saving audience
  - renaming workspace
  - finalizing setup
- Keep a short completed-history list underneath only if needed, but the main UI should be the flipping live task.

2. Fix the progress bar so it does not stall at 60%
- File: `src/components/database/BusinessDNAOnboarding.tsx`
- Root cause: current step-1 logic hard caps the loading animation at `60%`.
- Change progress to a two-phase model:
  - Phase A: animate quickly from `0 → 80%` while the scrape is actively running
  - Phase B: advance from `80 → 100%` only from real confirmed milestones during extraction/persistence/finalization
- 100% should happen only after:
  - inserts succeeded
  - workspace rename succeeded
  - the created business is ready to open

3. Fix the “empty business / business disappears” bug at the source
- Files: `src/components/database/BusinessDNAOnboarding.tsx`, `src/pages/Database.tsx`
- Root causes in the current code:
  - onboarding can still advance to step 3 even when no workspace/session is found
  - it also advances even if one or more DB inserts fail
  - the app navigates into Business DNA before the normal provider has reloaded the created brand
- I’ll change step 2 to be strict:
  - do not continue if workspace resolution fails
  - do not continue if brand/product/audience inserts fail
  - only set `createdBrandId` after confirmed successful persistence
  - surface an error/retry state instead of silently continuing

4. Make persistence verifiable instead of “fire and hope”
- File: `src/components/database/BusinessDNAOnboarding.tsx`
- Insert brand/product/audience with awaited success checks and capture returned rows.
- Treat brand creation as required, audience optional only if no audience data exists.
- Only rename the workspace after the business records are confirmed saved.
- Only mark onboarding complete after all required writes succeed.

5. Make post-onboarding landing reliable
- Files: `src/pages/Database.tsx`, likely `src/components/database/BusinessDNAContext.tsx`
- Add a handoff so the normal Business DNA provider waits for the created brand to be present before opening the detail view.
- Prevent the app from showing an empty Brand/Audience/Product screen while data is still loading.
- After success:
  - reload workspace/business data
  - open `BusinessDNAView`
  - target the created brand id only after it exists in loaded state

Expected result
- The onboarding status flips through real actions
- Progress moves to 80% during live analysis, then finishes based on actual completion
- Users cannot finish onboarding without a real saved business
- The new business persists in the workspace after backing out
- Users land inside the populated Brand/Audience/Product flow instead of an empty shell
