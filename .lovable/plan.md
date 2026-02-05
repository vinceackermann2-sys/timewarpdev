
# Fix Google Token Storage After OAuth Redirect

## Problem
OAuth redirects to `/` (Index.tsx) after Google consent, but Index.tsx:
1. Only stores `provider_token` in sessionStorage
2. Never captures or stores `provider_refresh_token`
3. Never calls the `google-oauth-callback` edge function

Result: Tokens never reach the database, so `sync-research` has no tokens to use.

## Solution
Add the token storage logic to Index.tsx so it calls the edge function when a fresh Google OAuth session is detected.

## Changes Required

### 1. Update `src/pages/Index.tsx`

Add helper function and token storage logic:

```text
// Add helper function (same as Auth.tsx)
const storeTokensViaEdgeFunction = async (session: any) => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  await fetch(`${SUPABASE_URL}/functions/v1/google-oauth-callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      access_token: session.provider_token,
      refresh_token: session.provider_refresh_token,
      expires_in: 3600,
    }),
  });
};
```

Call it in both places where provider_token is detected:
- In `onAuthStateChange` callback (line 42-52)
- In `getSession` check (line 55-79)

### 2. Key Logic Changes

```text
// In onAuthStateChange (line 46-50):
if (session?.provider_token) {
  sessionStorage.setItem('googleProviderToken', session.provider_token);
  setGoogleToken(session.provider_token);
  
  // NEW: Store tokens via edge function
  if (session.provider_refresh_token) {
    sessionStorage.setItem('googleProviderRefreshToken', session.provider_refresh_token);
  }
  await storeTokensViaEdgeFunction(session);
}

// Same in getSession check (line 59-63)
```

## Technical Details

### Flow After Fix
```text
User clicks "Connect Google" → Google OAuth → Redirect to /
                                                    ↓
                                         Index.tsx mounted
                                                    ↓
                                    onAuthStateChange fires with session
                                                    ↓
                                    session.provider_token detected
                                                    ↓
                                    storeTokensViaEdgeFunction called
                                                    ↓
                                    Edge function stores tokens (service role)
                                                    ↓
                                    sync-research finds tokens, syncs data
```

### Why This Fixes It
- Index.tsx is where users land after OAuth
- Adding the edge function call here ensures tokens are always stored
- Using service role bypasses RLS restrictions
- sync-research will find tokens within 1 minute

## Files to Modify
| File | Action |
|------|--------|
| `src/pages/Index.tsx` | Add `storeTokensViaEdgeFunction` and call it when provider_token detected |

## Expected Outcome
- Tokens stored in `google_workspace_tokens` table immediately after OAuth
- `sync-research` cron job finds tokens and syncs workspace data
- Slack bot can access business data within 1-2 minutes of connecting
