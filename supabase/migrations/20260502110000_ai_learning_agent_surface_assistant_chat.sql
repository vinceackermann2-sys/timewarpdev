-- Allow assistant-chat surface in learning events (unified edge function).
ALTER TABLE public.ai_business_learning_events
  DROP CONSTRAINT IF EXISTS ai_business_learning_events_agent_surface_check;

ALTER TABLE public.ai_business_learning_events
  ADD CONSTRAINT ai_business_learning_events_agent_surface_check
  CHECK (agent_surface IN ('run-employee', 'extension-agent', 'assistant-chat'));
