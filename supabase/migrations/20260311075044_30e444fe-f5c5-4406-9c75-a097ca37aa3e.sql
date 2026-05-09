
CREATE OR REPLACE FUNCTION public.enforce_user_data_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  total_size BIGINT;
  max_size BIGINT;
  user_plan subscription_plan;
  rows_to_delete UUID[];
BEGIN
  -- Look up user's plan
  SELECT plan INTO user_plan
  FROM public.user_subscriptions
  WHERE user_id = NEW.user_id AND status = 'active'
  LIMIT 1;

  -- Set limit based on plan
  IF user_plan = 'timewarp_og' THEN
    -- Unlimited for OG users
    RETURN NEW;
  ELSIF user_plan = 'aristotle' THEN
    max_size := 10737418240; -- 10GB
  ELSIF user_plan = 'co_founder' THEN
    max_size := 5368709120; -- 5GB
  ELSE
    max_size := 1073741824; -- 1GB (free / no subscription)
  END IF;

  -- Estimate total content size for this user
  SELECT COALESCE(SUM(
    COALESCE(LENGTH(content), 0) + 
    COALESCE(LENGTH(analyzed_content), 0) + 
    COALESCE(LENGTH(title), 0) +
    COALESCE(LENGTH(file_path), 0) +
    COALESCE(LENGTH(metadata::text), 0)
  ), 0) INTO total_size
  FROM user_business_data
  WHERE user_id = NEW.user_id;

  -- If over limit, delete oldest entries until under
  IF total_size > max_size THEN
    WITH ranked AS (
      SELECT id, 
        SUM(COALESCE(LENGTH(content), 0) + COALESCE(LENGTH(analyzed_content), 0) + COALESCE(LENGTH(title), 0)) 
          OVER (ORDER BY created_at ASC) as running_total
      FROM user_business_data
      WHERE user_id = NEW.user_id
      ORDER BY created_at ASC
    )
    SELECT ARRAY_AGG(id) INTO rows_to_delete
    FROM ranked
    WHERE running_total <= (total_size - max_size + 1048576);

    IF rows_to_delete IS NOT NULL AND array_length(rows_to_delete, 1) > 0 THEN
      DELETE FROM user_business_data WHERE id = ANY(rows_to_delete);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on user_business_data
DROP TRIGGER IF EXISTS trg_enforce_data_limit ON public.user_business_data;
CREATE TRIGGER trg_enforce_data_limit
  BEFORE INSERT ON public.user_business_data
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_data_limit();
