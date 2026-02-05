

# Fix Google Workspace Token Storage

## Problem Root Cause
The `google_workspace_tokens` table has RLS policies that deny ALL client-side operations. The Auth.tsx code attempts to store tokens using the regular Supabase client, but RLS silently blocks the insert. Result: user shows as "connected" but no tokens exist for the sync-research job to use.

## Solution Overview
Create a server-side Google OAuth callback handler that captures and stores tokens with service role privileges, bypassing RLS restrictions.

## Implementation

### 1. Create New Edge Function: `google-oauth-callback`

This edge function will:
- Receive the OAuth code from Google's redirect
- Exchange the code for access/refresh tokens using the Google OAuth API
- Store tokens in `google_workspace_tokens` using service role (bypasses RLS)
- Mark connection as active in `google_workspace_connections`
- Redirect user back to the app with success/error status

```text
Location: supabase/functions/google-oauth-callback/index.ts

Flow:
1. Receive redirect from Google with ?code=xxx
2. Exchange code for tokens via https://oauth2.googleapis.com/token
3. Get user info from token to verify identity
4. Store tokens in database with service role
5. Redirect to app: /database?google_connected=true
```

### 2. Update Auth.tsx

- Remove the direct database insert for tokens (it fails silently anyway)
- Update Google OAuth redirect URL to point to the edge function instead of directly to the app
- Handle the success/error query params from the edge function redirect

### 3. Add Required Secrets

Need to add (if not already present):
- `GOOGLE_CLIENT_ID` - For token exchange
- `GOOGLE_CLIENT_SECRET` - For token exchange

### 4. Update supabase/config.toml

Add the new function with `verify_jwt = false` (since it handles OAuth redirects, not authenticated API calls)

## Technical Details

### Edge Function Flow
```text
User clicks "Connect Google"
         |
         v
Google OAuth consent screen
         |
         v
Redirect to: /functions/v1/google-oauth-callback?code=xxx
         |
         v
Edge function exchanges code for tokens
         |
         v
Store in google_workspace_tokens (service role bypasses RLS)
         |
         v
Redirect to app: /database?google_connected=true
```

### Token Exchange Request
```javascript
const response = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    code: authorizationCode,
    grant_type: "authorization_code",
    redirect_uri: callbackUrl,
  }),
});
```

### User Identification
After getting tokens, call Google's userinfo endpoint to get the user's email, then match to Supabase auth user:
```javascript
const userInfo = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
  headers: { Authorization: `Bearer ${access_token}` }
});
// Match email to find user_id in Supabase auth
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/google-oauth-callback/index.ts` | Create |
| `supabase/config.toml` | Add function config |
| `src/pages/Auth.tsx` | Update OAuth redirect flow |

## Expected Outcome
- Token storage works reliably via server-side handling
- `sync-research` cron job finds tokens and syncs data
- Slack bot can access user's business data within 1-2 minutes of connecting

