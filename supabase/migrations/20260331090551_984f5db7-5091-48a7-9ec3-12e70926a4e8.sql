
-- Update accept_workspace_invitation to grant 125 bonus actions to both inviter and invited user
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(_token uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv RECORD;
  auto_ws_id UUID;
  current_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'Authentication required');
  END IF;

  SELECT * INTO inv
  FROM public.workspace_invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or expired invitation');
  END IF;

  SELECT lower(email) INTO current_email
  FROM auth.users
  WHERE id = auth.uid();

  IF current_email IS NULL OR current_email <> lower(inv.email) THEN
    RETURN json_build_object('error', 'This invitation is for a different email account');
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, auth.uid(), inv.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- Delete stale invitations for the same workspace+email to avoid unique constraint violation
  DELETE FROM public.workspace_invitations
  WHERE workspace_id = inv.workspace_id
    AND lower(email) = lower(inv.email)
    AND id != inv.id;

  UPDATE public.workspace_invitations
  SET status = 'accepted'
  WHERE id = inv.id;

  -- Grant 125 bonus actions to the invited user
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used, bonus_actions)
  VALUES (auth.uid(), 'co_founder', 0, 125)
  ON CONFLICT (user_id) DO UPDATE
  SET bonus_actions = user_subscriptions.bonus_actions + 125, updated_at = now();

  -- Grant 125 bonus actions to the inviter
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used, bonus_actions)
  VALUES (inv.invited_by, 'co_founder', 0, 125)
  ON CONFLICT (user_id) DO UPDATE
  SET bonus_actions = user_subscriptions.bonus_actions + 125, updated_at = now();

  SELECT w.id INTO auto_ws_id
  FROM public.workspaces w
  JOIN public.workspace_members wm ON wm.workspace_id = w.id
  WHERE w.created_by = auth.uid()
    AND w.id != inv.workspace_id
    AND (SELECT COUNT(*) FROM public.workspace_members WHERE workspace_id = w.id) = 1
  LIMIT 1;

  IF auto_ws_id IS NOT NULL THEN
    DELETE FROM public.workspace_members
    WHERE workspace_id = auto_ws_id AND user_id = auth.uid();

    DELETE FROM public.workspaces WHERE id = auto_ws_id;
  END IF;

  RETURN json_build_object('success', true, 'workspace_id', inv.workspace_id, 'actions_granted', 125);
END;
$function$;
