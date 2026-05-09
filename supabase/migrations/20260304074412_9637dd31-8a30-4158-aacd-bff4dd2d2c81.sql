
-- 1. Add workspace_id to user_business_data
ALTER TABLE public.user_business_data
ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 2. Backfill: set workspace_id to the owner's workspace
UPDATE public.user_business_data ubd
SET workspace_id = (
  SELECT wm.workspace_id FROM public.workspace_members wm
  WHERE wm.user_id = ubd.user_id AND wm.role = 'owner'
  LIMIT 1
)
WHERE ubd.workspace_id IS NULL;

-- 3. Update is_workspace_admin to only check 'owner' role
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = 'owner'
  )
$$;

-- 4. Update can_access_user_data to use workspace_id on user_business_data
CREATE OR REPLACE FUNCTION public.can_access_user_data(_requesting_user uuid, _data_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _requesting_user = _data_owner OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.user_business_data ubd ON ubd.workspace_id = wm.workspace_id
    WHERE wm.user_id = _requesting_user
      AND ubd.user_id = _data_owner
      AND wm.user_id != ubd.user_id
  )
$$;

-- 5. Update can_edit_user_data to use workspace_id
CREATE OR REPLACE FUNCTION public.can_edit_user_data(_requesting_user uuid, _data_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _requesting_user = _data_owner OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.user_business_data ubd ON ubd.workspace_id = wm.workspace_id
    WHERE wm.user_id = _requesting_user
      AND ubd.user_id = _data_owner
      AND wm.user_id != ubd.user_id
      AND wm.role IN ('owner', 'editor')
  )
$$;

-- 6. Add get_user_workspaces RPC
CREATE OR REPLACE FUNCTION public.get_user_workspaces(_user_id uuid)
RETURNS TABLE(
  workspace_id uuid,
  workspace_name text,
  role workspace_role,
  member_count bigint,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    w.id as workspace_id,
    w.name as workspace_name,
    wm.role,
    (SELECT COUNT(*) FROM public.workspace_members WHERE workspace_id = w.id) as member_count,
    w.created_at
  FROM public.workspace_members wm
  JOIN public.workspaces w ON w.id = wm.workspace_id
  WHERE wm.user_id = _user_id
  ORDER BY wm.role = 'owner' DESC, w.created_at ASC
$$;

-- 7. Drop old RLS policies on user_business_data and recreate with workspace_id awareness
DROP POLICY IF EXISTS "Users can view accessible data" ON public.user_business_data;
DROP POLICY IF EXISTS "Users can update accessible data" ON public.user_business_data;

-- SELECT: owner OR member of workspace linked to the data
CREATE POLICY "Users can view workspace data"
ON public.user_business_data
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(auth.uid(), workspace_id)
  )
);

-- UPDATE: owner OR editor/owner in the workspace
CREATE POLICY "Users can update workspace data"
ON public.user_business_data
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = user_business_data.workspace_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  )
);
