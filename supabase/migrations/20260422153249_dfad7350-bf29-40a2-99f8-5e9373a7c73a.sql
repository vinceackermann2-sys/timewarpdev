CREATE TABLE IF NOT EXISTS public.ai_business_learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NULL,
  business_id uuid NULL,
  employee_id uuid NULL,
  agent_surface text NOT NULL CHECK (agent_surface IN ('run-employee', 'extension-agent')),
  mode text NOT NULL CHECK (mode IN ('chat', 'browser')),
  recommendation_type text NOT NULL DEFAULT 'strategy',
  dna_alignment_score numeric(4,3) NOT NULL DEFAULT 0.500,
  user_message text NOT NULL DEFAULT '',
  assistant_response_excerpt text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_learning_events_user_time
  ON public.ai_business_learning_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_learning_events_business_time
  ON public.ai_business_learning_events (business_id, created_at DESC);

ALTER TABLE public.ai_business_learning_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_business_learning_events'
      AND policyname = 'Users can view their own AI learning events'
  ) THEN
    CREATE POLICY "Users can view their own AI learning events"
      ON public.ai_business_learning_events
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.dashboard_card_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NULL,
  business_id uuid NULL,
  card_id text NOT NULL,
  tab text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('shown', 'opened', 'dismissed', 'completed', 'snoozed', 'clicked', 'promoted')),
  source text NULL,
  category text NULL,
  priority text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_card_events_user_time
  ON public.dashboard_card_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_card_events_business_time
  ON public.dashboard_card_events (business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dashboard_objective_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NULL,
  business_id uuid NULL,
  objective_id text NOT NULL,
  metric_name text NOT NULL,
  current_value numeric NULL,
  target_value numeric NULL,
  delta_value numeric NULL,
  source text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_objective_outcomes_business_time
  ON public.dashboard_objective_outcomes (business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.business_learning_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NULL,
  business_id uuid NOT NULL,
  source_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  category_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  tab_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id)
);

ALTER TABLE public.dashboard_card_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_objective_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_learning_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'dashboard_card_events'
      AND policyname = 'Users can read their own dashboard card events'
  ) THEN
    CREATE POLICY "Users can read their own dashboard card events"
      ON public.dashboard_card_events
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'dashboard_objective_outcomes'
      AND policyname = 'Users can read their own dashboard objective outcomes'
  ) THEN
    CREATE POLICY "Users can read their own dashboard objective outcomes"
      ON public.dashboard_objective_outcomes
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'business_learning_state'
      AND policyname = 'Users can read their own business learning state'
  ) THEN
    CREATE POLICY "Users can read their own business learning state"
      ON public.business_learning_state
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END;
$$;