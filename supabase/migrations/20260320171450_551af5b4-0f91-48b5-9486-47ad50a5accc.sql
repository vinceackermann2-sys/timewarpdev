
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS actions integer NOT NULL DEFAULT 0;

DROP FUNCTION IF EXISTS public.decrement_action(uuid);

CREATE OR REPLACE FUNCTION public.decrement_action(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_actions int;
BEGIN
  SELECT actions INTO current_actions
  FROM public.user_subscriptions
  WHERE public.user_subscriptions.user_id = decrement_action.user_id;

  IF current_actions IS NULL OR current_actions <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.user_subscriptions
  SET actions = actions - 1
  WHERE public.user_subscriptions.user_id = decrement_action.user_id;

  RETURN true;
END;
$$;

NOTIFY pgrst, 'reload schema';
