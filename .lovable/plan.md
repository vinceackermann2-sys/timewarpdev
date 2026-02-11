
# Fix Research Chat - Stuck on "Thinking..."

## Problem
When a user connects their Google/Microsoft/Slack account and sends a question, the chat shows "Thinking..." forever and never displays a response based on their data.

## Root Causes

1. **Authorization header not reaching the edge function**: The client sends an extra `apikey` header that the working chat interface does NOT send. This may cause the gateway to use the anon key for auth context instead of forwarding the user's JWT token. The edge function logs confirm: "Auth header present: false".

2. **No content timeout**: If the AI stream starts but produces no parsed content (due to format issues or delays), the UI stays stuck on "Thinking..." for up to 90 seconds before the safety timeout fires.

3. **No client-side debugging**: Zero console.logs exist to show whether the user has a session, what token is being sent, or what data the stream returns.

## Solution

### 1. Fix the fetch headers (ConnectorGrid.tsx)
Remove the `apikey` header from the research-chat fetch call. This matches the pattern used by the working `ChatInterface` component. Only send `Content-Type` and `Authorization` headers.

### 2. Add content timeout (ConnectorGrid.tsx)  
Add a 20-second "content timeout" that checks if any AI content has been received. If not, show a fallback message like "Could not get a response. Please try again." instead of letting "Thinking..." spin indefinitely.

### 3. Add client-side logging (ConnectorGrid.tsx)
Add console.log statements to show:
- Whether a session/token exists before fetching
- The response status from the edge function
- Whether the stream is producing content
- Any errors during parsing

### 4. Improve edge function logging (research-chat/index.ts)
Log the Authorization header length (not value) to help debug auth issues. Log whether workspace data was found and its size before calling the AI.

## Technical Details

### Files to modify:
- `src/components/aiceo/ConnectorGrid.tsx` -- remove apikey header, add content timeout, add logging
- `supabase/functions/research-chat/index.ts` -- improve auth debugging logs

### Key change in ConnectorGrid.tsx (fetch headers):
```text
// BEFORE (broken - extra apikey header):
headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${accessToken}`,
  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
}

// AFTER (matches working ChatInterface pattern):
headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${accessToken}`,
}
```

### Key change: Content timeout
After the stream starts, if no AI content appears within 20 seconds, force-stop and show a retry message. This prevents the infinite "Thinking..." spinner.
