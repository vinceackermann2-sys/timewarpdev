-- Allow workspace owners to delete their workspaces
CREATE POLICY "Owners can delete workspace"
ON public.workspaces
FOR DELETE
TO authenticated
USING (public.is_workspace_admin(auth.uid(), id));