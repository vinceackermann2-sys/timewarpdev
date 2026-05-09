-- ============================================================================
-- Per-(user, workspace) connectors and dashboards
-- ============================================================================

-- 1. user_connections: add workspace_id
ALTER TABLE public.user_connections
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- Backfill: assign to the user's oldest workspace
UPDATE public.user_connections uc
SET workspace_id = sub.ws_id
FROM (
  SELECT wm.user_id, MIN(wm.workspace_id::text)::uuid AS ws_id
  FROM public.workspace_members wm
  GROUP BY wm.user_id
) sub
WHERE uc.workspace_id IS NULL AND uc.user_id = sub.user_id;

-- Drop legacy unique constraint if it exists (user_id, provider) and replace
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='user_connections_user_id_provider_key'
  ) THEN
    EXECUTE 'ALTER TABLE public.user_connections DROP CONSTRAINT IF EXISTS user_connections_user_id_provider_key';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS user_connections_user_workspace_provider_key
  ON public.user_connections (user_id, COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), provider);

CREATE INDEX IF NOT EXISTS user_connections_workspace_idx
  ON public.user_connections (workspace_id);

-- 2. user_oauth_tokens: add workspace_id
ALTER TABLE public.user_oauth_tokens
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

UPDATE public.user_oauth_tokens uot
SET workspace_id = sub.ws_id
FROM (
  SELECT wm.user_id, MIN(wm.workspace_id::text)::uuid AS ws_id
  FROM public.workspace_members wm
  GROUP BY wm.user_id
) sub
WHERE uot.workspace_id IS NULL AND uot.user_id = sub.user_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='user_oauth_tokens_user_id_provider_key'
  ) THEN
    EXECUTE 'ALTER TABLE public.user_oauth_tokens DROP CONSTRAINT IF EXISTS user_oauth_tokens_user_id_provider_key';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS user_oauth_tokens_user_workspace_provider_key
  ON public.user_oauth_tokens (user_id, COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), provider);

CREATE INDEX IF NOT EXISTS user_oauth_tokens_workspace_idx
  ON public.user_oauth_tokens (workspace_id);

-- 3. dashboard_snapshots: add workspace_id (per-user dashboards inside a workspace)
ALTER TABLE public.dashboard_snapshots
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

UPDATE public.dashboard_snapshots ds
SET workspace_id = sub.ws_id
FROM (
  SELECT wm.user_id, MIN(wm.workspace_id::text)::uuid AS ws_id
  FROM public.workspace_members wm
  GROUP BY wm.user_id
) sub
WHERE ds.workspace_id IS NULL AND ds.user_id = sub.user_id;

CREATE INDEX IF NOT EXISTS dashboard_snapshots_user_ws_brand_idx
  ON public.dashboard_snapshots (user_id, workspace_id, brand_id);
