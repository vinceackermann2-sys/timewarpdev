
-- Fix workspace_invitations: drop RESTRICTIVE policies, recreate as PERMISSIVE
DROP POLICY IF EXISTS "Members can view invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.workspace_invitations;

CREATE POLICY "Members can view invitations" ON public.workspace_invitations FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins can create invitations" ON public.workspace_invitations FOR INSERT WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admins can update invitations" ON public.workspace_invitations FOR UPDATE USING (is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admins can delete invitations" ON public.workspace_invitations FOR DELETE USING (is_workspace_admin(auth.uid(), workspace_id));

-- Fix workspace_members: drop RESTRICTIVE policies, recreate as PERMISSIVE
DROP POLICY IF EXISTS "Members can view members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.workspace_members;

CREATE POLICY "Members can view members" ON public.workspace_members FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins can add members" ON public.workspace_members FOR INSERT WITH CHECK (is_workspace_admin(auth.uid(), workspace_id) OR (user_id = auth.uid() AND role = 'owner'));
CREATE POLICY "Admins can update members" ON public.workspace_members FOR UPDATE USING (is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admins can remove members" ON public.workspace_members FOR DELETE USING (is_workspace_admin(auth.uid(), workspace_id));

-- Fix workspaces: drop RESTRICTIVE policies, recreate as PERMISSIVE
DROP POLICY IF EXISTS "Members can view workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Admins can update workspace" ON public.workspaces;

CREATE POLICY "Members can view workspace" ON public.workspaces FOR SELECT USING (is_workspace_member(auth.uid(), id));
CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins can update workspace" ON public.workspaces FOR UPDATE USING (is_workspace_admin(auth.uid(), id));

-- Fix user_business_data: drop RESTRICTIVE policies, recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can insert own data" ON public.user_business_data;
DROP POLICY IF EXISTS "Users can delete own data" ON public.user_business_data;
DROP POLICY IF EXISTS "Users can view workspace data" ON public.user_business_data;
DROP POLICY IF EXISTS "Users can update workspace data" ON public.user_business_data;

CREATE POLICY "Users can insert own data" ON public.user_business_data FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own data" ON public.user_business_data FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Users can view workspace data" ON public.user_business_data FOR SELECT USING (
  user_id = auth.uid() OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
);
CREATE POLICY "Users can update workspace data" ON public.user_business_data FOR UPDATE USING (
  user_id = auth.uid() OR (workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = user_business_data.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'editor')
  ))
);

-- Fix user_connections: drop RESTRICTIVE, recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users manage own connections" ON public.user_connections;
CREATE POLICY "Users manage own connections" ON public.user_connections FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Fix timewarp_chats: drop RESTRICTIVE, recreate as PERMISSIVE
DROP POLICY IF EXISTS "own chats" ON public.timewarp_chats;
CREATE POLICY "own chats" ON public.timewarp_chats FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
