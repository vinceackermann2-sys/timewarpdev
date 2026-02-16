
-- Secure token storage for OAuth providers (service role access only)
CREATE TABLE public.user_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text,
  provider_user_id text,
  provider_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.user_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Deny all direct client access - tokens managed only via edge functions (service role)
CREATE POLICY "Deny all direct access" ON public.user_oauth_tokens
  FOR ALL USING (false);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_oauth_tokens_timestamp
  BEFORE UPDATE ON public.user_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_oauth_tokens_updated_at();
