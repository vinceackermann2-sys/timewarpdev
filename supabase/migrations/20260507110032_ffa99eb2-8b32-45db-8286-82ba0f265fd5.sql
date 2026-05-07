CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(_token uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv record;
BEGIN
  SELECT * INTO inv FROM public.workspace_invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invitation not found, expired, or already used');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = inv.workspace_id AND user_id = auth.uid()
  ) THEN
    UPDATE public.workspace_invitations SET status = 'accepted' WHERE id = inv.id;
    RETURN json_build_object('success', true, 'workspace_id', inv.workspace_id, 'already_member', true);
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, auth.uid(), inv.role);

  UPDATE public.workspace_invitations SET status = 'accepted'
  WHERE id = inv.id;

  -- Grant 20 bonus actions to the invited user
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used, bonus_actions)
  VALUES (auth.uid(), 'co_founder', 0, 20)
  ON CONFLICT (user_id) DO UPDATE
  SET bonus_actions = user_subscriptions.bonus_actions + 20, updated_at = now();

  -- Grant 20 bonus actions to the inviter
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used, bonus_actions)
  VALUES (inv.invited_by, 'co_founder', 0, 20)
  ON CONFLICT (user_id) DO UPDATE
  SET bonus_actions = user_subscriptions.bonus_actions + 20, updated_at = now();

  -- NOTE: We previously auto-deleted any solo workspace owned by the
  -- accepting user. That destroyed real personal workspaces (with brands,
  -- chats, employees etc.) whenever someone accepted an invite. Removed.

  RETURN json_build_object('success', true, 'workspace_id', inv.workspace_id, 'actions_granted', 20);
END;
$function$;