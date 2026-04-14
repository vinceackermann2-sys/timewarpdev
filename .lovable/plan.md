

## Plan: Improve Dashboard Detail Panel Layout and Add Action Button

### What Changes

**1. Restructure the DashCardDetailPanel layout** (`src/components/database/DashCardDetailPanel.tsx`)
- For Outlook emails: show the full email content (sender, subject, body) at the top of the panel, right after the source badge
- For all sources: move "Details & Recommendations" section to the bottom
- Replace the "Suggested Action" text box with an actionable **button** that, when clicked, navigates the user to the Assistant view and pre-fills the action suggestion as a message

**2. Wire up navigation from dashboard to assistant** (`src/components/database/DashCardDetailPanel.tsx`, `src/components/database/ManageDashboardView.tsx`, `src/pages/Database.tsx`)
- Add an `onExecuteAction` callback prop to `DashCardDetailPanel` and `ManageDashboardView`
- In `Database.tsx`, implement the callback: switch `currentView` to `"employees"` (Assistant) and store the action text in state
- Pass an `initialMessage` prop to `AgentChatView` so it auto-sends the suggested action when navigated to from the dashboard

**3. Add initialMessage support to AgentChatView** (`src/components/database/AgentChatView.tsx`)
- Accept an optional `initialMessage` prop
- On mount (or when `initialMessage` changes), auto-submit it as a user message in the chat

### New Layout Order (Detail Panel)
```text
┌─────────────────────────┐
│ Priority Badge + Category│
│ Title                    │
├─────────────────────────┤
│ Source badge + time      │
│                          │
│ [Email content / Source  │
│  metadata section]       │
│                          │
│ Summary (non-outlook)    │
│                          │
│ Details & Recommendations│
│                          │
│ ┌─ Action Button ──────┐│
│ │ ▶ Execute: "Draft a  ││
│ │   reply to..."        ││
│ └───────────────────────┘│
└─────────────────────────┘
```

### Files Modified
- `src/components/database/DashCardDetailPanel.tsx` — reorder sections, add button with `onExecuteAction` callback
- `src/components/database/ManageDashboardView.tsx` — pass `onExecuteAction` through to detail panel
- `src/pages/Database.tsx` — handle action execution: switch to assistant view with pre-filled message
- `src/components/database/AgentChatView.tsx` — accept and auto-send `initialMessage` prop

