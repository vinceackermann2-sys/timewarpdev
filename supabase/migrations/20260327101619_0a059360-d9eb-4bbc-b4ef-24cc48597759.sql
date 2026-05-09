DROP TRIGGER IF EXISTS enforce_data_limit ON public.user_business_data;
DROP TRIGGER IF EXISTS enforce_data_limit_trigger ON public.user_business_data;
DROP TRIGGER IF EXISTS trg_enforce_data_limit ON public.user_business_data;
DROP FUNCTION IF EXISTS public.enforce_user_data_limit() CASCADE;