
-- Update accept_workspace_invitation to also remove the user's empty auto-created workspace
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  auto_ws_id UUID;
BEGIN
  SELECT * INTO inv FROM public.workspace_invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or expired invitation');
  END IF;

  -- Add user as member of the invited workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, auth.uid(), inv.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- Mark invitation as accepted
  UPDATE public.workspace_invitations SET status = 'accepted' WHERE id = inv.id;

  -- Clean up auto-created personal workspace if it's empty (only the user in it)
  SELECT w.id INTO auto_ws_id
  FROM public.workspaces w
  JOIN public.workspace_members wm ON wm.workspace_id = w.id
  WHERE w.created_by = auth.uid()
    AND w.id != inv.workspace_id
    AND (SELECT COUNT(*) FROM public.workspace_members WHERE workspace_id = w.id) = 1
  LIMIT 1;

  IF auto_ws_id IS NOT NULL THEN
    DELETE FROM public.workspace_members WHERE workspace_id = auto_ws_id AND user_id = auth.uid();
    DELETE FROM public.workspaces WHERE id = auto_ws_id;
  END IF;

  RETURN json_build_object('success', true, 'workspace_id', inv.workspace_id);
END;
$$;
