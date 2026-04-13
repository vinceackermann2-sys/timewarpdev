

## Plan: Personalized Dashboard Cards and Rich Detail Panel

### What Changes

**1. Bigger card icons** — Increase the icon container from 32x32 to 40x40 and the icon image from 20x20 to 28x28 in `ManageDashboardView.tsx`.

**2. Personalized button labels** — Instead of generic "View Details", derive the label from the card's context: "View Email", "View Meeting", "View Deal", "View Message", "View File", "View Note", etc. This will be based on a combination of `source` and `category` fields.

**3. Extend `DashboardCard` type with metadata** — Add a `metadata` field to the card type that holds source-specific context:
   - Email cards: `senderName`, `senderEmail`, `subject`
   - Meeting cards: `attendees`, `scheduledDate`, `duration`
   - Deal/contact cards: `contactName`, `dealValue`, `stage`
   - Slack cards: `channel`, `author`
   - File cards: `fileName`, `sharedBy`
   - General: `actionSuggestion` (always present — recommended next step)

**4. Update AI prompt** — Modify the `dashboard-insights` edge function prompt to instruct the AI to include a `metadata` object and an `actionSuggestion` string on every card, populated with real data from the integration context.

**5. Rich detail panel** — Rewrite `DashCardDetailPanel.tsx` to render contextual sections based on source:
   - **Email (Outlook)**: Shows sender name, email address, subject, and mail icon
   - **Meeting (Zoom)**: Shows calendar icon, attendees list, date/time, duration
   - **Deal/Contact (HubSpot)**: Shows contact name, deal value, pipeline stage
   - **Message (Slack)**: Shows channel name, author
   - **File (OneDrive)**: Shows file name, shared by
   - **Note (OneNote)**: Shows notebook/section info
   - **Action Suggestion** (bottom): A highlighted box with a recommended action to take

### Files Modified
- `src/components/database/dashboardTypes.ts` — add `metadata` and `actionSuggestion` to `DashboardCard`
- `src/components/database/ManageDashboardView.tsx` — bigger icons, personalized button text
- `src/components/database/DashCardDetailPanel.tsx` — contextual source info sections + action suggestion box
- `supabase/functions/dashboard-insights/index.ts` — update AI prompt to return metadata + actionSuggestion per card

### Technical Details

New `DashboardCard` fields:
```typescript
interface DashboardCard {
  // ...existing fields
  actionSuggestion?: string;
  metadata?: {
    senderName?: string;
    senderEmail?: string;
    subject?: string;
    attendees?: string[];
    scheduledDate?: string;
    duration?: string;
    contactName?: string;
    dealValue?: string;
    stage?: string;
    channel?: string;
    author?: string;
    fileName?: string;
    sharedBy?: string;
    notebook?: string;
  };
}
```

Button label logic:
```typescript
function getButtonLabel(card: DashboardCard): string {
  const map: Record<string, string> = {
    outlook: "View Email", zoom: "View Meeting",
    hubspot: "View Deal", slack: "View Message",
    onedrive: "View File", onenote: "View Note",
  };
  return map[card.source || ""] || "View Details";
}
```

