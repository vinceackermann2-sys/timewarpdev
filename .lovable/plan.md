

## Plan: Fix Employee Chat Logging UX + RAG Fact-Checking

### Issues Identified

1. **Loader spinner next to "Thinking" text** — The `Loader2` spinning icon appears alongside the "Thinking" text and bouncing dots, making it redundant/cluttered.
2. **"Thinking" text and dots not synchronized** — The `animate-pulse` on text and `animate-bounce` on dots run independently with different timings.
3. **Step icons only show chevron during streaming, other icons appear after completion** — The `getStepIcon()` function maps icons by label keywords, but each step's icon (`StepIcon`) is always rendered. The issue is that steps 2 and 3 ("Analyzing..." and "Composing...") are added and immediately completed (`completeStep()` right after `addStep()`), so they flash through too quickly to be seen during streaming. Only the first step stays in "running" state long enough to be visible.
4. **RAG fact-checking** — Currently, brand/product/audience data is only prioritized when `needsStrictVerification` is true (pricing/revenue queries). For general queries with lots of RAG data, the system doesn't always include brand, product, and audience records for cross-referencing.

### Changes

#### 1. TaskStepsDisplay.tsx — Remove Loader2 and sync animations
- Remove the `<Loader2>` spinner from the section header when `!sectionDone`
- Sync the "Thinking" text animation with the bouncing dots by using the same `animate-bounce` timing or removing `animate-pulse` and keeping just the dots as the visual indicator

#### 2. AgentChatView.tsx — Stagger step additions so all icons are visible
- Currently steps 2 and 3 are added + completed instantly after the response comes back (lines 892-895). Instead, add small delays between steps so users can see each step appear with its icon during streaming:
  - After response OK: complete step 1, add step 2 ("Analyzing...")
  - After ~500ms or first content chunk: complete step 2, add step 3 ("Composing...")
  - This way all step icons are visible during the streaming phase, not just retroactively

#### 3. run-employee/index.ts — Always include brand/product/audience in RAG
- In `retrieveRelevantContext`, when the total item count is above a threshold (e.g., 10+), always ensure at least one brand, one product, and one audience record are included in the top-5 results, even if their keyword score is lower. This acts as a fact-checking anchor so the AI can cross-reference claims against core business data.
- Add a system prompt line in `buildEmployeeChatPrompt` instructing the AI to cross-check any claims about the business against the brand, product, and audience records in the Reference Material.

### Technical Details

**TaskStepsDisplay.tsx changes:**
- Line 115: Remove `Loader2` spinner, keep only the dots as the active indicator
- Line 117: Remove `animate-pulse` from "Thinking" text — the bouncing dots already signal activity

**AgentChatView.tsx changes:**
- Lines 892-895: Instead of instantly adding and completing steps 2+3, trigger step 2 after response OK, then transition step 2→3 when first content arrives from the stream

**run-employee/index.ts changes:**
- In `retrieveRelevantContext` (line 852-857): After scoring and sorting, check if the top 5 results include at least one each of brand/product/audience. If missing, swap in the highest-scored item of the missing type
- In `buildEmployeeChatPrompt` (around line 1014): Add instruction: "When the Reference Material includes brand, product, or audience records, always cross-check your response against those records for accuracy before answering"

