
-- Fix: Convert RESTRICTIVE policies to PERMISSIVE on workspace_members
DROP POLICY IF EXISTS "Members can view members" ON public.workspace_members;
CREATE POLICY "Members can view members" ON public.workspace_members
FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Admins can add members" ON public.workspace_members;
CREATE POLICY "Admins can add members" ON public.workspace_members
FOR INSERT TO authenticated WITH CHECK (is_workspace_admin(auth.uid(), workspace_id) OR (user_id = auth.uid() AND role = 'owner'::workspace_role));

DROP POLICY IF EXISTS "Admins can update members" ON public.workspace_members;
CREATE POLICY "Admins can update members" ON public.workspace_members
FOR UPDATE TO authenticated USING (is_workspace_admin(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Admins can remove members" ON public.workspace_members;
CREATE POLICY "Admins can remove members" ON public.workspace_members
FOR DELETE TO authenticated USING (is_workspace_admin(auth.uid(), workspace_id));

-- Fix: Convert RESTRICTIVE policies to PERMISSIVE on workspace_invitations
DROP POLICY IF EXISTS "Members can view invitations" ON public.workspace_invitations;
CREATE POLICY "Members can view invitations" ON public.workspace_invitations
FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Admins can create invitations" ON public.workspace_invitations;
CREATE POLICY "Admins can create invitations" ON public.workspace_invitations
FOR INSERT TO authenticated WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Admins can update invitations" ON public.workspace_invitations;
CREATE POLICY "Admins can update invitations" ON public.workspace_invitations
FOR UPDATE TO authenticated USING (is_workspace_admin(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Admins can delete invitations" ON public.workspace_invitations;
CREATE POLICY "Admins can delete invitations" ON public.workspace_invitations
FOR DELETE TO authenticated USING (is_workspace_admin(auth.uid(), workspace_id));

-- Fix: Convert RESTRICTIVE policies to PERMISSIVE on workspaces
DROP POLICY IF EXISTS "Members can view workspace" ON public.workspaces;
CREATE POLICY "Members can view workspace" ON public.workspaces
FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), id));

DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces
FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Admins can update workspace" ON public.workspaces;
CREATE POLICY "Admins can update workspace" ON public.workspaces
FOR UPDATE TO authenticated USING (is_workspace_admin(auth.uid(), id));
