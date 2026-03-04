
-- Update existing viewer roles
UPDATE public.workspace_members SET role = 'editor' WHERE role = 'viewer';
UPDATE public.workspace_invitations SET role = 'editor' WHERE role = 'viewer';

-- Drop ALL RLS policies referencing workspace_role
DROP POLICY IF EXISTS "Users can update workspace data" ON public.user_business_data;
DROP POLICY IF EXISTS "Admins can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view members" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.workspace_invitations;

-- Drop functions that depend on the old enum
DROP FUNCTION IF EXISTS public.has_workspace_role(uuid, uuid, workspace_role);
DROP FUNCTION IF EXISTS public.get_workspace_members(uuid);
DROP FUNCTION IF EXISTS public.get_user_workspaces(uuid);

-- Drop defaults
ALTER TABLE public.workspace_members ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.workspace_invitations ALTER COLUMN role DROP DEFAULT;

-- Swap enum
ALTER TYPE public.workspace_role RENAME TO workspace_role_old;
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'editor');
ALTER TABLE public.workspace_members ALTER COLUMN role TYPE public.workspace_role USING role::text::public.workspace_role;
ALTER TABLE public.workspace_invitations ALTER COLUMN role TYPE public.workspace_role USING role::text::public.workspace_role;

-- Restore defaults
ALTER TABLE public.workspace_members ALTER COLUMN role SET DEFAULT 'editor'::public.workspace_role;
ALTER TABLE public.workspace_invitations ALTER COLUMN role SET DEFAULT 'editor'::public.workspace_role;

DROP TYPE public.workspace_role_old;

-- Recreate functions
CREATE OR REPLACE FUNCTION public.has_workspace_role(_user_id uuid, _workspace_id uuid, _role workspace_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_members(_workspace_id uuid)
RETURNS TABLE(id uuid, user_id uuid, role workspace_role, joined_at timestamp with time zone, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if not public.is_workspace_member(auth.uid(), _workspace_id) then return; end if;
  return query
  select wm.id::uuid, wm.user_id::uuid, wm.role::workspace_role, wm.joined_at::timestamp with time zone,
    coalesce(au.email::text, 'unknown'::text) as email
  from public.workspace_members wm
  left join auth.users au on au.id = wm.user_id
  where wm.workspace_id = _workspace_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.get_user_workspaces(_user_id uuid)
RETURNS TABLE(workspace_id uuid, workspace_name text, role workspace_role, member_count bigint, created_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT w.id as workspace_id, w.name as workspace_name, wm.role,
    (SELECT COUNT(*) FROM public.workspace_members WHERE workspace_id = w.id) as member_count,
    w.created_at
  FROM public.workspace_members wm
  JOIN public.workspaces w ON w.id = wm.workspace_id
  WHERE wm.user_id = _user_id
  ORDER BY wm.role = 'owner' DESC, w.created_at ASC
$$;

-- Recreate all dropped policies
CREATE POLICY "Users can update workspace data" ON public.user_business_data
FOR UPDATE USING (
  (user_id = auth.uid()) OR (
    (workspace_id IS NOT NULL) AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = user_business_data.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner'::workspace_role, 'editor'::workspace_role)
    )
  )
);

CREATE POLICY "Members can view members" ON public.workspace_members
FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can add members" ON public.workspace_members
FOR INSERT WITH CHECK (
  is_workspace_admin(auth.uid(), workspace_id) OR (user_id = auth.uid() AND role = 'owner'::workspace_role)
);

CREATE POLICY "Admins can update members" ON public.workspace_members
FOR UPDATE USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can remove members" ON public.workspace_members
FOR DELETE USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Members can view invitations" ON public.workspace_invitations
FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can create invitations" ON public.workspace_invitations
FOR INSERT WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update invitations" ON public.workspace_invitations
FOR UPDATE USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete invitations" ON public.workspace_invitations
FOR DELETE USING (is_workspace_admin(auth.uid(), workspace_id));
