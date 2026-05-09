-- User-editable session notes persisted with agent chat; injected into assistant context.
ALTER TABLE public.agent_chat_sessions
  ADD COLUMN IF NOT EXISTS assistant_memory text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.agent_chat_sessions.assistant_memory IS 'User-editable session memory for this chat thread; sent to edge agents as context.';
