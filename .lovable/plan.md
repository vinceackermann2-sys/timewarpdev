

## Fix: New tab group in background + full SOP completion

### Root causes
1. **Group opens in current tab** — The extension message has `openTab: false`, but the extension is likely reusing the current tab or not creating a new tab at all. Need to change to `openTab: true` (create a new tab inside the group) combined with `focusGroup: false` (don't switch focus to it). The webapp should NOT be the tab in the group — a fresh blank tab should be created.
2. **SOP stops early** — The AI may still return `done` prematurely. The loop also breaks when `parseAction` returns null (line 231-234), which happens if the AI responds with plain text instead of JSON. Need to handle that as a retry instead of a break.

### Changes

**`src/hooks/useExtensionBridge.ts`**
- Change `signalStart` to send `openTab: true` (so extension creates a fresh `about:blank` tab inside the new group) while keeping `focusGroup: false` (don't switch user to it).

**`src/components/database/EmployeeDetailView.tsx`**
- When `parseAction` returns null, instead of breaking, push a retry message to conversation history telling the AI to respond with valid JSON and continue the loop.
- After action result, include fresh page context in the follow-up message so the AI always has current state.
- Increase `MAX_STEPS` to 80 for complex SOPs.

**`supabase/functions/run-employee/index.ts`**
- Add even stronger instruction: "You MUST respond with a JSON code block every time. Never respond with plain text. If you are unsure what to do, use navigate or respond — but always in JSON format."

