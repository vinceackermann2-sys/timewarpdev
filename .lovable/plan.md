
# Fix Google OAuth Token Storage - Server-Side Callback

## Root Cause
The current implementation tries to capture `provider_token` on the client side after OAuth redirect. This fails due to a race condition:
- Supabase SDK processes OAuth callback immediately on page load
- By the time React components mount and set up listeners, the `provider_token` is already consumed
- Result: Edge function never gets called, tokens never stored

## Solution
Implement a true **server-side OAuth callback flow**:
1. Google redirects to our edge function (not the app)
2. Edge function exchanges authorization code for tokens
3. Edge function stores tokens and redirects user to app

## Implementation

### 1. Update Edge Function: `google-oauth-callback`

Transform from POST endpoint to GET handler that receives the OAuth redirect:

```text
Current: Receives tokens via POST from frontend (broken timing)
New: Receives authorization code via GET from Google, exchanges for tokens

Flow:
1. Google redirects: /functions/v1/google-oauth-callback?code=xxx&state=yyy
2. Edge function exchanges code for tokens via Google API
3. Stores tokens with service role (bypasses RLS)
4. Redirects user to /database?google_connected=true
```

Key changes:
- Handle GET requests with `code` and `state` parameters
- Exchange code using GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Parse state parameter to get user_id (set when OAuth started)
- Store tokens in database
- Redirect to app with success/error status

### 2. Update Auth.tsx OAuth Initiation

Change redirect URL to point to edge function instead of app:

```text
Current:
  redirectTo: window.location.origin + "/"

New:
  redirectTo: [SUPABASE_URL]/functions/v1/google-oauth-callback
```

Also pass user identifier in state parameter so the edge function knows which user to associate tokens with.

### 3. Remove Client-Side Token Storage Code

Remove `storeTokensViaEdgeFunction` from:
- `src/pages/Index.tsx` (lines 14-37, 77-84, 93-105)
- `src/pages/Auth.tsx` (lines 26-51, 80-84, 112-116)

This code is no longer needed since tokens are captured server-side.

## Technical Details

### OAuth Flow After Fix

```text
1. User clicks "Connect Google" in Auth.tsx
              |
              v
2. Supabase initiates OAuth with redirect to edge function
              |
              v
3. User consents on Google
              |
              v
4. Google redirects: /functions/v1/google-oauth-callback?code=xxx
              |
              v
5. Edge function exchanges code for access_token + refresh_token
              |
              v
6. Edge function stores tokens (service role bypasses RLS)
              |
              v
7. Edge function redirects to: /database?google_connected=true
              |
              v
8. sync-research cron finds tokens, syncs data
              |
              v
9. Slack bot can access business data
```

### Edge Function Token Exchange

```javascript
// Exchange code for tokens
const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    code: authorizationCode,
    grant_type: "authorization_code",
    redirect_uri: [edge function URL],
  }),
});

const { access_token, refresh_token, expires_in } = await tokenResponse.json();
```

### User Identification Strategy

Since the edge function receives the OAuth redirect (not the app), we need to identify which user initiated the flow:

Option A - Use state parameter:
- When initiating OAuth, encode user_id in state: `state=base64({user_id, nonce})`
- Edge function decodes state to get user_id
- Verify nonce against stored value to prevent CSRF

Option B - Use email matching:
- After getting tokens, call Google userinfo API to get email
- Match email to Supabase user
- This works but requires email match

Recommendation: Use state parameter (Option A) for reliability.

## Files to Modify

| File | Action |
|------|--------|
| `supabase/functions/google-oauth-callback/index.ts` | Rewrite to handle GET redirect |
| `src/pages/Auth.tsx` | Change redirect URL, add state parameter |
| `src/pages/Index.tsx` | Remove storeTokensViaEdgeFunction code |

## Expected Outcome
- Tokens reliably captured server-side before any client code runs
- No race conditions - server handles everything
- sync-research finds tokens within 1 minute
- Slack bot accesses business data successfully
