

## Plan: Three Changes

### 1. Move Workspace Chooser to Main Sidebar

Move the workspace switcher from `MyBusinessesView` into `DatabaseSidebar`, placed above the `ActionsCard` in the footer area. This makes workspace selection persistent across all views.

| File | Change |
|------|--------|
| `src/components/database/DatabaseSidebar.tsx` | Add workspace chooser component above ActionsCard in SidebarFooter. Import `useWorkspace`, add popover with workspace list, search, create new workspace, and manage button. |
| `src/components/database/MyBusinessesView.tsx` | Remove the workspace popover/switcher from the header. Keep using `useWorkspace` for `activeWorkspaceId` to load businesses, but remove all the workspace-switching UI (the Popover, search, create workspace inputs). |

### 2. Fix RestrictedFeatureGate Not Showing for Free Users

**Root cause:** `RestrictedFeatureGate` computes `isFreeUser = !hasActivePlan && !plan`. While `isLoading` is true, `hasActivePlan` defaults to `false` and `plan` defaults to `null` (from `subscription?.plan ?? null` where subscription is `undefined`). So `isFreeUser = !false && !null = true` even during loading. The `useEffect` fires `setShowGate(true)`, but then when loading resolves for a paid user, `isFreeUser` becomes `false`, and the gate hides. For free users it stays true.

The actual problem is likely that `isLoading` never resolves to `false` if the `check-subscription` function throws (e.g., no auth header on first render before session loads). Looking at `useSubscription`: the queryFn checks `if (!session) return null`. If session is null, it returns null immediately, `isLoading` becomes false, and `subscription` is null. Then `hasActivePlan = null?.subscribed ?? false = false`, `plan = null?.plan ?? null = null`. So `isFreeUser = true`. This should work.

Wait - I see the issue. The `useEffect` sets `showGate(true)` when `isFreeUser` is true. But if initially `isFreeUser` is true (during loading since defaults make it truthy), the gate opens, then when subscription loads and user is paid, `isFreeUser` becomes false. The component re-renders but `showGate` is still `true` from the effect. And the gate check `if (!isFreeUser) return <>{children}</>` at line 36 correctly shows children. So this should work.

Let me reconsider: maybe the issue is that `isLoading` stays true for a long time, and the loading spinner shows indefinitely if `check-subscription` is slow. Or maybe the issue is that on the initial render, `isLoading` is `true`, so the loading spinner shows. Then when it resolves, `isFreeUser` is computed. If the user navigates to the page while loading is still happening, they see the spinner, not the gate.

Actually, the simplest bug: for users who have no session (unlikely on /app but possible during auth state transitions), `queryFn` returns `null`. Then `subscription` is `null`, `hasActivePlan = false`, `plan = null`, `isFreeUser = true`. This should show the gate correctly.

The real fix needed: the `isFreeUser` check during loading. While `isLoading`, `subscription` is `undefined`, so `hasActivePlan = undefined?.subscribed ?? false = false` and `plan = undefined?.plan ?? null = null`. So `isFreeUser = !false && !null = true`. The useEffect fires and sets showGate to true. But the component returns the loading spinner at line 25-33, never reaching the gate render. When loading finishes, if user is paid, `isFreeUser` is false, so line 36 returns children. The `showGate` is still true but the UpgradeGateDialog never renders because line 36 returns early.

This all looks correct. Let me check if maybe the component is re-creating each time the view changes (since Database.tsx conditionally renders based on `currentView`). Each time the user clicks Employees, a NEW RestrictedFeatureGate mounts, useSubscription query runs (cached for 30 min), isLoading should be false from cache...

Ah, I think the issue is that `useSubscription` uses React Query with `staleTime: 30 * 60 * 1000`. On subsequent renders, if the query was previously fetched, `isLoading` is `false` and data is available. But on the VERY FIRST mount after page load, `isLoading` is true. The `check-subscription` function calls Stripe which can be slow. During this time the loading spinner shows. When it resolves, everything works.

But the user says "free plan users don't see the timewarp og popup." This means for free users, even after loading, they're not seeing the gate. Let me think...

The most likely bug: `check-subscription` returns `{ subscribed: false, plan: null }` for free users. Then `useSubscription` returns `hasActivePlan: false`, `plan: null`. In `RestrictedFeatureGate`, `isFreeUser = !false && !null = true`. The useEffect runs and sets `showGate = true`. The component renders the lock screen with the dialog. This SHOULD work.

Unless the `check-subscription` edge function is throwing an error. If it throws, React Query might show `isLoading: false` but `data: undefined` and `error: someError`. Looking at useSubscription line 44: `const { data: subscription, isLoading, refetch } = useQuery(...)`. If the query errors, `subscription` is undefined, `isLoading` is false. Then `hasActivePlan = undefined?.subscribed ?? false = false`, `plan = undefined?.plan ?? null = null`. `isFreeUser = true`. Should still work.

I'm going to just strengthen the gate to be more defensive. The `isFreeUser` calculation during loading where `isLoading` is `true` can cause `!hasActivePlan && !plan` to be `true` even before we know. I'll change `RestrictedFeatureGate` to:
- While loading, show loading spinner (already does this)
- After loading, if `!hasActivePlan && !plan`, show the gate AND auto-open the dialog
- Crucially, also auto-open the dialog on mount for free users, not just via useEffect

| File | Change |
|------|--------|
| `src/components/database/RestrictedFeatureGate.tsx` | Ensure the gate auto-opens the UpgradeGateDialog and shows the lock screen. Add `!isLoading` guard to `isFreeUser` check. Default `showGate` to `true` when `isFreeUser` is detected. |

### 3. Create Desktop Agent Edge Function

Create a new edge function `desktop-agent` that:
- Accepts a request from the user's desktop app with an auth token
- Validates the user via JWT
- Consumes one action via `increment_actions_used` RPC
- Forwards the user's messages to Lovable AI gateway (using a capable model like gpt-5)
- Streams or returns the AI response
- Returns the edge function URL

| File | Change |
|------|--------|
| `supabase/functions/desktop-agent/index.ts` | New edge function: validate auth, consume action, proxy AI request, return response |
| `supabase/config.toml` | Add `[functions.desktop-agent]` with `verify_jwt = false` |

The function will accept `{ messages, system_prompt?, model? }` in the body, authenticate via Authorization header, call `increment_actions_used`, and forward to the Lovable AI gateway. The URL will be: `https://ohvxqlxugqlzzbmfypiy.supabase.co/functions/v1/desktop-agent`

### Summary

| # | Issue | Files |
|---|-------|-------|
| 1 | Move workspace chooser to sidebar | `DatabaseSidebar.tsx`, `MyBusinessesView.tsx` |
| 2 | Fix RestrictedFeatureGate | `RestrictedFeatureGate.tsx` |
| 3 | Desktop agent edge function | `desktop-agent/index.ts`, `config.toml` |

