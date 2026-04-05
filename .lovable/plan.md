
Goal: make integration status truly business-scoped everywhere, especially in Employees chat, so connecting Microsoft/Slack/HubSpot to Business A does not show as connected for Business B.

1. Fix the backend status lookup
- Update the `connect-provider` edge function `check-status` logic so a selected business only returns connections tied to that exact business.
- Remove the current fallback that also treats `brand_id = null` legacy rows as connected for every business.
- Keep a safe fallback only when no business is selected at all.
- Preserve disconnect behavior and token cleanup logic.

2. Normalize how business IDs are resolved
- Use one consistent rule everywhere:
  - Business DNA / Database / Settings pass the logical business id (`brand.id`)
  - Employee detail resolves `linked_business_id` row -> logical `brand.id`
  - Agent chat resolves the selected agent -> exact brand record -> logical `brand.id`
- This avoids mixed use of logical IDs vs row UUIDs causing false “connected” states.

3. Tighten Agent Chat business scoping
- Refactor `AgentChatView.tsx` so connection state is keyed from the selected agent’s exact business identity, not just provider presence.
- Clear the connection map immediately when the selected agent changes, then reload for that business only.
- Ensure connect/disconnect actions always use the active agent’s business id.
- Handle cases where two businesses have the same display/agent name by preferring a stable business identifier instead of name matching alone.

4. Refresh status correctly after OAuth return
- In Agent Chat, add the same OAuth-return handling pattern used elsewhere so after a provider connects, the UI reloads status for the currently selected business/agent.
- Make sure the returned `brandId` in the URL is used to refresh only the matching business state, not a global provider state.

5. Verify the other integration surfaces stay business-scoped
- Review and lightly align these views so they all use the same exact-scoped status expectations:
  - `ConnectBusinessDNA.tsx`
  - `BusinessDataListView.tsx`
  - `EmployeeDetailView.tsx`
  - `SettingsDialog.tsx`
- Main goal: no screen should infer “connected” from another business’s connection.

6. Edge cases to cover
- Business A connected, Business B not connected -> B must still show “Connect”
- Same provider connected to two different businesses -> each business shows its own correct state
- Legacy unscoped rows -> they should not appear as connected for every business anymore
- Employee with linked business -> employee connections reflect only that linked business
- Agent chat selected agent switched quickly -> no stale status flash from previous agent

Technical notes
- Root cause appears to be in `supabase/functions/connect-provider/index.ts`:
  - `check-status` currently returns rows for `c.brand_id === resolvedBrandId || c.brand_id === null`
  - that makes legacy/unscoped connections appear connected across businesses
- Agent chat also relies on `selectedAgent` name matching:
```text
brands.find(b => (b.agentName || b.name || "AI CEO") === selectedAgent)
```
  This is fragile if names collide or stale state persists.
- Files most likely involved:
  - `supabase/functions/connect-provider/index.ts`
  - `src/components/database/AgentChatView.tsx`
  - `src/components/database/EmployeeDetailView.tsx`
  - `src/components/database/ConnectBusinessDNA.tsx`
  - `src/components/database/BusinessDataListView.tsx`
  - `src/components/database/SettingsDialog.tsx`

Expected outcome
- Integrations become truly business-level across the app.
- In Employees chat, the selected agent/business controls which integrations show connected.
- No business will incorrectly inherit another business’s connected state.
