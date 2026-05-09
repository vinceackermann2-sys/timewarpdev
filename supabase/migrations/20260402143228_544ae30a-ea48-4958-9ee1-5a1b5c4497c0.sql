
-- Update complete_referral to grant 20 instead of 125
CREATE OR REPLACE FUNCTION public.complete_referral(_referral_code uuid, _referred_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ref record;
BEGIN
  SELECT * INTO ref FROM public.referrals
  WHERE referral_code = _referral_code AND status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or already used referral code');
  END IF;

  IF ref.referrer_id = _referred_user_id THEN
    RETURN json_build_object('error', 'You cannot refer yourself');
  END IF;

  UPDATE public.referrals
  SET status = 'completed', referred_user_id = _referred_user_id, completed_at = now(), actions_granted = true
  WHERE id = ref.id;

  -- Grant 20 bonus actions to referrer
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used, bonus_actions)
  VALUES (ref.referrer_id, 'co_founder', 0, 20)
  ON CONFLICT (user_id) DO UPDATE
  SET bonus_actions = user_subscriptions.bonus_actions + 20;

  -- Grant 20 bonus actions to referred user
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used, bonus_actions)
  VALUES (_referred_user_id, 'co_founder', 0, 20)
  ON CONFLICT (user_id) DO UPDATE
  SET bonus_actions = user_subscriptions.bonus_actions + 20;

  RETURN json_build_object('success', true);
END;
$function$;

-- Update accept_workspace_invitation to grant 20 instead of 125
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(_token uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv record;
  auto_ws_id uuid;
  auto_member_count int;
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

  SELECT w.id INTO auto_ws_id
  FROM public.workspaces w
  JOIN public.workspace_members wm ON wm.workspace_id = w.id
  WHERE w.created_by = auth.uid()
    AND w.id != inv.workspace_id
  GROUP BY w.id
  HAVING COUNT(wm.id) = 1
  LIMIT 1;

  IF auto_ws_id IS NOT NULL THEN
    DELETE FROM public.workspace_members WHERE workspace_id = auto_ws_id AND user_id = auth.uid();
    DELETE FROM public.workspaces WHERE id = auto_ws_id;
  END IF;

  RETURN json_build_object('success', true, 'workspace_id', inv.workspace_id, 'actions_granted', 20);
END;
$function$;
