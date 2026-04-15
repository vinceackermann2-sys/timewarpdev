---
name: Dashboard Intelligence Model
description: DIM composite scoring, tab-specific fields, quality gates, wait escalation
type: feature
---
The Dashboard is sidebar-driven, treating Briefing, Updates, To-Dos, and Objectives as standalone pages accessed via sidebar navigation.

## Dashboard Intelligence Model (DIM)

### Composite Scoring Algorithm
Every signal is scored on 3 axes (1-5): Impact (×0.45), Urgency (×0.35), Context (×0.20).
- 4.0–5.0 → High priority
- 2.5–3.9 → Medium priority
- 1.0–2.4 → Low priority

### Tab Assignment (Dominant Axis)
- **Briefing**: Impact + Context dominant, no immediate action. Informs the user.
- **Updates**: Urgency dominant + external actor waiting. Someone is blocked.
- **To-Dos**: Urgency dominant + user is actor. User must act.
- **Objectives**: Impact dominant + strategic/long-term. Measured outcomes.

### Tab-Specific Fields
- **Briefing**: signalType (Market Shift, Competitor Move, Metric Change, etc.)
- **Updates**: waitingParty, requestType, waitDuration, consequence. Wait escalation colors based on duration.
- **To-Dos**: taskType, howTo (numbered steps), estimatedDuration (⚡ Quick / 🕐 Medium / 💎 Deep Work), leverageScore (1-5).
- **Objectives**: objectiveType, successMetric (current/target/gap/source), progress (0-100), timeHorizon, relatedTodoIds.

### Quality Gates
Each tab has deterministic sorting tests: No-Action/Specificity (Briefing), Blocker/Wait/Person (Updates), Verb/Completability/How-To (To-Dos), Outcome/Measurability/Time-Bound (Objectives).

### Card Counts
Briefing 4-8, Updates 3-8, To-Dos 6-12, Objectives 3-6.

### Headline Rules
≤8 words, must contain number/name/temporal ref/direction. No vague titles like "Important Update".

### Tab Subtitles
- Briefing: "What Has Changed That You Need to Understand"
- Updates: "Who or What Is Blocked Waiting on You"
- To-Dos: "Where Your Time Should Go Right Now"
- Objectives: "What Strategic Outcomes Must You Drive This Quarter"
