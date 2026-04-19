-- Dashboard snapshots: persisted "last session" view of cards per user+brand
-- Used by the Delta Layer to compute New / Escalated / Resolved / Unchanged states
CREATE TABLE public.dashboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  -- A compact map: { "<cardId>": { "priority": "High|Medium|Low", "tab": "Briefing|Updates|To-Dos|Objectives" } }
  cards jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Persisted opening summary + health score so we can re-render without re-fetching
  opening_summary text,
  health_score jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dashboard_snapshots_unique UNIQUE (user_id, brand_id)
);

ALTER TABLE public.dashboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can only see, insert, update, delete their own snapshots
CREATE POLICY "Users can view own snapshots"
  ON public.dashboard_snapshots
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own snapshots"
  ON public.dashboard_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own snapshots"
  ON public.dashboard_snapshots
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own snapshots"
  ON public.dashboard_snapshots
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX dashboard_snapshots_user_brand_idx
  ON public.dashboard_snapshots (user_id, brand_id);

-- Auto-update updated_at on row change
CREATE TRIGGER dashboard_snapshots_set_updated_at
  BEFORE UPDATE ON public.dashboard_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_oauth_tokens_updated_at();