
-- Function to enforce 3GB (3,221,225,472 bytes) per-user limit on user_business_data
-- Deletes oldest rows until total estimated size is under limit
CREATE OR REPLACE FUNCTION public.enforce_user_data_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  total_size BIGINT;
  max_size BIGINT := 3221225472; -- 3GB in bytes
  rows_to_delete UUID[];
BEGIN
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
    WHERE running_total <= (total_size - max_size + 1048576); -- prune until 1MB under limit

    IF rows_to_delete IS NOT NULL AND array_length(rows_to_delete, 1) > 0 THEN
      DELETE FROM user_business_data WHERE id = ANY(rows_to_delete);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger after insert to auto-prune
CREATE TRIGGER enforce_data_limit_trigger
AFTER INSERT ON public.user_business_data
FOR EACH ROW
EXECUTE FUNCTION public.enforce_user_data_limit();
