

## Plan: Fix onboarding progress, flipping text, and 403 persistence failure

### Root causes identified

1. **Progress bar not congruent**: Time-based animation caps at 78% in 8 seconds, then crawls 1% at a time. Feels stuck and disconnected from actual work.

2. **Logging doesn't flip**: Currently stacks completed milestones as a history list. User wants a single line that flips/crossfades through tasks — not a growing list.

3. **Brand insert fails with 403**: Console shows `Failed to load resource: 403` on `user_business_data` and `Brand insert failed`. The RLS INSERT policy requires `auth.uid()` to match `user_id`. After `immediate_login_after_signup`, the Supabase client may still hold a stale/empty session. The code calls `getSession()` but the token may not yet be refreshed. Fix: call `getSession()` right before insert and use the returned session's user ID, plus add a small retry if the first attempt 403s.

4. **409 on workspaces**: Likely the workspace rename hitting a conflict. Non-critical but should be handled gracefully.

### Changes

#### File: `src/components/database/BusinessDNAOnboarding.tsx`

**1. Fix flipping text — single line only, no history stack**
- Remove `completedMilestones` state and `recentCompleted` rendering
- Keep only `currentMilestone` index cycling through `ANALYSIS_MILESTONES`
- Render a single `AnimatePresence mode="wait"` block that crossfades between milestone strings
- No check marks, no history list — just one flipping line

**2. Fix progress bar — smooth continuous animation**
- Replace the choppy interval-based approach with a smooth animation:
  - Phase A (scrape running): ease from 0% to 80% over ~15 seconds using a deceleration curve
  - Phase B (scrape done, persistence running): slowly crawl from 80% to 95%
  - Phase C (persistence complete): snap to 100%
- Use `requestAnimationFrame` or a tighter interval with smoother math instead of jumping by integer increments

**3. Fix 403 on insert — refresh session before persisting**
- In step 2's async block, before inserting, call `await supabase.auth.getSession()` to get a fresh token
- If the first brand insert returns a 403/401 error, wait 1 second and retry once with a fresh `getSession()` call
- This handles the race condition where `immediate_login_after_signup` hasn't fully propagated the JWT
- Log the retry so it's visible in console for debugging

**4. Handle workspace 409 gracefully**
- Wrap the workspace rename in a try/catch, don't block completion on it

### Files to edit
- `src/components/database/BusinessDNAOnboarding.tsx`

