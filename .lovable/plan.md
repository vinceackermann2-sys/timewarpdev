

## Plan: Restructure Workspace System

### Current State
- Each user gets one auto-created workspace
- Businesses (`user_business_data`) are tied to `user_id`, not to a workspace
- `useWorkspace` hook picks a single workspace and loads members
- WorkspaceDialog is a simple modal for inviting members

### New Architecture

**Core concept**: Workspaces become the primary organizational unit. Businesses belong to workspaces. Users can own multiple workspaces and be members of others.

---

### Database Changes (Migration)

1. **Add `workspace_id` to `user_business_data`**
   - Nullable FK to `workspaces.id` (nullable for backward compat with existing data)
   - Backfill existing rows: set `workspace_id` to the owner's workspace

2. **Update RLS on `user_business_data`**
   - SELECT: owner OR member of the same workspace (via `workspace_id`)
   - UPDATE: owner OR editor/owner role in the workspace
   - INSERT/DELETE: only the data owner

3. **Update `is_workspace_admin`** to only check `owner` role (no more `admin`)

4. **Allow users to create multiple workspaces** (already possible, just need UI)

5. **Add a `get_user_workspaces` RPC** that returns all workspaces a user belongs to, with their role

---

### Frontend Changes

#### 1. Update `useWorkspace` hook → support multiple workspaces
- New state: `workspaces` (list of all user's workspaces with role)
- `activeWorkspaceId` with setter
- Load businesses per workspace

#### 2. New Workspace List View (replaces current MyBusinessesView top-level)
- Shows all workspaces the user belongs to (owned + shared)
- Each workspace card shows name, role badge (Owner/Editor/Viewer), member count
- "Create Workspace" button for all users
- Clicking a workspace enters it → shows businesses inside

#### 3. Inside a Workspace View
- Shows businesses belonging to that workspace
- Owner can: add businesses, invite members, manage team, rename workspace
- Editor can: edit businesses
- Viewer can: view businesses only
- "Add Business" creates business linked to this workspace
- Team management integrated (current WorkspaceDialog content)

#### 4. Update WorkspaceDialog → Workspace Settings Panel
- Accessible inside a workspace
- Shows members, invite form, pending invitations
- Only visible to workspace owner

#### 5. "Shared with me" logic
- Workspaces where user's role is NOT `owner` automatically appear as "shared"
- Businesses inside those workspaces are visible based on role

#### 6. Prevent copying others' businesses
- When inside a shared workspace, "Add Business" is hidden for non-owners
- Members cannot delete businesses they don't own

---

### File Changes Summary

| File | Change |
|------|--------|
| Migration SQL | Add `workspace_id` to `user_business_data`, backfill, update RLS, add `get_user_workspaces` RPC |
| `src/hooks/useWorkspace.ts` | Return list of workspaces, active workspace selector |
| `src/components/database/MyBusinessesView.tsx` | Restructure into workspace list → workspace detail flow |
| `src/components/database/WorkspaceDialog.tsx` | Refine for in-workspace team management, owner-only controls |
| `src/pages/Database.tsx` | Add workspace selection state, pass active workspace down |
| `src/components/database/AddProductURLView.tsx` | Pass `workspace_id` when creating business data |
| `src/components/database/BusinessDNAContext.tsx` | Filter by `workspace_id` when loading data |

---

### User Flow

```text
User logs in → /app
  ├── Workspace List (all workspaces)
  │   ├── "My Workspace" (owner) → click → see businesses + manage team
  │   ├── "Client Project" (owner) → click → see businesses + manage team
  │   └── "Agency Workspace" (editor) → click → see businesses (edit allowed)
  │
  └── [+ Create Workspace] button → name input → creates new empty workspace
```

