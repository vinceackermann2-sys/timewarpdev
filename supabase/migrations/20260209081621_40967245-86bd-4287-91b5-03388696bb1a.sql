
-- Create table for Microsoft workspace connections
CREATE TABLE public.microsoft_workspace_connections (
  user_id TEXT NOT NULL PRIMARY KEY,
  connected BOOLEAN NOT NULL DEFAULT false,
  oauth_state TEXT,
  oauth_state_expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT,
  last_connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.microsoft_workspace_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own microsoft connection"
ON public.microsoft_workspace_connections FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own microsoft connection"
ON public.microsoft_workspace_connections FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own microsoft connection"
ON public.microsoft_workspace_connections FOR UPDATE
USING (auth.uid()::text = user_id);

-- Create table for Microsoft tokens
CREATE TABLE public.microsoft_workspace_tokens (
  user_id TEXT NOT NULL PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.microsoft_workspace_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies (service role only for tokens - no user direct access)
CREATE POLICY "Users can view their own microsoft tokens"
ON public.microsoft_workspace_tokens FOR SELECT
USING (auth.uid()::text = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_microsoft_workspace_connections_updated_at
BEFORE UPDATE ON public.microsoft_workspace_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_microsoft_workspace_tokens_updated_at
BEFORE UPDATE ON public.microsoft_workspace_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
