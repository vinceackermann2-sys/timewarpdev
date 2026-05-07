CREATE INDEX IF NOT EXISTS idx_ubd_workspace_type_created
  ON public.user_business_data (workspace_id, data_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ubd_workspace_source
  ON public.user_business_data (workspace_id, source);

CREATE INDEX IF NOT EXISTS idx_ubd_user_type_created
  ON public.user_business_data (user_id, data_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ubd_workspace_analyzed
  ON public.user_business_data (workspace_id, is_analyzed);