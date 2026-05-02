-- Per-user per-workspace assistant memory (cross-session), plus aggregate view for team context.
CREATE TABLE IF NOT EXISTS public.assistant_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces (id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  source text NOT NULL DEFAULT 'assistant',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assistant_memory_user_workspace_key UNIQUE (user_id, workspace_id, key)
);

CREATE INDEX IF NOT EXISTS assistant_memory_workspace_idx ON public.assistant_memory (workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS assistant_memory_user_ws_idx ON public.assistant_memory (user_id, workspace_id, updated_at DESC);

CREATE OR REPLACE VIEW public.workspace_memory_aggregate AS
SELECT
  workspace_id,
  key,
  value,
  category,
  source,
  updated_at,
  user_id
FROM public.assistant_memory
WHERE workspace_id IS NOT NULL;

COMMENT ON TABLE public.assistant_memory IS 'Cross-session KV memory for the assistant; workspace_id null = personal non-workspace scope.';

ALTER TABLE public.assistant_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assistant_memory_select"
  ON public.assistant_memory FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = assistant_memory.workspace_id
          AND wm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "assistant_memory_insert"
  ON public.assistant_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "assistant_memory_update"
  ON public.assistant_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "assistant_memory_delete"
  ON public.assistant_memory FOR DELETE
  USING (auth.uid() = user_id);
