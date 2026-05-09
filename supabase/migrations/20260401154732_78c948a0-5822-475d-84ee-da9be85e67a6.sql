CREATE INDEX IF NOT EXISTS idx_user_business_data_user_id ON public.user_business_data (user_id);
CREATE INDEX IF NOT EXISTS idx_user_business_data_workspace_id ON public.user_business_data (workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_business_data_type_source ON public.user_business_data (data_type, source);
CREATE INDEX IF NOT EXISTS idx_user_business_data_workspace_type ON public.user_business_data (workspace_id, data_type, source);