CREATE OR REPLACE FUNCTION public.decrement_action(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_plan subscription_plan;
  current_actions int;
  current_bonus int;
  action_limit int;
BEGIN
  -- Ensure a subscription row exists
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used, bonus_actions, status)
  VALUES (p_user_id, 'co_founder', 0, 0, 'active')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT plan, actions_used, COALESCE(bonus_actions, 0)
  INTO current_plan, current_actions, current_bonus
  FROM public.user_subscriptions
  WHERE user_id = p_user_id
  LIMIT 1;

  current_actions := COALESCE(current_actions, 0);

  IF current_plan = 'timewarp_og' THEN
    action_limit := 999999999;
  ELSIF current_plan = 'aristotle' THEN
    action_limit := 1000;
  ELSIF current_plan = 'co_founder' THEN
    action_limit := 100;
  ELSE
    action_limit := 0;
  END IF;

  IF current_actions >= (action_limit + current_bonus) THEN
    RETURN false;
  END IF;

  UPDATE public.user_subscriptions
  SET actions_used = actions_used + 1, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;