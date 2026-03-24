
Goal: fix onboarding so it shows real activity logs, keeps progress honest, and always creates/persists the business before sending the user into Business DNA.

What I found
- The onboarding UI still uses fake rotating copy (`STEP_1_TEXTS`, `STEP_2_TEXTS`, example snippets), including “Compiling business intelligence...”.
- The progress bar reaches 100% too early because it sets `100` as soon as step 1 scrape finishes, even though step 2 creation/persistence is still running.
- The business creation flow still depends on `BusinessDNAContext` background sync (`setBrands/setProducts/setAudiences` + `useEffect` saves). That is race-prone during onboarding because the screen unmounts right after completion.
- This matches the backend state: the newest auto-created workspace exists, but it has no `business-dna` rows, which explains:
  - empty Brand/Audience/Product view
  - backing out to an empty workspace
  - not landing inside a real created business

Implementation plan

1. Replace fake onboarding text with real event logs
- File: `src/components/database/BusinessDNAOnboarding.tsx`
- Remove the rotating placeholder text/examples as the primary status system.
- Add an append-only log state, e.g. `logMessages` + `currentTask`.
- Only push logs for actual events that happened, such as:
  - workspace resolved
  - homepage scrape started
  - product page scrape started
  - extraction completed
  - brand assembled
  - product assembled
  - audience assembled
  - workspace renamed
  - records saved successfully
- Show these logs in the left card instead of the synthetic “Compiling...” / marketing-style messages.

2. Make “Scanning Sources” use real sources only
- File: `src/components/database/BusinessDNAOnboarding.tsx`
- Remove the hardcoded guessed source list (`/about`, `/pricing`, `/blog`, etc.).
- Build the source list from the actual URLs this flow really touches:
  - base site URL
  - submitted product/page URL when different
- If needed, extend the scrape response later to include exact analyzed URLs, but the immediate fix is to stop showing guessed pages.

3. Fix progress so 100% only happens when onboarding is truly done
- File: `src/components/database/BusinessDNAOnboarding.tsx`
- Rework progress into milestone-based phases:
  - scrape/research phase: 0 → ~70
  - extraction/build phase: ~70 → ~92
  - persistence/rename/finalization: ~92 → 100
- Do not let step 1 completion force 100%.
- Only set `100` after:
  - workspace resolved
  - extracted data prepared
  - brand/product/audience writes finish
  - workspace rename finishes
  - onboarding advances to step 3

4. Persist the business directly during onboarding instead of relying on background sync
- Files: `src/components/database/BusinessDNAOnboarding.tsx`, optionally `src/components/database/BusinessDNAContext.tsx`
- Main fix: when step 2 runs, explicitly write the brand/product/audience rows to `user_business_data` and `await` those inserts.
- Resolve `workspace_id` first, and fail early if it is missing.
- Keep the in-memory context updates for immediate UI hydration, but do not depend on them for persistence.
- Best structure:
  - either add reusable awaited create helpers in `BusinessDNAContext`
  - or insert directly inside onboarding with the same payload shape `BusinessDNAContext` uses
- This removes the unmount race that is causing the business to vanish.

5. Keep the post-onboarding landing stable
- File: `src/pages/Database.tsx`
- Preserve the current “go straight into Business DNA” behavior.
- Add a safeguard so the app only opens `BusinessDNAView` once the created brand exists in loaded state; otherwise hold briefly on the onboarding completion state or reload the provider data first.
- Invalidate the workspace/business queries after successful onboarding persistence so the new workspace name and created business appear immediately.
- Keep using the created brand’s internal `brandId` so the user lands inside Brand/Audience/Product, not the add-business screen.

Expected result
- No more “Compiling business intelligence...”
- The onboarding screen shows actual completed actions, not placeholder copy
- The progress bar no longer hits 100% before the process is finished
- Brand/product/audience records are guaranteed to exist before onboarding exits
- Users land inside the created Brand/Audience/Product view
- When they back out, the business is still present in the workspace
