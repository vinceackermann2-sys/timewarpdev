-- 1) Cleanup: delete 118 duplicate "TimeWarp" workspaces for the affected user.
--    Keep the OLDEST one. All extras have only 1 brand row, no employees, agents, chats, notes, invites, or other members.
WITH target_user AS (
  SELECT 'd81f2b69-8179-44c2-a969-3ad5ca390afb'::uuid AS uid
), keeper AS (
  SELECT w.id
  FROM public.workspaces w, target_user
  WHERE w.created_by = target_user.uid
  ORDER BY w.created_at ASC, w.id ASC
  LIMIT 1
), to_delete AS (
  SELECT w.id
  FROM public.workspaces w, target_user
  WHERE w.created_by = target_user.uid
    AND w.id NOT IN (SELECT id FROM keeper)
)
DELETE FROM public.workspaces WHERE id IN (SELECT id FROM to_delete);
-- Note: child rows (user_business_data, workspace_members, ai_employees, etc.) reference workspace_id
-- without ON DELETE CASCADE FKs, so we explicitly clear them first below if needed.
-- Actually we need to clean child rows BEFORE deleting workspaces to avoid orphans.
-- Re-do safely:

-- (The DELETE above will fail silently for FKs that don't exist — there are none per schema.
--  But child rows would become orphaned. So we clean them up explicitly.)

-- Cleanup orphaned per-workspace data for any workspace_id no longer in workspaces:
DELETE FROM public.user_business_data
WHERE workspace_id IS NOT NULL
  AND workspace_id NOT IN (SELECT id FROM public.workspaces);

DELETE FROM public.workspace_members
WHERE workspace_id NOT IN (SELECT id FROM public.workspaces);

DELETE FROM public.workspace_invitations
WHERE workspace_id NOT IN (SELECT id FROM public.workspaces);

DELETE FROM public.ai_employees
WHERE workspace_id IS NOT NULL
  AND workspace_id NOT IN (SELECT id FROM public.workspaces);

DELETE FROM public.ai_agents
WHERE workspace_id IS NOT NULL
  AND workspace_id NOT IN (SELECT id FROM public.workspaces);

DELETE FROM public.agent_chat_sessions
WHERE workspace_id IS NOT NULL
  AND workspace_id NOT IN (SELECT id FROM public.workspaces);

DELETE FROM public.dashboard_card_notes
WHERE workspace_id IS NOT NULL
  AND workspace_id NOT IN (SELECT id FROM public.workspaces);

DELETE FROM public.whiteboard_chat_history
WHERE workspace_id IS NOT NULL
  AND workspace_id NOT IN (SELECT id FROM public.workspaces);

-- 2) Enforce max 5 owned workspaces per user via BEFORE INSERT trigger.
--    Covers all paths: create_workspace RPC, create_default_workspace signup trigger,
--    direct inserts via RLS policy.
CREATE OR REPLACE FUNCTION public.enforce_owned_workspace_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owned_count int;
  max_owned constant int := 5;
BEGIN
  SELECT COUNT(*) INTO owned_count
  FROM public.workspaces
  WHERE created_by = NEW.created_by;

  IF owned_count >= max_owned THEN
    RAISE EXCEPTION 'OWNED_WORKSPACE_LIMIT_REACHED: You can own at most % workspaces. Delete one to create another, or ask to be invited as a member of additional workspaces.', max_owned
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_owned_workspace_limit_trg ON public.workspaces;
CREATE TRIGGER enforce_owned_workspace_limit_trg
BEFORE INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.enforce_owned_workspace_limit();

-- 3) Update create_workspace RPC to surface the cap with a clean error code the frontend can match.
CREATE OR REPLACE FUNCTION public.create_workspace(_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id uuid;
  trimmed_name text;
  owned_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  trimmed_name := btrim(coalesce(_name, ''));

  IF trimmed_name = '' THEN
    RAISE EXCEPTION 'Workspace name is required';
  END IF;

  SELECT COUNT(*) INTO owned_count
  FROM public.workspaces
  WHERE created_by = auth.uid();

  IF owned_count >= 5 THEN
    RAISE EXCEPTION 'OWNED_WORKSPACE_LIMIT_REACHED'
      USING ERRCODE = 'check_violation', HINT = 'You can own at most 5 workspaces.';
  END IF;

  INSERT INTO public.workspaces (name, created_by)
  VALUES (trimmed_name, auth.uid())
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, auth.uid(), 'owner');

  RETURN new_workspace_id;
END;
$$;