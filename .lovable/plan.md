

# Fix: Wait for Sync Before Sending to AI

## Problem
When a user connects their account and immediately asks a question, the `sync-research` function may still be running (15-30 seconds). The `research-chat` edge function finds no data and returns an unhelpful response or times out.

## Solution
Make `handleResearchSend` wait for `syncInProgressRef` to resolve before sending the request. The user sees a "Syncing your data..." indicator while waiting.

## Changes (1 file)

### `src/components/aiceo/ConnectorGrid.tsx`

1. **Convert `syncInProgressRef` to a Promise-based pattern**: Store a `syncPromise` ref so that `handleResearchSend` can `await` it if a sync is in progress.

2. **Update `triggerImmediateSync`**: Set a Promise on `syncPromiseRef` when sync starts, resolve it when sync finishes.

3. **Update `handleResearchSend`**: 
   - After appending the user message and showing "Thinking...", check if `syncInProgressRef.current` is true.
   - If so, update the assistant placeholder to show "Syncing your data, please wait..." instead of "Thinking...".
   - `await syncPromiseRef.current` to wait for sync to finish.
   - Then update the placeholder back to "Thinking..." and proceed with the normal fetch to `research-chat`.

4. **Update loading indicator text**: When the assistant message is empty and streaming, show "Syncing your business data..." if sync is in progress, otherwise show "Thinking...".

## How It Works

```text
User connects account
        |
  sync-research starts (15-30s)
        |
  User sends question immediately
        |
  UI shows "Syncing your data, please wait..."
        |
  sync-research finishes
        |
  UI switches to "Thinking..."
        |
  research-chat called with full data
        |
  AI responds with real answer
```

No changes needed to any edge functions. This is purely a client-side coordination fix.
