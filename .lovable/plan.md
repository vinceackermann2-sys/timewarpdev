
Goal: fix Employee Chat so the sub-logging reflects what the AI is actually doing, remove the suggestion chips from that chat, and stop unnecessary connection checks before they happen.

1. Make Employee Chat logging real-time and accurate
- Replace the current “optimistic” frontend-only step sequence in `src/components/database/AgentChatView.tsx`.
- Update `supabase/functions/run-employee/index.ts` to emit progress metadata for the actual phases:
  - request analysis
  - business-context retrieval
  - connection search skipped / started
  - Microsoft search started / finished
  - Slack search started / finished
  - response generation
  - completion
- Have the frontend consume those progress events and append steps as they arrive, instead of guessing steps before the backend finishes.
- Preserve all completed sub-steps in the timeline so the user sees more than one sub-log per message.
- Show explicit “skipped” steps when connections are intentionally not searched, so the timeline still explains the decision.

2. Stop wasting time on unnecessary connection checks
- Add a lightweight intent-analysis layer in `run-employee` before any live connection lookup.
- Use deterministic rules first, not another expensive model call.
- Only search connections for queries that clearly need external comms/work data, for example:
  - collaborations / partnerships
  - complaints / customer issues
  - recent messages / email / Slack / files / meeting follow-ups
- Skip connection lookups for generic advice/questions like strategy, tips, brainstorming, summaries from existing business data.
- Return the analysis decision to the frontend so the log can say things like:
  - “Request needs connected sources”
  - “Skipping connected sources — this question can be answered from existing business context”

3. Make provider logging match real provider activity
- Log provider-specific steps only when that provider was actually attempted by the backend.
- Include clear labels such as:
  - “Searching Microsoft 365 emails & files”
  - “Searching Slack messages & channels”
  - “Skipped Microsoft — not relevant to this question”
  - “Skipped Slack — not connected”
- Make sure provider steps appear during generation, not only after the final answer returns.

4. Remove suggested questions from Employee Chat
- Remove the suggestion chips / suggested prompts from the AI Employee Chat surface so only the message input remains.
- Keep this scoped to Employee Chat, not unrelated chat screens.

5. UI cleanup for the sub-logging display
- Adjust `TaskStepsDisplay` only if needed so completed steps remain visible and the active step does not hide the earlier ones.
- Keep the timeline expanded and readable while streaming.

Files likely affected
- `src/components/database/AgentChatView.tsx`
- `src/components/database/TaskStepsDisplay.tsx`
- `supabase/functions/run-employee/index.ts`

Technical details
- Root issue: the frontend currently adds several guessed steps up front, but the backend only returns `searchedProviders` after the request finishes. That means the UI cannot truthfully show live connection work while the answer is being generated.
- Best fix: move to backend-driven progress events/metadata for Employee Chat, similar in spirit to the existing streaming chat flows already used elsewhere in the app.
- No database schema changes should be required for this fix.

Validation plan
- Test a connection-heavy question like: “any collaborations coming up”
  - should show request analysis
  - should show Microsoft/Slack checks while thinking
  - should not wait until the end to reveal those steps
- Test a complaint question like: “any customer complaints?”
  - should show connected-source checks if relevant
- Test a generic advice question like: “how should we improve our homepage?”
  - should skip connection checks and log that skip clearly
- Confirm multiple sub-logs remain visible for one message
- Confirm suggested question chips are gone from Employee Chat
