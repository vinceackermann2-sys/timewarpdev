-- Persist active assistant goal per chat session (resume after refresh / question pause).
ALTER TABLE public.agent_chat_sessions
  ADD COLUMN IF NOT EXISTS goal_state jsonb;

COMMENT ON COLUMN public.agent_chat_sessions.goal_state IS
  'Structured goal for goal-driven assistant: id, type, summary, status, requiresConclusion, dataTier, createdAt. Cleared when completed.';
