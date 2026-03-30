

## Plan: Replace Employees View with New Chat-Based Agent UI

### What Changes

The current **Employees** sidebar view (grid of AI employee cards with create wizard) will be replaced with a new full-page chat interface from the uploaded zip. This new view features:

- A large animated orb in the center
- Agent selector dropdown (top-right)
- Rich chat input with file uploads, @mention URL references, employee tagging
- Action mode toggle (Computer use ON/OFF)
- Settings modal with tabs: Your Agent, Safety, Employees, Connections

### Implementation Steps

**1. Add orb CSS styles to `src/index.css`**
- Add the CSS variables (orb colors, trails), keyframes (`pulse-slow`, `edge-rotate`), and orb component classes from the zip's `index.css`

**2. Create new component `src/components/database/AgentChatView.tsx`**
- Port the full `App` component from the zip into this new component
- Adapt it to work within the existing app:
  - Use existing `lucide-react` icons (already available)
  - Connect employees state to the existing Supabase `ai_employees` table instead of hardcoded data
  - Use `useAuth` and `useWorkspace` hooks for user context
  - Keep the Orb as an inline sub-component
  - Integrate with existing `run-employee` edge function for actual AI chat functionality
  - Use existing `BusinessBrainOrb` or the new Orb component for the orb display

**3. Update `src/pages/Database.tsx`**
- Replace `<EmployeesView />` with `<AgentChatView />`
- Remove the `RestrictedFeatureGate` wrapper (or keep it, depending on preference)
- Update the import

**4. Keep existing employee CRUD**
- The new settings modal has an "Employees" tab with inline employee management (add/edit/delete)
- This replaces the separate `CreateEmployeeWizard` and `EmployeeDetailView` flows
- Employee data will still be stored in and loaded from the `ai_employees` table

### Files Modified
- `src/index.css` — add orb CSS
- `src/components/database/AgentChatView.tsx` — new file (main component)
- `src/pages/Database.tsx` — swap EmployeesView for AgentChatView

### Files Kept (no changes)
- `src/components/database/EmployeesView.tsx` — kept for reference but no longer rendered
- All existing edge functions and Supabase tables remain unchanged

### Technical Notes
- The zip uses Tailwind v4 syntax (`@import "tailwindcss"`) but the project uses v3 — CSS will be adapted accordingly
- The zip uses hardcoded employee data; the implementation will use Supabase queries
- The contentEditable chat input with @mention support will be preserved as-is from the zip
- The agent selector (Paul Ackermann, etc.) will be connected to actual user data or kept as a UI shell for now

