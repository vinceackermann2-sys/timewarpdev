

## Plan: Connect AI Employees to Browser Extension with RAG Execution

### Overview

Replace the simulated SOP execution with real AI-powered execution that runs through the user's browser extension. Each employee gets a dedicated RAG context built from its SOP instructions + linked business data. The "Run Employee" button will only work when the extension is detected and connected.

### Architecture

```text
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Employee Detail │────▶│  run-employee (edge)  │────▶│  Lovable AI     │
│  (Run button)    │     │  RAG: SOP + biz data  │     │  (Gemini Flash) │
└────────┬────────┘     └──────────┬───────────┘     └────────┬────────┘
         │                         │                           │
         │  Extension detection    │  Returns action steps     │
         │  via window.postMessage │  (click/type/navigate)    │
         ▼                         ▼                           │
┌─────────────────┐     ┌──────────────────────┐              │
│  Chrome Extension│◀───│  Structured actions   │◀─────────────┘
│  (executes DOM)  │     │  streamed back        │
└─────────────────┘     └──────────────────────┘
```

### Changes

**1. New edge function: `run-employee`**
- Accepts `employee_id`, `messages`, `pageContext`
- Loads the employee record (SOP fields) + linked business data from DB
- Builds a RAG system prompt combining:
  - Employee name, role, SOP title, purpose, scope, definitions, procedure steps, safety notes
  - Linked business data content (from `user_business_data`)
- Sends to Lovable AI (Gemini Flash) with the browser-agent action format
- Streams response back; logs each step to `ai_employee_logs`
- Increments action usage via `increment_actions_used`

**2. Extension detection in `EmployeeDetailView`**
- On mount, send a `window.postMessage({ type: "TIMEWARP_PING" })` and listen for `TIMEWARP_PONG` response from the extension content script
- Track `extensionConnected` state
- Show connection status indicator (green dot / red warning)
- Disable "Run Employee" button if extension not detected, with helper text: "Install and log into the TimeWarp extension to run employees"

**3. Update `EmployeeDetailView` run flow**
- Replace simulated step-by-step execution with real streaming call to `run-employee`
- Pass current page context from extension (via `window.postMessage`)
- Parse streamed AI response for action steps
- Forward each action to extension via `postMessage` for execution
- Log each completed step to `ai_employee_logs` in real-time
- Handle errors, rate limits (429/402)

**4. Add extension communication protocol**
- `TIMEWARP_PING` / `TIMEWARP_PONG` — detect extension presence
- `TIMEWARP_GET_PAGE_CONTEXT` / `TIMEWARP_PAGE_CONTEXT` — get current browser page
- `TIMEWARP_EXECUTE_ACTION` / `TIMEWARP_ACTION_RESULT` — send action to extension for DOM execution
- `TIMEWARP_EMPLOYEE_START` / `TIMEWARP_EMPLOYEE_STOP` — lifecycle signals

**5. Config update**
- Add `run-employee` to `supabase/config.toml` with `verify_jwt = false`

### Files

| File | Action |
|------|--------|
| `supabase/functions/run-employee/index.ts` | Create — RAG edge function |
| `supabase/config.toml` | Update — add run-employee entry |
| `src/components/database/EmployeeDetailView.tsx` | Update — extension detection, real execution flow |
| `src/hooks/useExtensionBridge.ts` | Create — reusable hook for extension communication |

### No database changes needed
The existing `ai_employee_logs` table and `ai_employees` table already have all required columns.

