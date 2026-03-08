
-- Table to persist whiteboard chat histories per node, scoped by workspace
CREATE TABLE public.whiteboard_chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  chat_type text NOT NULL CHECK (chat_type IN ('research', 'action')),
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, node_id)
);

-- RLS
ALTER TABLE public.whiteboard_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or workspace chat history"
ON public.whiteboard_chat_history FOR SELECT
USING (
  user_id = auth.uid() OR 
  (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
);

CREATE POLICY "Users can insert own chat history"
ON public.whiteboard_chat_history FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND 
  (workspace_id IS NULL OR is_workspace_member(auth.uid(), workspace_id))
);

CREATE POLICY "Users can update own or workspace chat history"
ON public.whiteboard_chat_history FOR UPDATE
USING (
  user_id = auth.uid() OR 
  (workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = whiteboard_chat_history.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'editor')
  ))
);

CREATE POLICY "Users can delete own or workspace chat history"
ON public.whiteboard_chat_history FOR DELETE
USING (
  user_id = auth.uid() OR 
  (workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = whiteboard_chat_history.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'editor')
  ))
);
