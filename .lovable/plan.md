

## Plan: Slower Shining Animation, Bigger Thinking Text, Fix Slide Business Context

### Issues

1. **Shining animation too fast** — Currently 1.5s duration, needs to be slower for readability.
2. **"Thinking" text too small** — Currently `text-[15px]`, needs to be larger.
3. **Slides ignore Business DNA** — The system prompt in `run-employee/index.ts` line 1027 says "Reference material above is supplementary — only mention it if directly relevant." This contradicts the slide/pitch instructions, causing the AI to treat business data as optional even when creating investor pitches.

### Changes

#### 1. ShiningText — Slower animation
**File:** `src/components/ui/shining-text.tsx`
- Change duration from `1.5` to `3` seconds for a smoother, more visible sweep

#### 2. Thinking text — Bigger
**File:** `src/components/database/TaskStepsDisplay.tsx`
- Change the "Thinking" / "Completed X tasks" text from `text-[15px]` to `text-[17px]`

#### 3. Fix conflicting system prompt instructions
**File:** `supabase/functions/run-employee/index.ts`
- Line 1027: Change "Reference material above is supplementary — only mention it if directly relevant" to "Reference material above contains verified business data. When creating any pitch, presentation, report, slide, or document, you MUST use this data to personalize the content. For general questions, reference it when relevant."
- Line 1071-1072: Strengthen the SLIDES & DOCUMENTS section to say "You MUST use the business's brand name, products, audience, and any metrics from the Reference Material above. Do NOT create generic content. Every slide, document, or pitch must reflect THIS business's actual data."

**File:** `supabase/functions/extension-agent/index.ts`
- Apply the same prompt fix if a similar "supplementary" instruction exists

### Technical Details
- The core bug is a prompt contradiction: one rule says "only mention reference material if relevant" while another says "always use business data for pitches." The AI follows the first rule and ignores the business data.
- The fix removes the ambiguity by making business data mandatory for content creation tasks while keeping it optional for simple Q&A.

