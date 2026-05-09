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
  has_active_sub boolean;
BEGIN
  -- Ensure a row exists for this user (do not assume any plan)
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used, bonus_actions, status)
  VALUES (_user_id, 'co_founder', 0, 0, 'cancelled')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT plan, actions_used, COALESCE(bonus_actions, 0), status IN ('active','trialing','past_due')
  INTO current_plan, current_actions, current_bonus, has_active_sub
  FROM public.user_subscriptions
  WHERE user_id = _user_id
  LIMIT 1;

  current_actions := COALESCE(current_actions, 0);

  IF NOT has_active_sub THEN
    -- Free tier
    action_limit := 10;
  ELSIF current_plan = 'timewarp_og' THEN
    action_limit := 999999999;
  ELSIF current_plan = 'aristotle' THEN
    action_limit := 500;
  ELSIF current_plan = 'co_founder' THEN
    action_limit := 100;
  ELSE
    action_limit := 10;
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