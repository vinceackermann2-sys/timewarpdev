
-- Create a security definer function to get workspace members with emails
-- This safely exposes only email addresses for workspace co-members
CREATE OR REPLACE FUNCTION public.get_workspace_members(_workspace_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  role workspace_role,
  joined_at timestamptz,
  email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if the requesting user is a member of this workspace
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    wm.id,
    wm.user_id,
    wm.role,
    wm.joined_at,
    COALESCE(au.email, 'unknown') as email
  FROM public.workspace_members wm
  LEFT JOIN auth.users au ON au.id = wm.user_id
  WHERE wm.workspace_id = _workspace_id;
END;
$$;
