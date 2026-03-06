
-- Referrals table to track who referred whom
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_email text NOT NULL,
  referred_user_id uuid,
  referral_code uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  actions_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can see their own referrals
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

-- Users can create referrals
CREATE POLICY "Users can create referrals" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (referrer_id = auth.uid());

-- Security definer function to complete a referral and grant actions
CREATE OR REPLACE FUNCTION public.complete_referral(_referral_code uuid, _referred_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref RECORD;
  max_free_actions int := 250;
  current_actions int;
BEGIN
  SELECT * INTO ref FROM public.referrals
  WHERE referral_code = _referral_code AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or already used referral');
  END IF;

  -- Don't allow self-referral
  IF ref.referrer_id = _referred_user_id THEN
    RETURN json_build_object('error', 'Cannot refer yourself');
  END IF;

  -- Mark referral as completed
  UPDATE public.referrals
  SET status = 'completed', referred_user_id = _referred_user_id, completed_at = now(), actions_granted = true
  WHERE id = ref.id;

  -- Grant 125 actions to referrer (upsert into user_subscriptions)
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used)
  VALUES (ref.referrer_id, 'co_founder', -125)
  ON CONFLICT (user_id) DO UPDATE
  SET actions_used = GREATEST(0, user_subscriptions.actions_used - 125);

  -- Grant 125 actions to referred user
  INSERT INTO public.user_subscriptions (user_id, plan, actions_used)
  VALUES (_referred_user_id, 'co_founder', -125)
  ON CONFLICT (user_id) DO UPDATE
  SET actions_used = GREATEST(0, user_subscriptions.actions_used - 125);

  RETURN json_build_object('success', true);
END;
$$;

-- Function to increment actions used (called from edge functions)
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
  -- Get user's plan
  SELECT plan, actions_used INTO current_plan, current_actions
  FROM public.user_subscriptions
  WHERE user_id = _user_id AND status = 'active'
  LIMIT 1;

  -- If no subscription, check free limit
  IF current_plan IS NULL THEN
    current_actions := COALESCE(current_actions, 0);
    IF current_actions >= 20 THEN
      RETURN json_build_object('allowed', false, 'reason', 'Free action limit reached. Upgrade for more.');
    END IF;
    -- No subscription row yet, we'll just allow (edge function handles the case)
    RETURN json_build_object('allowed', true, 'actions_used', current_actions + 1);
  END IF;

  -- Determine limit based on plan
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

  -- Increment
  UPDATE public.user_subscriptions
  SET actions_used = actions_used + 1, updated_at = now()
  WHERE user_id = _user_id AND status = 'active';

  RETURN json_build_object('allowed', true, 'actions_used', current_actions + 1);
END;
$$;

-- Add unique constraint on user_id for user_subscriptions to support upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END$$;
