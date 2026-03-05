
-- Drop all existing restrictive policies on user_business_data
DROP POLICY IF EXISTS "Users can view workspace data" ON public.user_business_data;
DROP POLICY IF EXISTS "Users can insert own data" ON public.user_business_data;
DROP POLICY IF EXISTS "Users can update workspace data" ON public.user_business_data;
DROP POLICY IF EXISTS "Users can delete own data" ON public.user_business_data;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Users can view workspace data"
ON public.user_business_data
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid())
  OR (
    workspace_id IS NOT NULL
    AND is_workspace_member(auth.uid(), workspace_id)
  )
);

CREATE POLICY "Users can insert own data"
ON public.user_business_data
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update workspace data"
ON public.user_business_data
FOR UPDATE
TO authenticated
USING (
  (user_id = auth.uid())
  OR (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = user_business_data.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'editor')
    )
  )
);

CREATE POLICY "Users can delete own data"
ON public.user_business_data
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
