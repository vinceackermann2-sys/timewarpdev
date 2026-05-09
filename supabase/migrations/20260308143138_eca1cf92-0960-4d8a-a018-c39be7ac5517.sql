
-- Add bonus_actions column
ALTER TABLE public.user_subscriptions ADD COLUMN bonus_actions integer NOT NULL DEFAULT 0;

-- Update complete_referral to use bonus_actions
CREATE OR REPLACE FUNCTION public.complete_referral(_referral_code uuid, _referred_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ref RECORD;
BEGIN
  SELECT * INTO ref FROM public.referrals
  WHERE referral_code = _referral_code AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or already used referral');
  END IF;

  IF ref.referrer_id = _referred_user_id THEN
    RETURN json_build_object('error', 'Cannot refer yourself');
  END IF;

  UPDATE public.referrals
  SET status = 'completed', referred_user_id = _referred_user_id, completed_at = now(), actions_granted = true
  WHERE id = ref.id;

  -- Grant 125 bonus actions to referrer
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used, bonus_actions)
  VALUES (ref.referrer_id, 'co_founder', 0, 125)
  ON CONFLICT (user_id) DO UPDATE
  SET bonus_actions = user_subscriptions.bonus_actions + 125;

  -- Grant 125 bonus actions to referred user
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used, bonus_actions)
  VALUES (_referred_user_id, 'co_founder', 0, 125)
  ON CONFLICT (user_id) DO UPDATE
  SET bonus_actions = user_subscriptions.bonus_actions + 125;

  RETURN json_build_object('success', true);
END;
$function$;

-- Update increment_actions_used to factor in bonus_actions
CREATE OR REPLACE FUNCTION public.increment_actions_used(_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_plan subscription_plan;
  current_actions int;
  current_bonus int;
  action_limit int;
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used, bonus_actions, status)
  VALUES (_user_id, 'co_founder', 0, 0, 'active')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT plan, actions_used, COALESCE(bonus_actions, 0)
  INTO current_plan, current_actions, current_bonus
  FROM public.user_subscriptions
  WHERE user_id = _user_id
  LIMIT 1;

  current_actions := COALESCE(current_actions, 0);

  IF current_plan = 'timewarp_og' THEN
    action_limit := 999999999;
  ELSIF current_plan = 'aristotle' THEN
    action_limit := 1000;
  ELSIF current_plan = 'co_founder' THEN
    action_limit := 100;
  ELSE
    action_limit := 20;
  END IF;

  IF current_actions >= (action_limit + current_bonus) THEN
    RETURN json_build_object('allowed', false, 'reason', 'Action limit reached for your plan. Upgrade for more.');
  END IF;

  UPDATE public.user_subscriptions
  SET actions_used = actions_used + 1, updated_at = now()
  WHERE user_id = _user_id;

  RETURN json_build_object('allowed', true, 'actions_used', current_actions + 1);
END;
$function$;
