

## Plan: Remove Workspace Page, Keep as Dialog Only

### Problem
Currently, `MyBusinessesView` has a full workspace list/gallery page (lines 88-168) that users land on before seeing businesses. The user wants the workspace to only be accessible as a popup dialog from the sidebar menu — not as a page within Business DNA.

### Changes

#### 1. `MyBusinessesView.tsx` — Remove workspace list page
- Remove the `if (!activeWorkspaceId)` workspace gallery view (lines 88-168) and the `WorkspaceCard` component
- Auto-select the user's first workspace on mount (prefer owned, then shared)
- The component always shows the "inside workspace" view directly with businesses
- Add a workspace switcher dropdown in the header (small select/dropdown showing workspace name) so users can switch between workspaces without leaving the page
- For owners: show businesses + "Add Business" card + "Manage" button opens `WorkspaceDialog`
- For editors: show businesses (editable), no "Add Business", no "Manage"
- For viewers: show businesses (view-only), no "Add Business", no "Manage"

#### 2. `WorkspaceDialog.tsx` — Enhance for full workspace management
- Add a workspace list/selector at the top of the dialog showing all workspaces with roles
- Add "Create Workspace" button inside the dialog
- When a workspace is selected, show its members, invitations, and invite form (owner only)
- Non-owners see member list in read-only mode
- This dialog is triggered from the sidebar user dropdown menu (already wired)

#### 3. `useWorkspace.ts` — Auto-select workspace
- On load, if no `activeWorkspaceId` is set, auto-select the first owned workspace (or first available)
- Remove the ability to set `activeWorkspaceId` to `null` (always have one selected)

#### 4. `DatabaseSidebar.tsx` — No changes needed
- Already has "Workspace" in user dropdown that opens `WorkspaceDialog`

### User Flow After Changes

```text
User clicks "Business DNA" in sidebar
  → Sees businesses in their active workspace directly (no workspace list page)
  → Workspace name shown in header with dropdown to switch
  → Owner sees "Add Business" + "Manage" button
  → Editor sees businesses only (can edit)
  → Viewer sees businesses only (view-only)

User clicks "Workspace" in sidebar user menu
  → Dialog opens showing all workspaces with roles
  → Can create new workspace
  → Can select workspace to see/manage members
  → Owner can invite, change roles, remove members
  → Non-owner sees members read-only
```

