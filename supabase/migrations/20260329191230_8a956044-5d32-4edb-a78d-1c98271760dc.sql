
DROP POLICY "Admins can add members" ON public.workspace_members;

CREATE POLICY "Admins can add members"
  ON public.workspace_members FOR INSERT
  TO public
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));
