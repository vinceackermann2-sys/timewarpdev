

# Fix OAuth Connector Issues on Mobile

## Problem Summary

All three connector OAuth flows (Google, Microsoft, Slack) are broken because the user is **not authenticated** when clicking connect. The code falls back to `userId = "anonymous"`, which causes failures:

- **Google**: The edge function tries to upsert `"anonymous"` into a UUID column (`user_id`), causing a database error. The function returns `{ error: "Failed to initiate OAuth" }` silently.
- **Microsoft**: The initiation may partially succeed with `"anonymous"`, but the callback fails on state nonce verification because the stored record doesn't match.
- **Slack**: Similar redirect issues; error params aren't detected by the page.

Additionally, `AiCeo.tsx` only checks for success query params (`google_connected`, `microsoft_connected`, `slack_installed`) but not error params, so any OAuth failure dumps the user back to the start/hero page.

## Plan

### 1. Require authentication before initiating OAuth

**File: `src/hooks/useConnectorOAuth.ts`**

- Before attempting any OAuth flow, check if the user has a valid session.
- If no session exists, show a toast message directing the user to sign in first, and return early.
- Remove the `"anonymous"` fallback entirely -- all three connectors need a real `user_id`.

### 2. Handle OAuth error params in the page routing

**File: `src/pages/AiCeo.tsx`**

- Expand the `isOAuthReturn` check to also include error params: `google_error`, `microsoft_error`, `slack_error`.
- This ensures that even on OAuth failures, the user stays in the chat/connector view (where they can see an error toast) instead of being dumped to the hero page.

### 3. Show error toasts for OAuth error redirects

**File: `src/components/aiceo/AiCeoChatView.tsx`**

- On mount, check for error query params (`google_error`, `microsoft_error`, `slack_error`) and display appropriate toast notifications so the user knows what went wrong.

### Technical Details

**useConnectorOAuth.ts changes:**
```
- Remove: const userId = session?.user?.id ?? "anonymous";
- Add: if (!session?.user?.id) { toast.error("Please sign in first"); return; }
- Use: const userId = session.user.id;
```

**AiCeo.tsx changes:**
```
- Expand isOAuthReturn to include error params:
  searchParams.has("google_error") || 
  searchParams.has("microsoft_error") || 
  searchParams.has("slack_error")
```

**AiCeoChatView.tsx changes:**
```
- Add useEffect to check for error params and show toasts
- Include error params in the isOAuthReturn check
```

