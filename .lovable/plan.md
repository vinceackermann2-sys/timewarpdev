

The user wants two things:
1. **Confirmation** that only valuable/scored data reaches the dashboard cards (not raw dumps).
2. **Expand connector data fetching** so each integration pulls its full relevant dataset, giving the DIM scoring engine more signal to work with.

Let me check the current `dashboard-insights` and `sync-provider-data` edge functions to understand what each connector currently fetches.

## Plan

### Part A — Confirmation (no code change)

The dashboard already enforces a quality gate. In `dashboard-insights/index.ts`:
- Raw provider data is fetched live → passed to Gemini with the **DIM scoring prompt** (Impact 0.45 + Urgency 0.35 + Context 0.20).
- Only items scoring above the relevance threshold are categorized into Briefing / Updates / To-Dos / Objectives.
- Quality gates strip vague headlines, dedupe, and cap counts (6–12 To-Dos, 3–6 Objectives, etc.).
- Verbatim fields (`bodyPreview`, `messageText`) are preserved for the right-side detail panel — never summarized.

So users only see scored, actionable cards — never raw provider dumps.

### Part B — Expand connector fetch breadth

Update each connector fetch in `dashboard-insights/index.ts` (and `_shared/run-employee/connections.ts` where shared) to pull the full relevant dataset instead of small samples.

| Connector | Current limit (likely) | New target |
|---|---|---|
| Google Drive | ~20 recent files | All files modified in last 30 days (paginated, cap 500) |
| Google Calendar | Next 10 events | All upcoming events next 30 days (cap 250) |
| Gmail | ~20 recent | All unread + last 100 read in last 7 days |
| HubSpot | Top deals | All open deals (all stages, cap 500) |
| Zoom | Recent meetings | All upcoming meetings next 30 days |
| Slack | Recent channels | All messages last 7 days across joined channels (cap 1000) |
| Teams | Recent | All channel messages last 7 days (cap 1000) |
| OneNote | Recent | All notebooks → all sections → recent pages (cap 300) |
| OneDrive | Recent | All files modified last 30 days (cap 500) |
| Outlook | ~20 recent | All inbox last 7 days + all unread (cap 500) |

### Implementation steps

1. **Audit fetch calls** — open `supabase/functions/dashboard-insights/index.ts` and `supabase/functions/_shared/run-employee/connections.ts`. Identify each provider's `?limit=`, `?$top=`, `?maxResults=`, page-token loops.
2. **Raise per-provider caps + add pagination loops** for Drive/Gmail/Slack/Teams/HubSpot/OneNote/OneDrive/Outlook (most APIs cap per-page at 100–250; loop until cap or no nextPageToken).
3. **Date-window filters** where applicable (Calendar/Zoom: next 30 days; Gmail/Outlook/Slack/Teams: last 7 days) to keep payloads relevant.
4. **Token refresh resilience** — keep `getValidProviderToken` wrapper; on 401 trigger one refresh + retry.
5. **Performance guards** — run all provider fetches in `Promise.allSettled` (parallel), add 25s overall timeout per provider so one slow API doesn't block dashboard render.
6. **Truncate before AI** — after fetch, sort by recency/value, then trim to top ~100 items per provider before feeding into the DIM scoring prompt (prevents Gemini context overflow while still giving it the full picture to choose from).
7. **No DB changes, no UI changes** — quality gate, card layout, and right-panel insight rendering already handle the richer data correctly.

### Files to edit

- `supabase/functions/dashboard-insights/index.ts` — main fetch + scoring orchestrator
- `supabase/functions/_shared/run-employee/connections.ts` — shared provider fetchers (used by both dashboard + employee runs)

### Risk

- Larger payloads → longer dashboard load. Mitigation: parallel fetches, per-provider 25s cap, top-100 trim before AI.
- Slack workspace search can be slow on large workspaces — keep cursor pagination with a hard 1000-message cap.

