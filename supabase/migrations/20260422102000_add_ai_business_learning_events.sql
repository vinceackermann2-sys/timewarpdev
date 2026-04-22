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
    SELECT 1
    FROM pg_policies
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
