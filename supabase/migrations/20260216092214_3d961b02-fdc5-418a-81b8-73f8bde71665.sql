
-- Add unique constraint for upsert support on user_connections
ALTER TABLE public.user_connections ADD CONSTRAINT user_connections_user_provider_unique UNIQUE (user_id, provider);
