-- =========================================================
-- Workspace-scoped subscriptions
-- =========================================================
CREATE TABLE IF NOT EXISTS public.workspace_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE,
  plan public.subscription_plan,
  status public.subscription_status NOT NULL DEFAULT 'cancelled',
  billing_period public.billing_period NOT NULL DEFAULT 'monthly',
  actions_used integer NOT NULL DEFAULT 0,
  bonus_actions integer NOT NULL DEFAULT 0,
  data_used_bytes bigint NOT NULL DEFAULT 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_end timestamptz,
  source_user_id uuid,
  migrated_from_user boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_workspace ON public.workspace_subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_stripe_sub ON public.workspace_subscriptions(stripe_subscription_id);

ALTER TABLE public.workspace_subscriptions ENABLE ROW LEVEL SECURITY;

-- Any workspace member can read the plan
CREATE POLICY "Members can read workspace subscription"
  ON public.workspace_subscriptions FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Writes happen via edge functions (service role); no direct write policies for users.

CREATE TRIGGER trg_workspace_subscriptions_updated_at
  BEFORE UPDATE ON public.workspace_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- Helper: get the active plan for a workspace
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_workspace_plan(_workspace_id uuid)
RETURNS public.subscription_plan
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT plan FROM public.workspace_subscriptions
  WHERE workspace_id = _workspace_id
    AND status IN ('active','trialing','past_due')
  LIMIT 1
$$;

-- =========================================================
-- New: increment actions for a workspace (shared pool)
-- =========================================================
CREATE OR REPLACE FUNCTION public.increment_workspace_actions(_workspace_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_plan subscription_plan;
  current_actions int;
  current_bonus int;
  action_limit int;
  current_status subscription_status;
BEGIN
  -- Ensure a row exists
  INSERT INTO public.workspace_subscriptions (workspace_id, plan, status, actions_used, bonus_actions)
  VALUES (_workspace_id, NULL, 'cancelled', 0, 0)
  ON CONFLICT (workspace_id) DO NOTHING;

  SELECT plan, actions_used, COALESCE(bonus_actions,0), status
    INTO current_plan, current_actions, current_bonus, current_status
  FROM public.workspace_subscriptions
  WHERE workspace_id = _workspace_id
  LIMIT 1;

  current_actions := COALESCE(current_actions, 0);

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

  IF current_actions >= (action_limit + current_bonus) THEN
    RETURN json_build_object('allowed', false, 'reason',
      'Workspace action limit reached. Purchase more actions or upgrade the plan.');
  END IF;

  UPDATE public.workspace_subscriptions
    SET actions_used = actions_used + 1, updated_at = now()
    WHERE workspace_id = _workspace_id;

  RETURN json_build_object('allowed', true, 'actions_used', current_actions + 1);
END;
$$;

-- =========================================================
-- New: storage check for a workspace
-- =========================================================
CREATE OR REPLACE FUNCTION public.check_workspace_storage_limit(_workspace_id uuid, _additional_bytes bigint)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_plan subscription_plan;
  current_usage bigint;
  current_status subscription_status;
  max_bytes bigint;
BEGIN
  SELECT plan, data_used_bytes, status
    INTO current_plan, current_usage, current_status
  FROM public.workspace_subscriptions
  WHERE workspace_id = _workspace_id
  LIMIT 1;

  current_usage := COALESCE(current_usage, 0);

  IF current_status IS NULL OR current_status NOT IN ('active','trialing','past_due') OR current_plan IS NULL THEN
    max_bytes := 1073741824;
  ELSIF current_plan = 'co_founder' THEN
    max_bytes := 5368709120;
  ELSIF current_plan = 'aristotle' THEN
    max_bytes := 10737418240;
  ELSIF current_plan = 'timewarp_og' THEN
    max_bytes := 9999999999999;
  ELSE
    max_bytes := 1073741824;
  END IF;

  IF (current_usage + _additional_bytes) > max_bytes THEN
    RETURN json_build_object('allowed', false, 'current_usage', current_usage, 'limit', max_bytes,
      'reason','Workspace storage limit exceeded. Upgrade the plan for more space.');
  END IF;

  RETURN json_build_object('allowed', true, 'current_usage', current_usage, 'limit', max_bytes);
END;
$$;

-- =========================================================
-- Migration helper: claim the legacy user plan into a workspace
-- =========================================================
CREATE OR REPLACE FUNCTION public.claim_legacy_plan_into_workspace(_workspace_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  legacy record;
  is_owner boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = auth.uid() AND role = 'owner'
  ) INTO is_owner;

  IF NOT is_owner THEN
    RETURN json_build_object('error','Only the workspace owner can assign a plan to it.');
  END IF;

  SELECT * INTO legacy FROM public.user_subscriptions
  WHERE user_id = auth.uid()
    AND status IN ('active','trialing','past_due')
  ORDER BY updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error','No legacy plan to migrate.');
  END IF;

  -- Refuse to overwrite an existing active workspace plan
  IF EXISTS (
    SELECT 1 FROM public.workspace_subscriptions
    WHERE workspace_id = _workspace_id
      AND status IN ('active','trialing','past_due')
      AND plan IS NOT NULL
  ) THEN
    RETURN json_build_object('error','That workspace already has an active plan.');
  END IF;

  INSERT INTO public.workspace_subscriptions
    (workspace_id, plan, status, billing_period, actions_used, bonus_actions, data_used_bytes,
     source_user_id, migrated_from_user)
  VALUES
    (_workspace_id, legacy.plan, legacy.status, COALESCE(legacy.billing_period,'monthly'),
     COALESCE(legacy.actions_used,0), COALESCE(legacy.bonus_actions,0), COALESCE(legacy.data_used_bytes,0),
     auth.uid(), true)
  ON CONFLICT (workspace_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    billing_period = EXCLUDED.billing_period,
    actions_used = EXCLUDED.actions_used,
    bonus_actions = workspace_subscriptions.bonus_actions + EXCLUDED.bonus_actions,
    source_user_id = EXCLUDED.source_user_id,
    migrated_from_user = true,
    updated_at = now();

  -- Mark legacy row as migrated so we don't prompt again
  UPDATE public.user_subscriptions
    SET status = 'cancelled', updated_at = now()
    WHERE user_id = auth.uid();

  RETURN json_build_object('success', true, 'workspace_id', _workspace_id, 'plan', legacy.plan);
END;
$$;

-- =========================================================
-- Tell the client: does this user have a legacy plan still pending migration?
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_pending_plan_migration()
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  legacy record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('pending', false);
  END IF;

  SELECT plan, status, actions_used, bonus_actions INTO legacy
  FROM public.user_subscriptions
  WHERE user_id = auth.uid()
    AND status IN ('active','trialing','past_due')
    AND plan IS NOT NULL
  ORDER BY updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('pending', false);
  END IF;

  RETURN json_build_object(
    'pending', true,
    'plan', legacy.plan,
    'status', legacy.status,
    'actions_used', legacy.actions_used,
    'bonus_actions', legacy.bonus_actions
  );
END;
$$;