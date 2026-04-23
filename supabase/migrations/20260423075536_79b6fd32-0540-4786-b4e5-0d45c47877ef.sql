-- Create dashboard_card_notes table for sticky notes on dashboard cards
-- Notes are visible to all workspace members and show who authored them.
CREATE TABLE public.dashboard_card_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  workspace_id UUID NULL,
  author_email TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'yellow',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_dashboard_card_notes_card ON public.dashboard_card_notes(card_id, workspace_id);
CREATE INDEX idx_dashboard_card_notes_user ON public.dashboard_card_notes(user_id);

ALTER TABLE public.dashboard_card_notes ENABLE ROW LEVEL SECURITY;

-- View: own notes OR notes in a workspace the user is a member of
CREATE POLICY "Users can view own or workspace card notes"
ON public.dashboard_card_notes
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
);

-- Insert: must be the author and (no workspace OR workspace member)
CREATE POLICY "Users can insert own card notes"
ON public.dashboard_card_notes
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id))
);

-- Update: only the original author can edit their note
CREATE POLICY "Users can update own card notes"
ON public.dashboard_card_notes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Delete: only the original author can delete their note
CREATE POLICY "Users can delete own card notes"
ON public.dashboard_card_notes
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Auto-update updated_at on edits
CREATE TRIGGER update_dashboard_card_notes_updated_at
BEFORE UPDATE ON public.dashboard_card_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_oauth_tokens_updated_at();