

## Problem

The current flow collects the AI's action plan, then sends `TIMEWARP_EXECUTE_ACTION` messages via `window.postMessage` — but these only reach the extension's content script on the **current page** (the TimeWarp app itself). The actions need to execute on a **different browser tab** (e.g. Google Ads, a CMS, etc.).

There are two issues:
1. **The extension must relay actions to its background script**, which can open new tabs and inject scripts there. Does your extension's content script currently handle `TIMEWARP_EXECUTE_ACTION` and forward it to `background.js`?
2. **The webapp sends all steps at once** after the AI responds, with no feedback loop — it doesn't get fresh page context between steps.

## What I can fix (webapp side)

### 1. Agentic execution loop
Instead of asking the AI for all steps upfront and executing them blindly, implement a step-by-step loop:
- Send SOP + current page context to AI → get **one action**
- Send action to extension → wait for result
- Get **fresh page context** from extension (the new tab's state)
- Send updated context + result back to AI → get next action
- Repeat until AI says "done"

This makes the employee actually reactive to what's on screen.

### 2. Proper message format for tab-level actions
Update `executeAction` to include a `tabAction: true` flag so the extension knows to execute in the active/new tab rather than the current page:
```
{ type: "TIMEWARP_EXECUTE_ACTION", action: { ... }, executeInTab: true }
```

### 3. Edge function change
Switch from streaming the full response to a non-streaming single-step mode, so each AI call returns one action at a time for the agentic loop.

### Files to modify
- `src/hooks/useExtensionBridge.ts` — add `executeInTab` flag to action messages
- `src/components/database/EmployeeDetailView.tsx` — rewrite `handleRun` as an agentic loop (get context → AI → execute → repeat)
- `supabase/functions/run-employee/index.ts` — switch to non-streaming mode, return single JSON action per call

## Critical question
**Does your extension's content script currently handle `TIMEWARP_EXECUTE_ACTION` messages at all?** If not, the extension itself needs a handler that forwards actions to `background.js` → which then uses `chrome.tabs` API to open tabs and inject action scripts. I can only fix the webapp side — the extension relay logic would need to be added separately.

