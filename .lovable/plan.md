

## Plan: Fix Task Failures + Redesign Logging Cards

### Why tasks fail

After reviewing both execution loops (`runComputerMode` and `runAgentChatWithBrowser`), the main failure points are:

1. **Failed actions don't retry** — When a click/type/extract fails, the error is passed back to the AI but the AI often doesn't recover well. The loop continues but accumulates errors.
2. **JSON parse failures crash the loop** — `JSON.parse(jsonMatch[1])` on line 963 has no try/catch. If the AI returns malformed JSON, the entire task throws and stops.
3. **No error recovery guidance** — When an action fails, the result is sent back raw (`Action result: {"success":false,"error":"..."}`) without telling the AI to try an alternative approach.
4. **Extract actions fail silently on JS-heavy pages** — The fallback only triggers when `!result.success`, but sometimes the extension returns `success: true` with empty data.

### Changes

**1. Fix task completion reliability** (`AgentChatView.tsx`)

- Wrap `JSON.parse` in try/catch in both loops — if parsing fails, push the raw content back into conversation history and ask the AI to re-format as valid JSON, then `continue` the loop instead of crashing
- When an action fails (non-extract), append recovery instructions: `"Action failed: [error]. Try an alternative approach — use a different selector, scroll to find the element, or navigate differently."`
- For extract: also handle `success: true` but empty/missing `data` as a fallback trigger
- Add a consecutive error counter — if 3 actions fail in a row, generate the report with what was collected and stop gracefully instead of burning through all 30 steps

**2. Redesign logging cards — stacked list with thinking animation** (`TaskStepsDisplay.tsx`)

Based on the reference image (Manus-style), redesign to show each step as an individual line item stacked vertically (not a collapsible summary bar):

- Remove the summary button bar — instead show all steps directly as a vertical list
- Each step: a single line with icon (spinner/check/x) + label, small text, minimal padding
- Active step shows a thinking/typing animation (3 pulsing dots after the label)
- Completed steps show a muted check icon
- The whole list auto-scrolls to keep the current step visible
- Wrap in a container with max-height and overflow-y-auto so it doesn't take over the chat

### Technical details

**Files modified:**
1. `src/components/database/AgentChatView.tsx` — JSON parse safety, error recovery prompts, consecutive error bail-out (both `runAgentChatWithBrowser` and `runComputerMode`)
2. `src/components/database/TaskStepsDisplay.tsx` — Full redesign to stacked list with thinking animation

