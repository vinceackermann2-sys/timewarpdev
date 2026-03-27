ALTER TABLE public.user_connections
  ADD CONSTRAINT user_connections_user_id_provider_key UNIQUE (user_id, provider);