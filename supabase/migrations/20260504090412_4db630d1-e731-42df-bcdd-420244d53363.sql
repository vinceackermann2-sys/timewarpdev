-- 1. Switch action columns to numeric so we can store fractional actions
ALTER TABLE public.workspace_subscriptions
  ALTER COLUMN actions_used TYPE numeric(12,4) USING actions_used::numeric,
  ALTER COLUMN bonus_actions TYPE numeric(12,4) USING bonus_actions::numeric;

ALTER TABLE public.user_subscriptions
  ALTER COLUMN actions_used TYPE numeric(12,4) USING actions_used::numeric,
  ALTER COLUMN bonus_actions TYPE numeric(12,4) USING bonus_actions::numeric;

-- 2. Cost-based workspace action consumer.
--    1 action == $0.08 of AI/API cost. Default keeps legacy 1-action behavior.
--    Allows the call that crosses zero to proceed (so streaming never fails mid-message),
--    but blocks any new call once balance is already <= 0.
CREATE OR REPLACE FUNCTION public.increment_workspace_actions(
  _workspace_id uuid,
  _cost_usd numeric DEFAULT 0.08
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_plan subscription_plan;
  current_actions numeric;
  current_bonus numeric;
  action_limit numeric;
  current_status subscription_status;
  consumed numeric;
  remaining numeric;
BEGIN
  -- Ensure a row exists
  INSERT INTO public.workspace_subscriptions (workspace_id, plan, status, actions_used, bonus_actions)
  VALUES (_workspace_id, NULL, 'cancelled', 0, 0)
  ON CONFLICT (workspace_id) DO NOTHING;

  SELECT plan, COALESCE(actions_used, 0), COALESCE(bonus_actions, 0), status
    INTO current_plan, current_actions, current_bonus, current_status
  FROM public.workspace_subscriptions
  WHERE workspace_id = _workspace_id
  LIMIT 1;

  IF current_status NOT IN ('active','trialing','past_due') OR current_plan IS NULL THEN
    action_limit := 100; -- free tier
  ELSIF current_plan = 'timewarp_og' THEN
    action_limit := 999999999;
  ELSIF current_plan = 'aristotle' THEN
    action_limit := 500;
  ELSIF current_plan = 'co_founder' THEN
    action_limit := 100;
  ELSE
    action_limit := 100;
  END IF;

  remaining := (action_limit + current_bonus) - current_actions;

  -- Block if already out of actions; allow current call even if it would push slightly negative
  IF remaining <= 0 THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'Workspace action limit reached. Purchase more actions or upgrade the plan.',
      'remaining', remaining
    );
  END IF;

  consumed := GREATEST(COALESCE(_cost_usd, 0.08), 0) / 0.08;

  UPDATE public.workspace_subscriptions
    SET actions_used = COALESCE(actions_used, 0) + consumed,
        updated_at = now()
    WHERE workspace_id = _workspace_id;

  RETURN json_build_object(
    'allowed', true,
    'actions_used', current_actions + consumed,
    'consumed', consumed,
    'cost_usd', COALESCE(_cost_usd, 0.08)
  );
END;
$function$;

-- 3. Same treatment for the legacy per-user counter.
CREATE OR REPLACE FUNCTION public.increment_actions_used(
  _user_id uuid,
  _cost_usd numeric DEFAULT 0.08
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_plan subscription_plan;
  current_actions numeric;
  current_bonus numeric;
  action_limit numeric;
  has_active_sub boolean;
  consumed numeric;
  remaining numeric;
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used, bonus_actions, status)
  VALUES (_user_id, 'co_founder', 0, 0, 'cancelled')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT plan, COALESCE(actions_used, 0), COALESCE(bonus_actions, 0),
         status IN ('active','trialing','past_due')
    INTO current_plan, current_actions, current_bonus, has_active_sub
  FROM public.user_subscriptions
  WHERE user_id = _user_id
  LIMIT 1;

  IF NOT has_active_sub THEN
    action_limit := 100;
  ELSIF current_plan = 'timewarp_og' THEN
    action_limit := 999999999;
  ELSIF current_plan = 'aristotle' THEN
    action_limit := 500;
  ELSIF current_plan = 'co_founder' THEN
    action_limit := 100;
  ELSE
    action_limit := 100;
  END IF;

  remaining := (action_limit + current_bonus) - current_actions;

  IF remaining <= 0 THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'Action limit reached. Purchase more actions to continue.',
      'remaining', remaining
    );
  END IF;

  consumed := GREATEST(COALESCE(_cost_usd, 0.08), 0) / 0.08;

  UPDATE public.user_subscriptions
    SET actions_used = COALESCE(actions_used, 0) + consumed,
        updated_at = now()
    WHERE user_id = _user_id;

  RETURN json_build_object(
    'allowed', true,
    'actions_used', current_actions + consumed,
    'consumed', consumed,
    'cost_usd', COALESCE(_cost_usd, 0.08)
  );
END;
$function$;