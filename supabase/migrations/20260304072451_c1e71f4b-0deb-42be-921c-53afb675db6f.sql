
-- 1. Migrate existing admin members to editor
UPDATE workspace_members SET role = 'editor' WHERE role = 'admin';

-- 2. Helper: check if requesting user can view another user's data (same workspace)
CREATE OR REPLACE FUNCTION public.can_access_user_data(_requesting_user uuid, _data_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _requesting_user = _data_owner OR EXISTS (
    SELECT 1 FROM workspace_members wm1
    JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = _requesting_user AND wm2.user_id = _data_owner
    AND wm1.user_id != wm2.user_id
  )
$$;

-- 3. Helper: check if requesting user can edit another user's data (owner or editor in same workspace)
CREATE OR REPLACE FUNCTION public.can_edit_user_data(_requesting_user uuid, _data_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _requesting_user = _data_owner OR EXISTS (
    SELECT 1 FROM workspace_members wm1
    JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = _requesting_user AND wm2.user_id = _data_owner
    AND wm1.user_id != wm2.user_id
    AND wm1.role IN ('owner', 'editor')
  )
$$;

-- 4. Replace restrictive RLS on user_business_data with permissive role-based policies
DROP POLICY "Users manage own business data" ON user_business_data;

-- Anyone in same workspace can view (viewer, editor, owner)
CREATE POLICY "Users can view accessible data" ON user_business_data
FOR SELECT TO authenticated
USING (public.can_access_user_data(auth.uid(), user_id));

-- Only data owner can insert
CREATE POLICY "Users can insert own data" ON user_business_data
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Owner of data + editors in same workspace can update
CREATE POLICY "Users can update accessible data" ON user_business_data
FOR UPDATE TO authenticated
USING (public.can_edit_user_data(auth.uid(), user_id));

-- Only data owner can delete
CREATE POLICY "Users can delete own data" ON user_business_data
FOR DELETE TO authenticated
USING (user_id = auth.uid());
