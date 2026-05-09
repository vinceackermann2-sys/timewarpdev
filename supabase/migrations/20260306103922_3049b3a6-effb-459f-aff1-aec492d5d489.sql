
CREATE OR REPLACE FUNCTION public.increment_actions_used(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_plan subscription_plan;
  current_actions int;
  action_limit int;
BEGIN
  -- Ensure a subscription row exists
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used, status)
  VALUES (_user_id, 'co_founder', 0, 'active')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT plan, actions_used INTO current_plan, current_actions
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

  IF current_actions >= action_limit THEN
    RETURN json_build_object('allowed', false, 'reason', 'Action limit reached for your plan. Upgrade for more.');
  END IF;

  UPDATE public.user_subscriptions
  SET actions_used = actions_used + 1, updated_at = now()
  WHERE user_id = _user_id;

  RETURN json_build_object('allowed', true, 'actions_used', current_actions + 1);
END;
$$;
