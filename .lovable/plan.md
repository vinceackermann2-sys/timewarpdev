

# Fix: Make Research Chat Always Respond

## Problem
After connecting Google and sending a message, the user never gets a response. The `research-chat` backend function is never called — the request dies silently on the client side, likely due to the sync-wait mechanism or authentication check failing before the fetch.

## Root Cause
The `handleResearchSend` function in `ConnectorGrid.tsx` has multiple failure points before the actual API call:
1. The sync-wait Promise can get into a bad state (resolved ref set to null while still being awaited)
2. Both `refreshSession()` and `getSession()` can fail silently after OAuth redirect
3. Errors are caught and shown as toasts, but the "Thinking..." spinner stays forever if the error handling doesn't update the message properly

## Solution: Simplify and Make Bulletproof

Strip the sync-wait complexity out of `handleResearchSend` entirely. The AI can respond even without synced data (it just says "connect your accounts"). The `sync-research` function runs every minute via pg_cron anyway, so data will be available shortly.

### Changes to `src/components/aiceo/ConnectorGrid.tsx`

1. **Remove sync-wait from handleResearchSend** -- Delete the entire sync-wait block (lines 412-433). The function should go straight to auth + fetch. This eliminates the most fragile part of the code.

2. **Make auth completely fault-tolerant** -- Wrap auth in a single try/catch that tries `getSession()` first (simpler, more reliable than `refreshSession()`). If no token, still proceed with the fetch using just the apikey header — the edge function will respond with "connect your accounts" instead of hanging.

3. **Add a hard 60-second failsafe** -- If the entire function hasn't completed in 60 seconds, force-set an error message on the assistant bubble and stop streaming. This guarantees the user always sees something.

4. **Keep triggerImmediateSync running in background** -- The sync still runs after OAuth return, it just doesn't block the chat anymore. If the user asks before data is ready, the AI says "your data is still syncing, try again in a moment."

### Simplified handleResearchSend flow:

```text
User sends message
      |
  Add user msg + empty assistant msg to chat
      |
  Try getSession() for auth token
      |
  fetch research-chat (with or without token)
      |
  Stream response to assistant bubble
      |
  If any error: show error in assistant bubble
      |
  60s hard timeout: force error message
```

### No edge function changes needed
The `research-chat` function already handles unauthenticated requests gracefully (responds with "connect your accounts").

## Technical Details

The key change is replacing ~40 lines of sync-wait + complex auth with ~10 lines:

```typescript
// Simple auth - no refreshSession, no sync-wait
let accessToken = "";
try {
  const { data } = await supabase.auth.getSession();
  accessToken = data.session?.access_token || "";
} catch (e) {
  console.warn("[ResearchChat] Auth error:", e);
}

// Always fetch - let the edge function handle missing auth
const resp = await fetch(RESEARCH_CHAT_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
  body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) }),
  signal: controller.signal,
});
```

Plus a 60-second hard failsafe wrapping the entire function to guarantee the user always sees a response or error message.

