CREATE TABLE IF NOT EXISTS public.long_task_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NULL,
  business_id uuid NULL,
  continuation_key text NOT NULL,
  task_type text NOT NULL DEFAULT 'chat',
  status text NOT NULL DEFAULT 'queued',
  phase text NOT NULL DEFAULT 'queued',
  progress numeric(5,2) NOT NULL DEFAULT 0,
  logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_excerpt text NULL,
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (continuation_key)
);

CREATE TABLE IF NOT EXISTS public.long_task_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.long_task_runs(id) ON DELETE CASCADE,
  continuation_key text NOT NULL,
  continuation_index integer NOT NULL DEFAULT 0,
  content text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (continuation_key)
);

CREATE INDEX IF NOT EXISTS idx_long_task_runs_user_time
  ON public.long_task_runs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_long_task_runs_status
  ON public.long_task_runs (status, updated_at DESC);

ALTER TABLE public.long_task_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.long_task_checkpoints ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'long_task_runs'
      AND policyname = 'Users can view their own long task runs'
  ) THEN
    CREATE POLICY "Users can view their own long task runs"
      ON public.long_task_runs
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'long_task_checkpoints'
      AND policyname = 'Users can view their own long task checkpoints'
  ) THEN
    CREATE POLICY "Users can view their own long task checkpoints"
      ON public.long_task_checkpoints
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.long_task_runs r
          WHERE r.id = long_task_checkpoints.run_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;
END
$$;