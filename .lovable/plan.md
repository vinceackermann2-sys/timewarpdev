

## Problem

Two issues prevent smooth multi-member workspace collaboration:

1. **Research and Generation chat ignore workspace context**: The `research-chat` and `action-chat` edge functions fetch business data using only the calling user's `user_id`. Team members in a shared workspace see AI responses grounded only in their own (likely empty) data, not the shared workspace data.

2. **Team members cannot insert shared data**: The `user_business_data` INSERT RLS policy only allows `user_id = auth.uid()`, so team members cannot create new brands, products, audiences, or canvas nodes in a shared workspace.

3. **Team members cannot delete shared data**: The DELETE policy also only allows `user_id = auth.uid()`.

## Plan

### 1. Update edge functions to accept and use `workspaceId`

**Files**: `supabase/functions/research-chat/index.ts`, `supabase/functions/action-chat/index.ts`

- Accept an optional `workspaceId` field from the request body
- When `workspaceId` is provided, fetch business data scoped to that workspace (using service role, so RLS is bypassed) instead of by `user_id` only
- Verify the calling user is actually a member of the workspace before serving data (security check via `workspace_members` table)
- Fallback to user-only data when no `workspaceId` is provided

The `fetchUserBusinessContext` function changes from:
```sql
.eq("user_id", userId)
```
to also supporting:
```sql
.eq("workspace_id", workspaceId)
```

### 2. Pass `workspaceId` from frontend chat callers

**Files**: `src/components/database/DatabaseView.tsx`, `src/components/database/dataconversion/ResearchChatNode.tsx`, `src/components/database/dataconversion/ActionChatNode.tsx`

- Read `preferred_workspace_id` from localStorage
- Include `workspaceId` in the request body sent to the edge functions

### 3. Update RLS policies for INSERT and DELETE on `user_business_data`

**Database migration**:

- **INSERT**: Allow if `user_id = auth.uid()` OR if the user is a workspace member (owner/editor) of the target `workspace_id`
- **DELETE**: Allow if `user_id = auth.uid()` OR if the user is a workspace owner/editor for the record's `workspace_id`

### 4. Allow team members to save entities in BusinessDNAContext

**File**: `src/components/database/BusinessDNAContext.tsx`

- In `saveEntity`, when a workspace member creates data, set `user_id` to the current user's ID (satisfying the updated INSERT policy) while keeping `workspace_id` set correctly for sharing

This ensures all workspace members can create, read, update, and delete shared business data, and that the AI chat functions are grounded in the full shared workspace context.

