CREATE OR REPLACE FUNCTION public.get_user_workspaces(_user_id uuid)
 RETURNS TABLE(workspace_id uuid, workspace_name text, role workspace_role, member_count bigint, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH direct_memberships AS (
    SELECT
      w.id AS workspace_id,
      w.name AS workspace_name,
      wm.role,
      (SELECT COUNT(*) FROM public.workspace_members WHERE workspace_members.workspace_id = w.id) AS member_count,
      w.created_at
    FROM public.workspace_members wm
    JOIN public.workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = _user_id
  ),
  owned_missing_memberships AS (
    SELECT
      w.id AS workspace_id,
      w.name AS workspace_name,
      'owner'::public.workspace_role AS role,
      (SELECT COUNT(*) FROM public.workspace_members WHERE workspace_members.workspace_id = w.id) AS member_count,
      w.created_at
    FROM public.workspaces w
    WHERE w.created_by = _user_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.workspace_id = w.id
          AND wm.user_id = _user_id
      )
  )
  SELECT
    workspace_id,
    workspace_name,
    role,
    GREATEST(member_count, 1)::bigint AS member_count,
    created_at
  FROM (
    SELECT * FROM direct_memberships
    UNION ALL
    SELECT * FROM owned_missing_memberships
  ) all_workspaces
  ORDER BY role = 'owner' DESC, created_at ASC
$function$;

CREATE OR REPLACE FUNCTION public.ensure_workspace_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS ensure_workspace_owner_membership_trigger ON public.workspaces;
CREATE TRIGGER ensure_workspace_owner_membership_trigger
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.ensure_workspace_owner_membership();

INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, w.created_by, 'owner'::public.workspace_role
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1
  FROM public.workspace_members wm
  WHERE wm.workspace_id = w.id
    AND wm.user_id = w.created_by
)
ON CONFLICT DO NOTHING;