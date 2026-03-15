
-- Platform config table for spots counter
CREATE TABLE public.platform_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Public can read
CREATE POLICY "Anyone can read config" ON public.platform_config
  FOR SELECT TO public USING (true);

-- No client writes
-- (no INSERT/UPDATE/DELETE policies = denied by default)

-- Insert initial spots counter
INSERT INTO public.platform_config (key, value) VALUES ('og_spots_remaining', '23');

-- Function to decrement spots (called server-side when OG subscription created)
CREATE OR REPLACE FUNCTION public.decrement_og_spots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.platform_config
  SET value = GREATEST(0, (value::int - 1))::text, updated_at = now()
  WHERE key = 'og_spots_remaining';
END;
$$;

-- Also update the free plan limit in increment_actions_used
CREATE OR REPLACE FUNCTION public.increment_actions_used(_user_id uuid)
RETURNS json
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
    action_limit := 0;
  END IF;

  IF current_actions >= (action_limit + current_bonus) THEN
    RETURN json_build_object('allowed', false, 'reason', 'Action limit reached for your plan. Upgrade for more.');
  END IF;

  UPDATE public.user_subscriptions
  SET actions_used = actions_used + 1, updated_at = now()
  WHERE user_id = _user_id;

  RETURN json_build_object('allowed', true, 'actions_used', current_actions + 1);
END;
$$;
