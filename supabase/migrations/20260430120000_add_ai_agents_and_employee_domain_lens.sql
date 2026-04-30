-- =============================================================================
-- ai_agents — pure-executor automations (per the new /app architecture).
-- One trigger, one SOP, one job. Supervised by an Employee.
-- =============================================================================
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  linked_business_id UUID REFERENCES public.user_business_data(id) ON DELETE SET NULL,
  -- Agents always report to one Employee that owns the broader domain.  When
  -- the employee is deleted we keep the agent but null the supervisor so the
  -- user can re-assign it.
  supervisor_employee_id UUID REFERENCES public.ai_employees(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | active | paused

  -- ── Trigger ──────────────────────────────────────────────────────────────
  -- type determines which of the source / condition / schedule columns matter.
  --   manual     → user clicks "Run now" (no source/condition/schedule)
  --   event      → source + condition (e.g., source="slack", condition="new message in #product-feedback")
  --   schedule   → schedule (cron-ish string, e.g., "daily at 9am")
  --   threshold  → source + condition (e.g., source="stripe", condition="MRR drops > 5% w/w")
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_source TEXT,
  trigger_condition TEXT,
  trigger_schedule TEXT,
  -- Which integrations the agent NEEDS connected to actually run.
  required_integrations JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- ── SOP ──────────────────────────────────────────────────────────────────
  -- sop_steps is an ordered list of { label, detail } objects (atomic + testable).
  sop_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  sop_output TEXT,

  -- ── Safety boundary ──────────────────────────────────────────────────────
  -- Hard whitelists/blacklists. Both are JSONB string arrays.
  safety_can_do JSONB NOT NULL DEFAULT '[]'::jsonb,
  safety_cannot_do JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Free-text instruction for what to do if SOP encounters something
  -- outside its boundary (typically: notify the supervising employee).
  safety_escalation_path TEXT,

  -- ── Runtime tracking ─────────────────────────────────────────────────────
  last_run_at TIMESTAMPTZ,
  run_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ai_agents_status_check CHECK (status IN ('draft','active','paused')),
  CONSTRAINT ai_agents_trigger_type_check CHECK (trigger_type IN ('manual','event','schedule','threshold'))
);

CREATE INDEX ai_agents_user_idx ON public.ai_agents (user_id);
CREATE INDEX ai_agents_workspace_idx ON public.ai_agents (workspace_id);
CREATE INDEX ai_agents_supervisor_idx ON public.ai_agents (supervisor_employee_id);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or workspace agents"
  ON public.ai_agents FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid())
    OR ((workspace_id IS NOT NULL) AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can insert own agents"
  ON public.ai_agents FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid())
    AND ((workspace_id IS NULL) OR is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can update own or workspace agents"
  ON public.ai_agents FOR UPDATE TO authenticated
  USING (
    (user_id = auth.uid())
    OR (
      (workspace_id IS NOT NULL)
      AND EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = ai_agents.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role = ANY (ARRAY['owner'::workspace_role, 'editor'::workspace_role])
      )
    )
  );

CREATE POLICY "Users can delete own or workspace agents"
  ON public.ai_agents FOR DELETE TO authenticated
  USING (
    (user_id = auth.uid())
    OR (
      (workspace_id IS NOT NULL)
      AND EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = ai_agents.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role = ANY (ARRAY['owner'::workspace_role, 'editor'::workspace_role])
      )
    )
  );

-- =============================================================================
-- ai_agent_runs — execution history for each agent (one row per run).
-- Mirrors the ai_employee_logs pattern.
-- =============================================================================
CREATE TABLE public.ai_agent_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'running', -- running | success | failure | escalated
  trigger_kind TEXT NOT NULL DEFAULT 'manual',
  step_label TEXT,
  message TEXT,
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,

  CONSTRAINT ai_agent_runs_status_check CHECK (status IN ('running','success','failure','escalated'))
);

CREATE INDEX ai_agent_runs_agent_idx ON public.ai_agent_runs (agent_id, started_at DESC);
CREATE INDEX ai_agent_runs_user_idx ON public.ai_agent_runs (user_id);

ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent runs"
  ON public.ai_agent_runs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own agent runs"
  ON public.ai_agent_runs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own agent runs"
  ON public.ai_agent_runs FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- Domain Lens columns on ai_employees (per the new spec: every Employee has a
-- "filter through which they see everything").  These are additive — nothing
-- in the existing data is invalidated.
-- =============================================================================
ALTER TABLE public.ai_employees
  ADD COLUMN IF NOT EXISTS domain_lens TEXT,
  ADD COLUMN IF NOT EXISTS owns JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS advises_on JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS does_not_touch JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Free-text description of what activates this employee for review/strategy
  -- sessions (different from agent triggers, which are mechanical).
  ADD COLUMN IF NOT EXISTS triggers TEXT;

-- Touch-update trigger to keep updated_at fresh on ai_agents.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS ai_agents_set_updated_at ON public.ai_agents;
CREATE TRIGGER ai_agents_set_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
