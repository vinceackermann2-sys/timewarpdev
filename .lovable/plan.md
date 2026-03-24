

## Plan: Fix onboarding texts, sources, and data persistence

### Problems identified
1. **Rotating texts** contain "Analyzing competitor landscape..." and "unique selling points found" — user wants real activity logging instead
2. **Sources list** shows fake third-party sources (google, linkedin, crunchbase, reddit, twitter) — should only show actual pages being analyzed
3. **Business data disappears** — root cause: during onboarding, `DatabaseSidebar` (which runs `useWorkspace` and sets `preferred_workspace_id` in localStorage) is NOT rendered. So entities are saved without a `workspace_id`. When onboarding completes and the main view loads, it filters by `workspace_id` and finds nothing.

### Changes

#### File: `src/components/database/BusinessDNAOnboarding.tsx`

**1. Fix data persistence — fetch workspace ID at onboarding start**
- In the scrape `useEffect` (step 1, ~line 140), before invoking `scrape-product`, call `supabase.rpc("get_user_workspaces", { _user_id })` to get the user's workspace
- Store the workspace ID in a ref and also set it in `localStorage.setItem("preferred_workspace_id", wsId)` so the `BusinessDNAContext` picks it up via its 500ms polling
- This ensures that when entities are created in step 2, the context's `saveEntity` function has a valid `workspace_id`

**2. Replace rotating texts with activity log style**
- Replace `STEP_1_TEXTS` with real activity descriptions: "Crawling website pages...", "Extracting brand identity...", "Mapping product catalog...", "Profiling target audience...", "Compiling business intelligence..."
- Replace `STEP_2_TEXTS` with: "Building brand profile...", "Structuring product data...", "Creating audience persona...", "Generating positioning strategy...", "Finalizing business DNA..."
- Remove "Analyzing competitor landscape" and "unique selling points found"

**3. Sources — only show domain pages**
- In `getDomainSources()`, remove the third-party sources array (`google.com/search`, `linkedin.com/company`, etc.)
- Only return the actual domain sub-pages being scraped: `/`, `/about`, `/products`, `/pricing`, `/blog`, `/contact`, `/features`

### Technical details
- The workspace is auto-created by a DB trigger (`create_default_workspace`) on `auth.users` insert, so by the time the user reaches onboarding, the workspace exists
- We fetch it via `get_user_workspaces` RPC and store in localStorage before any entity creation happens
- The `BusinessDNAContext`'s 500ms localStorage polling will pick up the workspace ID and use it for all subsequent `saveEntity` calls
- Single file changed: `BusinessDNAOnboarding.tsx`

