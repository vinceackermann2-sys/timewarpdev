
Goal: stop `/app` from getting stuck when auth refresh fails, and remove the auth boot path that is amplifying the 522/CORS-looking errors.

What’s actually happening
- This is not a normal frontend CORS bug.
- The auth refresh request is timing out (`522`) at the backend auth endpoint, and because that failed response has no CORS headers, the browser reports it as a CORS error.
- The app then makes the problem worse because raw `supabase.auth.getSession()` is still called in many places during boot, so one bad/stale session can trigger repeated refresh attempts.

Current weak points I found
- `getSafeSession()` exists, but only a few pages use it (`Auth`, `AiCeo`, `Database`).
- Startup-critical code still calls raw session APIs in places like:
  - `src/hooks/useWorkspace.ts`
  - `src/hooks/useSubscription.ts`
  - `src/pages/Index.tsx`
  - `src/components/database/EmployeesView.tsx`
  - several other auth-dependent components/hooks
- Google sign-in on `Auth.tsx` still uses the older `supabase.auth.signInWithOAuth(...)` path even though the project already has the managed auth helper in `src/integrations/lovable/index.ts`.

Implementation plan
1. Centralize auth recovery
- Expand `src/lib/authSession.ts` into the single safe entry point for restoring the session.
- Add timeout + transport-failure handling so 522/network failures immediately clear the local session and return a safe “signed out” state.
- Prevent duplicate simultaneous recovery attempts with a shared in-flight promise/cache.

2. Add a shared auth state layer
- Introduce a lightweight auth hook/provider so the app resolves session state once at startup instead of each feature re-triggering refresh logic.
- Wire it near the app root and expose: `session`, `user`, `isLoading`, `isRecovering`, `authError`.

3. Replace raw boot-time session calls
- Refactor the startup-sensitive areas to use the shared safe auth state instead of `supabase.auth.getSession()` directly:
  - `src/pages/Database.tsx`
  - `src/pages/Index.tsx`
  - `src/hooks/useWorkspace.ts`
  - `src/hooks/useSubscription.ts`
  - `src/components/database/EmployeesView.tsx`
- Gate React Query calls and data loaders so they do nothing until auth has been safely resolved.

4. Make `/app` fail gracefully instead of stalling
- If session recovery fails, immediately redirect to `/auth?redirect=/app`.
- Show a short user-facing message like “Your session expired or the connection timed out. Please sign in again.”
- Remove any infinite-spinner state caused by waiting on auth-dependent queries.

5. Align Google auth with the current managed flow
- Update the standard Google sign-in in `src/pages/Auth.tsx` to use the existing managed auth helper (`lovable.auth.signInWithOAuth`) for normal login/signup.
- Keep the separate custom Google integration flow only where extra scopes are actually needed.
- Preserve origin-aware redirects so preview/live/custom-domain returns stay correct.

6. Reduce auth pressure on initial load
- Ensure hidden dialogs/secondary hooks don’t eagerly perform auth checks on first render unless they are actually opened/used.
- This lowers the chance that one expired token causes a burst of refresh attempts during `/app` boot.

Technical details
- No database schema changes are needed.
- No RLS changes are needed.
- Main files likely touched:
  - `src/lib/authSession.ts`
  - new auth state hook/provider
  - `src/App.tsx`
  - `src/pages/Auth.tsx`
  - `src/pages/Database.tsx`
  - `src/pages/Index.tsx`
  - `src/hooks/useWorkspace.ts`
  - `src/hooks/useSubscription.ts`
  - selected auth-dependent components that currently call `getSession()` during mount

Expected outcome
- Expired/broken sessions won’t brick `/app`.
- The app will recover by clearing the stale local auth state and redirecting cleanly.
- Initial load will trigger far fewer auth refresh attempts.
- Google sign-in will be more reliable across preview/live/custom-domain environments.
