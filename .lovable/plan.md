

## Problem

The app hangs because several components make backend calls (auth, queries, RPCs) **without timeouts**. When the backend is slow or timing out (as confirmed by the connection timeout errors), these calls never resolve and the UI stays on loading spinners forever.

The timeouts we added to `AiCeo.tsx`, `Database.tsx`, and `BusinessDNAContext.tsx` were good, but there are still **three unprotected locations**:

### Unprotected calls causing infinite loading:

1. **`DatabaseView.tsx` (lines 127-138)** — `isCheckingConnection` blocks the entire Database view. It calls `getSession()` then queries `user_connections` with no timeout. This is likely the main culprit since Database view is the default view.

2. **`ConnectBusinessDNA.tsx` (line 40-55)** — `isLoading` blocks the connect screen. Calls `getSession()` then an edge function with no timeout.

3. **`useWorkspace.ts` (lines 45-50)** — `isLoading` blocks workspace operations. Calls `getSession()` then `supabase.rpc("get_user_workspaces")` with no timeout. While this doesn't directly block page render, it can cause workspace-dependent features to hang.

## Plan

### 1. Add timeout to `DatabaseView.tsx` connection check
- Wrap the `getSession()` call and `user_connections` query in `Promise.race` with 5-second timeouts
- On timeout, set `isCheckingConnection = false` and proceed (assume not connected)

### 2. Add timeout to `ConnectBusinessDNA.tsx` 
- Wrap `getSession()` and the edge function fetch with timeouts
- On timeout, set `isLoading = false` so the UI renders

### 3. Add timeout to `useWorkspace.ts` loadWorkspaces
- Wrap `getSession()` and `supabase.rpc("get_user_workspaces")` with timeouts
- On timeout, set `isLoading = false` and return empty workspace list

All timeouts will use the same `Promise.race` pattern already established in the codebase (5-8 second timeouts).

