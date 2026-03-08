

## Fix: Complete SOP execution, tab group targeting, no focus switch

### Problems
1. **Stops at step 1** — The AI sees no page context (empty `{}` from the webapp tab) and likely returns `done` immediately. The initial user message doesn't emphasize that the AI must work through ALL procedure steps regardless. Also, the system prompt needs stronger language against premature `done`.
2. **Actions execute in current tab** — `executeAction` sends `executeInTab: true` but doesn't tell the extension to target the group tab specifically. Need to add `targetGroupTab: true` to the message.
3. **Group creation focuses user** — `signalStart` doesn't send `focusGroup: false`, so the extension defaults to focusing the new group.

### Changes

**`src/hooks/useExtensionBridge.ts`**
- `signalStart`: Add `focusGroup: false` to the postMessage payload so the extension creates the group in the background.
- `executeAction`: Add `targetGroupTab: true` to the postMessage payload so the extension routes actions to the tab inside the group, not the current tab.

**`src/components/database/EmployeeDetailView.tsx`**
- Change the initial conversation message to strongly instruct the AI to begin with step 1 and work through every SOP step sequentially, never stopping early.
- After `signalStart`, add a small delay (1s) before entering the loop, giving the extension time to set up the group.

**`supabase/functions/run-employee/index.ts`**
- Strengthen the system prompt: Add explicit instruction "Do NOT return done until you have completed every numbered procedure step. You have {N} procedure steps to complete. Track your progress." Include a step count.
- Add: "If there is no page context yet, start by navigating to the appropriate URL for step 1. Do NOT return done just because there is no page context."

