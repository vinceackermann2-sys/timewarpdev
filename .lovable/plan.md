

## Problem

The invite email's "Accept Invitation" button links directly to `/invite?token=...` (the workspace invite URL), **bypassing Supabase's auth verification endpoint**. This means:

1. The user clicks the button and lands on `/invite?token=...` without an authenticated session
2. `InviteAccept` calls `supabase.auth.getSession()` — no session exists
3. It shows "Please sign in" instead of accepting, OR if the user happens to already be signed in, the RPC call may work but the flow is broken for new/logged-out users

The root cause is in `auth-email-hook/index.ts` line 265:
```
confirmationUrl: isWorkspaceInvite ? workspaceInviteUrl! : payload.data.url
```

This replaces the Supabase auth verification URL (`payload.data.url`) with the raw workspace invite URL. The auth verification URL is what establishes the session — it goes through `/auth/v1/verify?...&redirect_to=/invite?token=...`, verifies the token, creates a session, then redirects to the invite page.

## Fix

**File: `supabase/functions/auth-email-hook/index.ts`**

Change `confirmationUrl` to always use `payload.data.url` (the Supabase auth verification URL). This ensures:
- User clicks "Accept Invitation" → Supabase verifies the magic link/invite token → session is established → user is redirected to `/invite?token=...` → `InviteAccept` finds a valid session → RPC `accept_workspace_invitation` succeeds → user is added to workspace

Single line change:
```typescript
confirmationUrl: payload.data.url,  // Always use the auth verification URL
```

The `redirect_to` parameter inside that URL already points to `/invite?token=...`, so after auth verification the user lands on the correct page with an active session.

**Redeploy**: `auth-email-hook` edge function.

