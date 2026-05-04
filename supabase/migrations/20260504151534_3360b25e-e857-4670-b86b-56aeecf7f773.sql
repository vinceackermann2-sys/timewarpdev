ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS execution_mode text NOT NULL DEFAULT 'api';

ALTER TABLE public.ai_agents
  DROP CONSTRAINT IF EXISTS ai_agents_execution_mode_check;

ALTER TABLE public.ai_agents
  ADD CONSTRAINT ai_agents_execution_mode_check
  CHECK (execution_mode IN ('api', 'computer'));