

# Implement Dashboard Intelligence Model from PDF

## Summary

Upgrade the dashboard's AI prompt (edge function) and frontend card components to match the 40-page Dashboard Intelligence Model specification. This adds the composite scoring algorithm, tab-specific fields (signalType, waitingParty, howTo, successMetric, etc.), richer card UI per tab, and quality gate enforcement.

## Technical Details

### 1. Update `dashboardTypes.ts` — Extend card schema

Add tab-specific fields to `DashboardCard` interface:
- `signalType`, `waitingParty`, `requestType`, `waitDuration`, `consequence` (Updates)
- `taskType`, `howTo`, `estimatedDuration`, `leverageScore`, `completed` (To-Dos)
- `objectiveType`, `successMetric` (object with `current`, `target`, `gap`, `source`), `progress` (number 0-100), `timeHorizon`, `relatedTodoIds` (Objectives)

Add `TAB_SUBTITLES` update to match PDF definitions:
- Briefing: "What Has Changed That You Need to Understand"
- Updates: "Who or What Is Blocked Waiting on You"
- To-Dos: "Where Your Time Should Go Right Now"
- Objectives: "What Strategic Outcomes Must You Drive This Quarter"

### 2. Rewrite `dashboard-insights/index.ts` system prompt

Replace the current loose bucket prompt with the PDF's deterministic classification engine:

- **Composite Score formula**: `(Impact × 0.45) + (Urgency × 0.35) + (Context × 0.20)` → priority mapping (4.0–5.0 = High, 2.5–3.9 = Medium, 1.0–2.4 = Low)
- **Tab assignment rules**: Dominant axis determines placement (urgency + external actor → Updates; impact + strategic → Objectives; urgency + user is actor → To-Dos; impact + context + no action → Briefing)
- **Sorting tests per tab**: Include the quality gate checks as explicit instructions (e.g., Briefing: no-action test, specificity test; Updates: blocker test, wait test, person test; To-Dos: verb test, completability test, how-to test; Objectives: outcome test, measurability test, time-bound test)
- **Card counts**: Briefing 4–8, Updates 3–8, To-Dos 6–12, Objectives 3–6
- **Tab-specific field generation**: Instruct AI to return all new fields per tab (signalType for Briefing, waitingParty/requestType/waitDuration/consequence for Updates, taskType/howTo/estimatedDuration for To-Dos, objectiveType/successMetric/progress/timeHorizon/relatedTodoIds for Objectives)
- **Headline rules**: ≤8 words, must contain number/name/temporal ref/direction. Anti-patterns explicitly listed
- **Updates urgency escalation**: Wait duration modifiers (+0.5 at 2–8h, +1.0 at 8–24h, +1.5 at 1–3d → yellow minimum, +2.0 at 3–7d → red minimum, +3.0 at >7d → critical)
- **Cross-tab linking**: Objectives generate relatedTodoIds referencing To-Do card IDs

### 3. Update `ManageDashboardView.tsx` — Richer card components

**BriefingCard**: Add signal type icon from `ICON_MAP` based on `card.signalType` or `card.icon`. Keep existing layout but add signal type label.

**DashCard (Updates)**: Show waiting party name, wait duration badge with escalation color, consequence preview text, and request type icon. Priority escalates visually based on wait duration.

**TodoCard**: Add estimated duration badge (⚡ Quick / 🕐 Medium / 💎 Deep Work), show `howTo` preview on hover/detail, task type icon. Keep completion checkbox.

**ObjectiveCard**: Show real `progress` value from AI in progress bar (not hardcoded 70%), display `successMetric` (current → target), `timeHorizon` badge, and related to-do count.

### 4. Update `DashCardDetailPanel.tsx` — Tab-aware detail view

Extend the detail panel to render tab-specific fields:
- **Briefing**: Show signalType header, synthesis, deep-dive sections
- **Updates**: Show waiting party, wait duration with escalation color, consequence of inaction block, recommended response
- **To-Dos**: Show howTo as numbered steps, estimated duration, leverage score visual, completion criteria
- **Objectives**: Show success metric (current/target/gap), progress bar, time horizon, sub-milestones from detail, related to-do list

### 5. Save memory

Update `mem://features/manage-dashboard-ui` with the new DIM architecture.

## Files Changed

1. `src/components/database/dashboardTypes.ts` — Extended interfaces and subtitles
2. `supabase/functions/dashboard-insights/index.ts` — Rewritten system prompt with DIM classification engine
3. `src/components/database/ManageDashboardView.tsx` — Richer card components per tab
4. `src/components/database/DashCardDetailPanel.tsx` — Tab-aware detail rendering
5. `mem://features/manage-dashboard-ui` — Updated memory

## What Will NOT Change

- The 4-tab structure (Briefing, Updates, To-Dos, Objectives) stays
- Integration data fetching logic in the edge function stays identical
- Caching, search, and refresh mechanics stay
- The sidebar-driven navigation stays
- No database changes needed

