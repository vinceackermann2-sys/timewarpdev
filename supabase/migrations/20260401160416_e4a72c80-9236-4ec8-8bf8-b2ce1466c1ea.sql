
CREATE TABLE public.agent_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_name TEXT,
  title TEXT NOT NULL DEFAULT 'New Chat',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_agent_chat_sessions_user_id ON public.agent_chat_sessions (user_id);
CREATE INDEX idx_agent_chat_sessions_workspace_id ON public.agent_chat_sessions (workspace_id);

CREATE POLICY "Users can view own or workspace chat sessions"
ON public.agent_chat_sessions FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
);

CREATE POLICY "Users can insert own chat sessions"
ON public.agent_chat_sessions FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  (workspace_id IS NULL OR is_workspace_member(auth.uid(), workspace_id))
);

CREATE POLICY "Users can update own chat sessions"
ON public.agent_chat_sessions FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  (workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = agent_chat_sessions.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'editor')
  ))
);

CREATE POLICY "Users can delete own chat sessions"
ON public.agent_chat_sessions FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR
  (workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = agent_chat_sessions.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'editor')
  ))
);
