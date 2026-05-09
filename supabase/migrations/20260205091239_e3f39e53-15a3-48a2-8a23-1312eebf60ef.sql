-- Table to link Slack users to app users
CREATE TABLE public.slack_user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slack_user_id TEXT NOT NULL,
  slack_team_id TEXT NOT NULL,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(slack_user_id, slack_team_id)
);

-- Enable RLS
ALTER TABLE public.slack_user_links ENABLE ROW LEVEL SECURITY;

-- Users can view their own links
CREATE POLICY "Users can view their own slack links"
ON public.slack_user_links
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete their own links
CREATE POLICY "Users can delete their own slack links"
ON public.slack_user_links
FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookup by Slack user
CREATE INDEX idx_slack_user_links_slack_user ON public.slack_user_links(slack_user_id, slack_team_id);