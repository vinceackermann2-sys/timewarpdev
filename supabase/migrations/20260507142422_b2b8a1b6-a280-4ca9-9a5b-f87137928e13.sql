DO $$
DECLARE
  v_user uuid := '5fa26c8d-b936-4870-9378-257027135243';
  v_ws uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE created_by = v_user) THEN
    INSERT INTO public.workspaces (name, created_by)
    VALUES ('My Workspace', v_user)
    RETURNING id INTO v_ws;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_ws, v_user, 'owner')
    ON CONFLICT DO NOTHING;

    UPDATE public.user_business_data
      SET workspace_id = v_ws
      WHERE user_id = v_user AND workspace_id IS NULL;
  END IF;
END $$;