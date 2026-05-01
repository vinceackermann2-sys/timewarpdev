-- Replace expression unique indexes with real composite unique constraints
DROP INDEX IF EXISTS public.user_connections_user_workspace_provider_key;
DROP INDEX IF EXISTS public.user_oauth_tokens_user_workspace_provider_key;

-- Where workspace_id is still null after backfill (users with no workspace yet),
-- assign a sentinel of their own user_id wouldn't be valid. We require workspace_id
-- going forward; rows missing it are treated as legacy/global.
CREATE UNIQUE INDEX IF NOT EXISTS user_connections_uwp_unique
  ON public.user_connections (user_id, workspace_id, provider)
  WHERE workspace_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_connections_up_unique_legacy
  ON public.user_connections (user_id, provider)
  WHERE workspace_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_oauth_tokens_uwp_unique
  ON public.user_oauth_tokens (user_id, workspace_id, provider)
  WHERE workspace_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_oauth_tokens_up_unique_legacy
  ON public.user_oauth_tokens (user_id, provider)
  WHERE workspace_id IS NULL;
