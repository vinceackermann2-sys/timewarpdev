

## Goal
Upgrade the right-side detail panel (`DashCardDetailPanel`) so each card renders its source data in a **native, recognizable format** (email, meeting, document, Slack message, etc.), add a **quick-notes** field, and **shrink the action buttons** so they're less text-heavy.

## Exploration needed
- `src/components/database/DashCardDetailPanel.tsx` — current right-side panel layout
- `src/components/database/dashboardTypes.ts` — already has `metadata` (sender, subject, bodyPreview, attendees, scheduledDate, channel, messageText, fileName, sharedBy, notebook) ✓
- Confirm where notes would persist (likely `localStorage` keyed by `card.id` for now — no schema change needed unless user wants cross-device sync)

## Plan

### 1. Source-native renderers in the detail panel
Add a `<SourceNativeBlock>` that switches on `card.source` and renders the metadata in the format the user expects to see:

| Source | Native render |
|---|---|
| `outlook` / gmail | **Email card**: From (avatar + name + email), Subject (bold), Received timestamp → then verbatim `bodyPreview` in mono/serif body, with "Reply" affordance |
| `zoom` / teams meeting / calendar | **Meeting card**: Title, scheduled date/time + duration, attendee chips with initials, "Join" pill |
| `hubspot` | **Deal card**: Contact name, deal value badge, pipeline stage badge, last touch |
| `slack` / teams chat | **Chat bubble**: Channel `#name`, author + avatar, timestamp, verbatim `messageText` in a chat bubble style |
| `onedrive` / drive | **File card**: File icon by extension, fileName, sharedBy, "Open file" link |
| `onenote` | **Note card**: Notebook → Section → Page hierarchy, author, preview |
| `business-dna` / `products` / `audiences` / `employees` / `general` | Keep current generic block |

Each renderer uses the existing `SOURCE_META` icon as the header chip, sits inside the existing `accentSoftBg` framing, and **shows the real data verbatim** (never summarized — already enforced by `bodyPreview` / `messageText` fields).

### 2. Quick Notes section
Add below the source-native block:
- Heading "Quick notes" (small, muted)
- `<Textarea>` with placeholder "Jot down thoughts, follow-ups, or context…"
- Auto-save (debounced 600ms) to `localStorage` under key `dash-note:{card.id}`
- Tiny "Saved" indicator that fades after save
- No DB write, no schema change

### 3. Slimmer action buttons
Current footer likely shows verbose CTAs ("Discuss in Assistant", "View Email", "Mark complete"). Change to:
- **Primary CTA** (from `TAB_FRAMING[kind].ctaLabel`) → keep one-word label (Discuss / Respond / Start / Plan), use `size="sm"`, icon-leading
- **Secondary "Open source"** → icon + short label (e.g. just "Open", icon from `SOURCE_META`), `size="sm"`, `variant="outline"`
- **Tertiary "Done"** → icon-only `size="icon"` check button with tooltip
- All in one tight `flex gap-2` row, no full-width stretching

### 4. No changes to
- Card grid / list itself
- DIM scoring or data fetching
- `dashboardTypes.ts` (metadata fields already cover everything)

## Files to edit
- `src/components/database/DashCardDetailPanel.tsx` — add `SourceNativeBlock`, notes section, slim button row

## Approach summary
```text
┌─ Detail Panel ──────────────────────────┐
│ Eyebrow chip · Title                     │
│ Why-it-matters summary                   │
│                                          │
│ ┌─ Source-native block ───────────────┐ │
│ │ [icon] From: Anna · 2h ago          │ │
│ │ Subject: Q4 budget review           │ │
│ │ ───────────────────────────────     │ │
│ │ Hi team, attached is the draft...   │ │  ← verbatim bodyPreview
│ │ (rendered as email body)            │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Quick notes                              │
│ ┌────────────────────────────────────┐  │
│ │ [textarea — autosaved]             │  │
│ └────────────────────────────────────┘  │
│                                          │
│ [Discuss] [Open] [✓]                     │  ← slim button row
└──────────────────────────────────────────┘
```

