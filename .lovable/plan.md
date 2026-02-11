

# Fix: Research Chat - First Principles Rebuild

## Root Cause Found

The previous fix made `apikey` and `Authorization` headers **mutually exclusive**. This is wrong. The Supabase gateway requires:
- **`apikey`**: Always needed -- routes the request to the correct project
- **`Authorization: Bearer <jwt>`**: Identifies the user to the edge function

Without `apikey`, the gateway never forwards the request to the edge function. That's why there are zero server-side logs -- the request dies at the gateway level, the client waits 60 seconds, and shows "Request timed out."

## What the Direct Test Proved

I called the `research-chat` function directly and it responded instantly with a 200 status and streaming AI content. The backend is fully functional.

## Plan

### 1. Fix the header configuration (the actual bug)

In `src/components/aiceo/ConnectorGrid.tsx`, change the fetch headers from:

```
// BROKEN - mutually exclusive
...(accessToken ? { Authorization: Bearer } : { apikey: ... })
```

To:

```
// CORRECT - always send apikey, add Authorization when available
apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
```

### 2. Simplify timeout logic

The current code has 3 overlapping timeouts (20s content, 60s hard failsafe, 90s fetch + safety). Reduce to a single 30-second failsafe since the AI responds in under 5 seconds when the request actually reaches the server.

### 3. No backend changes needed

The `research-chat` edge function is confirmed working:
- Authenticates users via JWT
- Fetches workspace data from the database (with storage bucket fallback)
- Streams AI responses with business context
- Handles unauthenticated requests gracefully ("connect your accounts")

## Technical Details

Only one file changes: `src/components/aiceo/ConnectorGrid.tsx`

The fix is a single line change in the `handleResearchSend` function's fetch headers (around line 443-445). The timeout simplification removes ~20 lines of redundant safety code.

