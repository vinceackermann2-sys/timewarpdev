

## Fix: Route all actions to the group tab, don't focus the group

### Problem
1. **Navigate actions open in the user's tab** — `executeAction` sends `targetGroupTab: true`, but `getPageContext` does NOT. The extension likely defaults to the active tab for both context retrieval and action execution. We need `targetGroupTab: true` on `getPageContext` as well, so the extension reads from and acts on the correct tab.
2. **User gets taken to the group** — Despite `focusGroup: false`, the extension may still be switching focus. We should also add `focusGroup: false` to every `executeAction` call so the extension never switches focus during the run.

### Changes

**`src/hooks/useExtensionBridge.ts`**
- `getPageContext`: Change the postMessage to send an object `{ type: "TIMEWARP_GET_PAGE_CONTEXT", targetGroupTab: true }` instead of a plain string, so the extension reads page context from the group tab, not the user's active tab.
- `executeAction`: Add `focusGroup: false` to the postMessage payload to reinforce that actions should execute silently in the background group tab.

