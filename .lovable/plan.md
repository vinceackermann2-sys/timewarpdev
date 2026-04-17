

# Goal
Make the 4 card types (Briefing, Updates, To-Dos, Objectives) and their right-side detail panel feel **cleaner, more congruent, more personal, and purposefully tailored** to what each one actually displays. Today they're inconsistent: BriefingCard is huge with a giant logo, DashCard (Updates) is a horizontal row, TodoCard is a single line, ObjectiveCard has progress bars — but none share a visual language, and the detail panel's source blocks (Outlook/Zoom/etc.) are generic rather than reinforcing the tab's purpose.

# Design principle
**One shared card skeleton + tab-specific personality.** Same anatomy (accent rail, header row, body, footer) → same accent colors that already exist in the detail panel (`TAB_FRAMING`) → so a card and its open panel feel like the same object expanding.

```text
┌─[accent rail 3px]──────────────────────────┐
│ [eyebrow chip]           [time/source]     │  ← tab identity
│ Title (clamp-2)                            │
│ ─ tab-specific signal block ─              │  ← what makes THIS tab matter
│ description (clamp-2)                      │
│ [primary action]   [secondary meta]        │
└────────────────────────────────────────────┘
```

# Per-tab personality

**Briefing — "What changed"** (calm, informational)
- Blue accent rail + eyebrow chip "Signal"
- Source logo small (28px, inline), not the giant 64px box
- Body: signal type + 2-line summary
- CTA: ghost-style "Read briefing" (no urgency)

**Updates — "Someone is waiting"** (urgent, human)
- Red accent rail + eyebrow "Waiting"
- Hero element: **avatar circle** with waiting party initial + name ("Maria Chen is waiting 3d")
- Wait duration as prominent escalation pill (color matches `getWaitEscalationColor`)
- Consequence shown inline if High priority
- CTA: solid red "Respond now"

**To-Dos — "Action required"** (focused, kinetic)
- Primary accent rail + eyebrow "Task"
- Checkbox on the left (current behavior preserved)
- Duration pill + leverage dots (the 5-bar leverage scale already exists in panel — surface on card)
- Single-line title but with hover-revealed first step preview
- CTA: "Start" + hover-secondary "Snooze"

**Objectives — "Strategic outcome"** (composed, aspirational)
- Emerald accent rail + eyebrow "Objective"
- Progress ring (24px circular) replaces flat bar — feels more "goal-shaped"
- Success metric as before (current → target)
- Linked to-dos count as small chip
- CTA: "Plan execution" (matches panel)

# Right-side panel improvements
Already tab-aware via `TAB_FRAMING`. Refinements:
1. **Add tab-personalized hero block** at top of body (under header):
   - Briefing: "What changed" callout box with the signal
   - Updates: large avatar + waiting party + escalating timer
   - To-Dos: duration + leverage + time-to-complete strip
   - Objectives: progress ring + metric delta
2. **Make source content secondary** in Updates/To-Dos/Objectives (collapse into "Source context" expandable section). Briefing keeps it primary since the source IS the briefing.
3. **Empty-state per tab** with personalized copy (Briefing: "All quiet — no new signals", Updates: "Inbox zero — nobody waiting", etc.)
4. **Sticky footer CTA** so action button is always visible while scrolling long source content.

# Files to change
1. **`src/components/database/dashboardTypes.ts`** — export shared `TAB_FRAMING` constant (move from panel) so cards + panel use identical accents/eyebrows/CTA labels.
2. **`src/components/database/ManageDashboardView.tsx`** — rewrite the 4 card components against the shared skeleton; add tab-personalized empty states.
3. **`src/components/database/DashCardDetailPanel.tsx`** — import shared `TAB_FRAMING`, add tab-personalized hero block, collapse source content for non-Briefing tabs, sticky footer CTA.

# What stays the same
- Data model (`DashboardCard` interface) — no breaking changes
- `dashboard-insights` edge function — no changes
- Tab list & routing — unchanged
- Existing color tokens (badgeClasses, getWaitEscalationColor, getDurationEmoji)
- Cache behavior, refresh, search, custom objectives, completed-todo tracking

# Out of scope
- Per-tab summary metric strip (separate suggestion)
- Differentiated empty-state animations
- Drag-to-reorder, snooze backend

