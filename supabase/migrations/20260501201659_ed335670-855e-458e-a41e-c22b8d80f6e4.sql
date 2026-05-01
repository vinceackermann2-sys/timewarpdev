
CREATE OR REPLACE FUNCTION public.create_workspace(_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_workspace_id uuid;
  trimmed_name text;
  owned_count int;
  has_paid boolean;
  max_owned int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  trimmed_name := btrim(coalesce(_name, ''));

  IF trimmed_name = '' THEN
    RAISE EXCEPTION 'Workspace name is required';
  END IF;

  SELECT COUNT(*) INTO owned_count
  FROM public.workspaces
  WHERE created_by = auth.uid();

  -- Determine if user has any paid (active/trialing/past_due) plan, either
  -- on their legacy user_subscriptions row OR on any workspace they own.
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = auth.uid()
      AND status IN ('active','trialing','past_due')
      AND plan IS NOT NULL
  ) OR EXISTS (
    SELECT 1
    FROM public.workspace_subscriptions ws
    JOIN public.workspaces w ON w.id = ws.workspace_id
    WHERE w.created_by = auth.uid()
      AND ws.status IN ('active','trialing','past_due')
      AND ws.plan IS NOT NULL
  ) INTO has_paid;

  IF has_paid THEN
    max_owned := 5;
  ELSE
    -- Free users get default workspace + 1 additional = 2 owned max.
    max_owned := 2;
  END IF;

  IF owned_count >= max_owned THEN
    RAISE EXCEPTION 'OWNED_WORKSPACE_LIMIT_REACHED'
      USING ERRCODE = 'check_violation',
            HINT = 'You can own at most ' || max_owned || ' workspaces on your current plan. Upgrade to create more, or join additional workspaces by invitation.';
  END IF;

  INSERT INTO public.workspaces (name, created_by)
  VALUES (trimmed_name, auth.uid())
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, auth.uid(), 'owner');

  RETURN new_workspace_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_owned_workspace_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  owned_count int;
  has_paid boolean;
  max_owned int;
BEGIN
  SELECT COUNT(*) INTO owned_count
  FROM public.workspaces
  WHERE created_by = NEW.created_by;

  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = NEW.created_by
      AND status IN ('active','trialing','past_due')
      AND plan IS NOT NULL
  ) OR EXISTS (
    SELECT 1
    FROM public.workspace_subscriptions ws
    JOIN public.workspaces w ON w.id = ws.workspace_id
    WHERE w.created_by = NEW.created_by
      AND ws.status IN ('active','trialing','past_due')
      AND ws.plan IS NOT NULL
  ) INTO has_paid;

  IF has_paid THEN
    max_owned := 5;
  ELSE
    max_owned := 2;
  END IF;

  IF owned_count >= max_owned THEN
    RAISE EXCEPTION 'OWNED_WORKSPACE_LIMIT_REACHED: You can own at most % workspaces on your current plan. Upgrade to create more, or join additional workspaces by invitation.', max_owned
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;
