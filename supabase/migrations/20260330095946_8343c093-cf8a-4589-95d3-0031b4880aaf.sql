
-- Add brand_id column to user_connections to scope integrations per business
ALTER TABLE public.user_connections ADD COLUMN brand_id uuid REFERENCES public.user_business_data(id) ON DELETE SET NULL;

-- Drop the old unique constraint on (user_id, provider)
ALTER TABLE public.user_connections DROP CONSTRAINT IF EXISTS user_connections_user_id_provider_key;

-- Create new unique constraint allowing same provider per brand
ALTER TABLE public.user_connections ADD CONSTRAINT user_connections_user_id_provider_brand_key UNIQUE (user_id, provider, brand_id);
