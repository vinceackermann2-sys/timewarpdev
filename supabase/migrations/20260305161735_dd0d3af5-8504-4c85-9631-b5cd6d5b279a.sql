
-- Drop old restrictive INSERT and DELETE policies
DROP POLICY IF EXISTS "Users can insert own data" ON public.user_business_data;
DROP POLICY IF EXISTS "Users can delete own data" ON public.user_business_data;

-- New INSERT policy: allow own data OR workspace member (owner/editor)
CREATE POLICY "Users can insert own or workspace data"
ON public.user_business_data
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    workspace_id IS NULL
    OR public.is_workspace_member(auth.uid(), workspace_id)
  )
);

-- New DELETE policy: allow own data OR workspace member (owner/editor)
CREATE POLICY "Users can delete own or workspace data"
ON public.user_business_data
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = user_business_data.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'editor')
    )
  )
);
