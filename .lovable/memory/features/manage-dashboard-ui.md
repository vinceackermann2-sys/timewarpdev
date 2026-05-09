---
name: Dashboard Intelligence Model v2
description: DIM v2 composite scoring, Opening Summary, Health Score, Delta Layer, leverage labels, momentum
type: feature
---
The Dashboard is sidebar-driven, treating Briefing, Updates, To-Dos, and Objectives as standalone pages accessed via sidebar navigation.

## Dashboard Intelligence Model v2 (DIM v2)

### Composite Scoring Algorithm
Every signal is scored on 3 axes (1-5): Impact (×0.45), Urgency (×0.35), Context (×0.20).
- 4.0–5.0 → High priority
- 2.5–3.9 → Medium priority
- 1.0–2.4 → Low priority

### Tab Assignment (Dominant Axis)
- **Briefing**: Impact + Context dominant, no immediate action.
- **Updates**: Urgency dominant + external actor waiting.
- **To-Dos**: Urgency dominant + user is actor.
- **Objectives**: Impact dominant + strategic/long-term.

### Tab-Specific Fields
- **Briefing**: signalType.
- **Updates**: waitingParty, requestType, waitDuration, consequence.
- **To-Dos**: taskType, howTo, estimatedDuration (⚡/🕐/💎), leverageScore (1-5), **leverageLabel** (visible chip: ⚡ High Leverage / 🟠 Deep Work / ↻ Maintenance).
- **Objectives**: objectiveType, successMetric, progress, timeHorizon, relatedTodoIds, **momentumIndicator** (state + plain-English velocity sentence below progress bar).

### Top-Level Session Layer (NEW v2)
- **openingSummary**: AI-generated 3-sentence brief rendered as a blue banner at top of dashboard ("Today's Brief"). Mentions one signal, one friction, one focus.
- **healthScore**: 0–100 persistent score with grade (excellent/good/needs_work/poor), shown as colored badge next to active tab title. When score < 70, a reason banner appears.
- **Delta Layer**: Per-card `deltaState` (new / escalated / resolved / unchanged) computed by diffing against `dashboard_snapshots` table (keyed by user_id + brand_id). New/escalated/resolved render as a small chip in the card header; unchanged is silent.

### Persistence
`public.dashboard_snapshots` table stores `cards` (jsonb map of cardId → {priority, tab}), `opening_summary`, `health_score` per user+brand. Edge function `dashboard-insights` reads previous snapshot, computes deltas, returns enriched cards + summary + score, then writes the new snapshot.

### Quality Gates
Each tab has deterministic sorting tests: No-Action/Specificity (Briefing), Blocker/Wait/Person (Updates), Verb/Completability/How-To (To-Dos), Outcome/Measurability/Time-Bound (Objectives).

### Card Counts
Briefing 4-8, Updates 3-8, To-Dos 6-12, Objectives 3-6.

### Headline Rules
≤8 words, must contain number/name/temporal ref/direction.

### Tab Subtitles
- Briefing: "What Has Changed That You Need to Understand"
- Updates: "Who or What Is Blocked Waiting on You"
- To-Dos: "Where Your Time Should Go Right Now"
- Objectives: "What Strategic Outcomes Must You Drive This Quarter"
