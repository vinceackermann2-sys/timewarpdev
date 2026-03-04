
-- Create plan enum
CREATE TYPE public.subscription_plan AS ENUM ('co_founder', 'aristotle', 'timewarp_og');

-- Create billing period enum
CREATE TYPE public.billing_period AS ENUM ('monthly', 'quarterly', 'annually');

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing');

-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan subscription_plan NOT NULL,
  billing_period billing_period NOT NULL DEFAULT 'monthly',
  status subscription_status NOT NULL DEFAULT 'active',
  actions_used INTEGER NOT NULL DEFAULT 0,
  data_used_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own subscription (for actions_used tracking)
CREATE POLICY "Users can update own subscription"
  ON public.user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role / triggers handle inserts
CREATE POLICY "Users can insert own subscription"
  ON public.user_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Helper function to get user plan
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id UUID)
RETURNS subscription_plan
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT plan FROM public.user_subscriptions
  WHERE user_id = _user_id AND status = 'active'
  LIMIT 1
$$;
