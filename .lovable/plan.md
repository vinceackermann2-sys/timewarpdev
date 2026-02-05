

# Fix Google Workspace Token Storage ✅ COMPLETED

## Problem Root Cause
The `google_workspace_tokens` table has RLS policies that deny ALL client-side operations. The Auth.tsx code attempts to store tokens using the regular Supabase client, but RLS silently blocks the insert. Result: user shows as "connected" but no tokens exist for the sync-research job to use.

## Solution Implemented
Created a server-side endpoint (`google-oauth-callback` edge function) that:
1. Receives tokens from the frontend after Supabase OAuth completes
2. Stores them in `google_workspace_tokens` using **service role** (bypasses RLS)
3. Updates `google_workspace_connections` to mark as connected

## Flow
```
User clicks "Connect Google" → Supabase OAuth → Google consent → 
Supabase callback (session includes provider_token/refresh_token) →
Auth.tsx calls edge function with tokens → Edge function stores with service role →
Slack bot can now access workspace data via sync-research
```

## Files to Create/Modify
| File | Action |
|------|--------|
| `supabase/functions/google-oauth-callback/index.ts` | ✅ Created |
| `supabase/config.toml` | ✅ Updated |
| `src/pages/Auth.tsx` | ✅ Updated |

