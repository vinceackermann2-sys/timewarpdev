

## Plan: Auto-enable Computer Mode for Employees + Improve Execution Speed

### Problem
1. Clicking an employee with Computer Mode off runs `runEmployeeChat` (a single non-browser call) instead of activating Computer Mode and executing the SOP via browser automation.
2. The `runComputerMode` function breaks on "respond" actions (line 954-958) instead of continuing execution like `runAgentChatWithBrowser` does — this causes tasks to stop after the planning phase.
3. Edge functions have a ~60s wall-clock limit per invocation. Each step in the loop calls the edge function separately, so the real bottleneck is the number of round-trips, not a single 60s cap on the whole task.

### Changes

**1. Auto-enable Computer Mode when selecting an employee** (`AgentChatView.tsx`)
- In `autoRunEmployee`, force `isActionMode` to `true` before running (call `setIsActionMode(true)`)
- If the extension is not connected, show a toast prompting the user to install/connect the extension instead of silently falling back to non-browser chat
- This ensures every employee click triggers full browser automation

**2. Fix `runComputerMode` to not break on "respond" actions** (`AgentChatView.tsx`)
- Currently lines 954-958 break the loop on "respond" — same bug that was already fixed in `runAgentChatWithBrowser`
- Change to match the `runAgentChatWithBrowser` pattern: append "respond" as an intermediate update, push a continuation prompt to `conversationHistory`, increment `stepCount`, and `continue` the loop

**3. Optimize execution speed** (`AgentChatView.tsx` + `extension-agent/index.ts`)
- **Batch actions**: Update the edge function prompt to encourage returning multi-step arrays (e.g., `{ "steps": [...] }`) so a single API call can yield 3-5 actions that execute sequentially client-side without additional round-trips
- **Client-side batch execution**: In both `runComputerMode` and `runAgentChatWithBrowser`, after parsing the JSON response, check for a `steps` array. If present, execute all steps in sequence before making the next API call, reducing round-trips by 3-5x
- **Reduce wait times**: Lower the `getPageContext` timeout from 3s to 1.5s, and reduce the `executeAction` timeout from 30s to 15s for faster failure detection
- **Streamline conversation history**: Only send the last 6 messages of conversation history to the edge function instead of the full history, reducing payload size and AI processing time

### Technical details

**Files modified:**
1. `src/components/database/AgentChatView.tsx` — auto-enable computer mode, fix respond loop, add batch execution, optimize timeouts/history
2. `supabase/functions/extension-agent/index.ts` — update prompt to prefer returning batched `steps` arrays, redeploy
3. `src/hooks/useExtensionBridge.ts` — reduce `getPageContext` timeout to 1.5s

### Summary
- Employees always run in Computer Mode (auto-enabled on click)
- "respond" actions no longer terminate `runComputerMode` prematurely
- Batch action returns reduce API round-trips by 3-5x, making tasks significantly faster

