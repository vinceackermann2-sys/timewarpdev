
-- Drop the brand-scoped unique constraint (causes NULL != NULL issues)
ALTER TABLE public.user_connections DROP CONSTRAINT IF EXISTS user_connections_user_id_provider_brand_key;

-- Fix existing disconnected rows that have tokens (set them to connected)
UPDATE public.user_connections uc
SET status = 'connected'
WHERE uc.status = 'disconnected'
  AND EXISTS (
    SELECT 1 FROM public.user_oauth_tokens t
    WHERE t.user_id = uc.user_id AND t.provider = uc.provider
  );
