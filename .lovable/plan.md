

## Workspaces Page

### What we're building
A new full-page route (`/workspaces`) that displays all user workspaces in a clean table layout (matching the screenshot reference), with the app's existing theme and footer. The "See all workspaces" button in the sidebar will navigate to this page instead of opening the WorkspaceDialog.

### Design
- Page header: "Workspaces" title + "Manage your workspaces and team members." subtitle
- Table with columns: Workspace (icon + name + description), Your Role (badge), Actions (count), and a "Manage →" link
- "+ New workspace" button in the table header area
- Clicking "Manage →" opens the WorkspaceDialog for that specific workspace
- The `WorkspaceFooter` from MyBusinessesView is reused at the bottom
- Matches existing app styling (card borders, muted backgrounds, badges)

### Changes

1. **Create `src/pages/Workspaces.tsx`**
   - Fetch workspaces via `useWorkspace()` hook
   - Render header, table of workspaces with role badges, action counts, and manage links
   - Include `WorkspaceDialog` for managing individual workspaces
   - Include "+ New workspace" button with inline name input
   - Reuse the `WorkspaceFooter` component (extract it to a shared location or import from MyBusinessesView)

2. **Extract `WorkspaceFooter` to shared component**
   - Move `WorkspaceFooter` from `MyBusinessesView.tsx` into its own file `src/components/database/WorkspaceFooter.tsx`
   - Import it in both `MyBusinessesView` and the new `Workspaces` page

3. **Update `src/App.tsx`**
   - Add route: `/workspaces` → `<Workspaces />`

4. **Update `src/components/database/DatabaseSidebar.tsx`**
   - Change "See all workspaces" button from opening `WorkspaceDialog` to navigating to `/workspaces` via `useNavigate()`

