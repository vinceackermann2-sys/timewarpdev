
-- Function to update data_used_bytes when files are added/removed
-- Recalculates from actual data in user_business_data
CREATE OR REPLACE FUNCTION public.recalculate_data_usage(_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total bigint;
BEGIN
  SELECT COALESCE(SUM(
    COALESCE(LENGTH(content), 0) + 
    COALESCE(LENGTH(analyzed_content), 0) + 
    COALESCE(LENGTH(title), 0) +
    COALESCE((metadata->>'file_size')::bigint, 0)
  ), 0)
  INTO total
  FROM public.user_business_data
  WHERE user_id = _user_id;

  UPDATE public.user_subscriptions
  SET data_used_bytes = total, updated_at = now()
  WHERE user_id = _user_id;

  RETURN total;
END;
$$;

-- Function to check if user can store more data
CREATE OR REPLACE FUNCTION public.check_storage_limit(_user_id uuid, _additional_bytes bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_plan subscription_plan;
  current_usage bigint;
  max_bytes bigint;
BEGIN
  SELECT plan, data_used_bytes INTO current_plan, current_usage
  FROM public.user_subscriptions
  WHERE user_id = _user_id AND status IN ('active', 'trialing', 'past_due')
  LIMIT 1;

  IF current_plan IS NULL THEN
    -- Free user: 1GB limit
    max_bytes := 1073741824;
    current_usage := COALESCE(current_usage, 0);
  ELSIF current_plan = 'co_founder' THEN
    max_bytes := 5368709120;
  ELSIF current_plan = 'aristotle' THEN
    max_bytes := 10737418240;
  ELSIF current_plan = 'timewarp_og' THEN
    max_bytes := 9999999999999;
  ELSE
    max_bytes := 1073741824;
  END IF;

  current_usage := COALESCE(current_usage, 0);

  IF (current_usage + _additional_bytes) > max_bytes THEN
    RETURN json_build_object(
      'allowed', false,
      'current_usage', current_usage,
      'limit', max_bytes,
      'reason', 'Storage limit exceeded. Upgrade your plan for more space.'
    );
  END IF;

  RETURN json_build_object('allowed', true, 'current_usage', current_usage, 'limit', max_bytes);
END;
$$;

-- Trigger to auto-recalculate on insert/delete
CREATE OR REPLACE FUNCTION public.trigger_recalculate_data_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_data_usage(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalculate_data_usage(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_data_usage ON public.user_business_data;
CREATE TRIGGER trg_recalculate_data_usage
AFTER INSERT OR DELETE ON public.user_business_data
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_data_usage();
