-- Table to store Slack app installations per workspace
CREATE TABLE public.slack_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL UNIQUE,
  team_name TEXT,
  bot_token TEXT NOT NULL,
  bot_user_id TEXT,
  installed_by_user_id TEXT,
  installed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (service role only - tokens are sensitive)
ALTER TABLE public.slack_installations ENABLE ROW LEVEL SECURITY;

-- No public access - only service role can read/write
-- This is intentional for security

-- Index for fast lookup by team
CREATE INDEX idx_slack_installations_team ON public.slack_installations(team_id);