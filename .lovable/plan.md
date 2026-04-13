

## Plan: Dashboard Card Visual Polish and Real Timestamps

### Changes

**1. Pastel priority badges** — Update `badgeClasses` in `dashboardTypes.ts` and `DashCardDetailPanel.tsx`:
- High → pastel red (`bg-red-100 text-red-700`)
- Medium → pastel yellow (`bg-yellow-100 text-yellow-700`)  
- Low → pastel green (`bg-green-100 text-green-700`)

**2. Bigger icons and buttons on cards** — In `ManageDashboardView.tsx`:
- Icon container: `w-10 h-10` → `w-12 h-12`, icon image: `w-7 h-7` → `w-8 h-8`
- Button: increase padding and text size (`h-9 px-5 text-sm`)

**3. Real `timeAgo` values** — Currently the AI hallucinates `timeAgo` since it doesn't know the current time:
- Pass the current ISO timestamp in the prompt so the AI can compute accurate relative times
- Add instruction: "The current time is {ISO date}. Calculate timeAgo relative to this."
- Also add a `timestamp` field to the card schema so the frontend can compute its own relative time as a fallback

**4. Email-style detail panel for Outlook cards** — In `DashCardDetailPanel.tsx`, when `source === "outlook"`, render an email-like layout:
- Header row with sender avatar placeholder, sender name bold, email address below
- "Subject:" line styled like an email client
- Summary rendered as the email body in a card/container with slight background
- Keep the action suggestion at the bottom

### Files Modified
- `src/components/database/dashboardTypes.ts` — pastel badge colors, add `timestamp` field
- `src/components/database/ManageDashboardView.tsx` — bigger icons, bigger buttons
- `src/components/database/DashCardDetailPanel.tsx` — pastel badges, email-style outlook section
- `supabase/functions/dashboard-insights/index.ts` — inject current timestamp, add `timestamp` field to prompt

### Technical Details

Badge classes update:
```typescript
export const badgeClasses: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-700",
};
```

Prompt addition for real timestamps:
```
The current date/time is: ${new Date().toISOString()}
Each card MUST include a "timestamp" field (ISO 8601) based on the real date from the source data. The "timeAgo" field should be calculated relative to the current time.
```

Email-style Outlook section in detail panel: render From/Subject/Body in a bordered card resembling an email thread, with the sender displayed prominently.

