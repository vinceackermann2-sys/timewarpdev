
Goal: make Employee Chat always use the correct employee-specific pipeline for normal questions, so the sub-logging shows live, personal connection checks only when relevant.

What’s actually going wrong
- The screenshot matches the generic `runAgentChat` labels (`Gathering your business context`, `Analyzing the best approach`, `Composing your response`), not the employee SSE logging.
- That means some “employee chat” messages are still being routed through the generic chat path instead of `runEmployeeChat`.
- I also found two concrete gaps:
  1. `AgentChatView.tsx` relies on `selectedChatEmployees` at send time, but chat history reload only restores `messages`, not the selected employee context.
  2. Computer-mode employee runs use `runComputerMode`, which does not surface the same live connection-search sub-logging as the normal employee SSE flow.

Implementation plan

1. Fix message routing so employee conversations stay in employee mode
- Update `src/components/database/AgentChatView.tsx` so follow-up messages can infer employee mode from the active conversation, not only from the current chip state.
- Restore employee context when selecting a saved chat by inspecting recent user messages with `employees` metadata and repopulating `selectedChatEmployees`.
- Add a small helper like `getActiveEmployeeContext()` that resolves employee context from:
  - current selected employee chip
  - latest saved employee-tagged user message in the thread
- Use that helper in `handleSendMessage` so normal employee follow-ups always call `runEmployeeChat`.

2. Separate “Employee Chat” from “Computer Mode” more safely
- Ensure a normal typed employee question does not accidentally fall into the generic path.
- Keep browser automation under `runComputerMode`, but make plain employee Q&A use `runEmployeeChat` unless the user is explicitly running browser/computer execution.
- Review the current auto-selection flow around `autoRunEmployee` so it doesn’t leave the UI in a confusing state for later follow-up questions.

3. Remove the old generic task labels from employee follow-ups
- Since the screenshot proves generic labels are still rendering, audit the branching so only:
  - `runAgentChat` emits generic labels
  - `runEmployeeChat` emits personalized SSE labels
- Make sure employee-tagged conversations never fall back to the generic optimistic step builder unless there is truly no employee context.

4. Make employee sub-logging truly congruent with the live connection lookup model
- Refine `supabase/functions/run-employee/index.ts` so progress events always reflect:
  - request understanding
  - business context retrieval
  - connected-source decision
  - provider-specific searches/skips
  - answer generation
- Personalize labels using the actual user query topic, but keep them tied to real backend work only.

5. Improve connection intent handling for short natural questions like “any collabs?”
- Expand the intent/topic parsing so shorthand questions still trigger connected-source checks when appropriate.
- Ensure logs say things like:
  - `Checking connected sources for collaborations`
  - `Searching Microsoft 365 emails & files for collaborations`
  - `Searching Slack messages & channels for collaborations`
- If skipped, show a personalized skip reason instead of a generic fallback.

6. Bring parity to employee computer-mode logs where feasible
- Review `runComputerMode` and decide whether it should:
  - consume the same metadata from `run-employee`, or
  - clearly remain separate and not be used for normal employee Q&A
- Primary fix is routing normal employee chat correctly first, because that appears to be the main cause of the screenshot.

Files to update
- `src/components/database/AgentChatView.tsx`
- `supabase/functions/run-employee/index.ts`
- Possibly small follow-up adjustments in `src/components/database/TaskStepsDisplay.tsx` if step rendering needs clearer provider/skipped states

Validation
- Open Employee Chat, select an employee, ask: `any collabs?`
  - should not show the old generic 4-task sequence
  - should show employee-specific personalized steps
  - should show Microsoft/Slack connection steps if relevant
- Ask a generic question in the same employee thread
  - should stay in employee mode
  - should show a personalized “skip connected sources” step when appropriate
- Reload or reopen chat history
  - employee follow-up messages should still route to `runEmployeeChat`
- Test explicit computer-mode runs separately so they do not break normal employee chat behavior

Expected outcome
- The old generic logging disappears from Employee Chat follow-ups.
- Employee conversations keep their employee context across turns/history.
- Connection sub-logging becomes personal to the user’s message and only appears when the backend actually checks those sources.
