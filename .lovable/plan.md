
# Fix Research Chat - Complete Diagnosis and Fix

## Root Causes Found

1. **Auth failure in edge function**: The `getUser()` call silently returns null. The current approach creates a redundant Supabase client with the anon key + auth header, then calls `getUser(token)`. This is unreliable. The fix is to use the **service role client** to call `getUser(token)` directly -- this bypasses any client-level auth issues.

2. **Client stream parser may silently fail**: If the `fetch` response arrives but the SSE parsing encounters unexpected chunks (e.g., `OPENROUTER PROCESSING` comment lines that come as separate chunks without trailing newlines), the buffer can stall. Need to add safety handling and better logging.

3. **No fallback for empty responses**: If the stream completes with no assistant content, the fallback message appears but the user thinks it's still loading because the "Analyzing" spinner shows instead.

## Plan

### Step 1: Fix Edge Function Auth (research-chat)

Rewrite the auth section to use the **service role key** for token verification -- this is the standard reliable pattern:

```text
// BEFORE (broken):
const supabaseAuth = createClient(url, anonKey, {
  global: { headers: { Authorization: authHeader } },
});
const { data } = await supabaseAuth.auth.getUser(token);

// AFTER (reliable):
const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
const { data, error } = await supabaseAdmin.auth.getUser(token);
```

Also add comprehensive logging at every step:
- Log whether Authorization header exists
- Log the getUser result AND error
- Log whether workspace data was found and its size
- Log the AI gateway response status

### Step 2: Add Storage Bucket Fallback

If the `workspace_research` table query returns no data, also try reading from the `business-data/{user_id}/research.json` storage bucket as a fallback source.

### Step 3: Fix Client-Side Stream Handling

In `ConnectorGrid.tsx`:
- Add a final buffer flush after the stream reader finishes (handle data without trailing newline)
- Add `console.log` for every parsed chunk so we can debug
- Ensure `setIsStreaming(false)` is always called, even in edge cases
- Add a timeout that auto-stops the spinner after 90 seconds as ultimate safety net

### Step 4: Deploy and Verify

Deploy the updated edge function and test it end-to-end to verify:
- Auth succeeds (userId is populated)
- Workspace data is fetched
- AI responds with actual business insights
- Client displays the response

## Technical Details

### Files to modify:
- `supabase/functions/research-chat/index.ts` -- fix auth, add storage fallback, add logging
- `src/components/aiceo/ConnectorGrid.tsx` -- fix stream parser, add buffer flush, add safety timeout
