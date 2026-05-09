ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS slack_bot_username text,
  ADD COLUMN IF NOT EXISTS slack_bot_icon_url text,
  ADD COLUMN IF NOT EXISTS slack_bot_icon_emoji text,
  ADD COLUMN IF NOT EXISTS slack_default_channel text;