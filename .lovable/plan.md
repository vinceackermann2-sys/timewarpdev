

## Problem Analysis

The app gets stuck on loading spinners because both `AiCeo.tsx` (route `/`) and `Database.tsx` (route `/app`) call `supabase.auth.getSession()` and show a `<Loader2>` spinner until it resolves. If the backend is slow or the token refresh hangs, the app stays on the spinner forever with no fallback.

The backend is currently experiencing connection timeouts (confirmed by the metadata fetch failures), which means `getSession()` calls that need to refresh an expired token will hang indefinitely.

## Plan

### 1. Add timeout to auth check in `AiCeo.tsx`
- Wrap the `getSession()` call with a `Promise.race` against a 5-second timeout
- If it times out, set `isLoading = false` and show the landing page (HeroSection) instead of the spinner
- This ensures unauthenticated users can still see the landing page even if the backend is slow

### 2. Add timeout to auth check in `Database.tsx`
- Same timeout pattern for the `getSession()` call
- If it times out, redirect to `/` (landing) rather than showing a spinner forever
- This prevents authenticated users from being stuck on a blank loading screen

### 3. Add timeout to `BusinessDNAContext.tsx` data loading
- The `loadEntities` function queries `user_business_data` which can also hang
- Add a timeout so that if data loading takes too long, it stops loading and shows empty state rather than infinite spinner

These changes ensure the app remains usable even when the backend is temporarily slow or unreachable.

