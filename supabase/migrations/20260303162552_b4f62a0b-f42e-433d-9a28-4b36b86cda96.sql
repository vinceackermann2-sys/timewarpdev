
-- Create role enum
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- Workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My Workspace',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Workspace members table
CREATE TABLE public.workspace_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Workspace invitations table
CREATE TABLE public.workspace_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role workspace_role NOT NULL DEFAULT 'editor',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(workspace_id, email, status)
);
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- Security definer function to check workspace role
CREATE OR REPLACE FUNCTION public.has_workspace_role(_user_id UUID, _workspace_id UUID, _role workspace_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = _role
  )
$$;

-- Check if user is admin or owner
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role IN ('owner', 'admin')
  )
$$;

-- RLS for workspaces: members can view, owner/admin can update
CREATE POLICY "Members can view workspace"
  ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update workspace"
  ON public.workspaces FOR UPDATE
  USING (public.is_workspace_admin(auth.uid(), id));

-- RLS for workspace_members: members can view, admins can manage
CREATE POLICY "Members can view members"
  ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can add members"
  ON public.workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_workspace_admin(auth.uid(), workspace_id)
    OR (user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Admins can update members"
  ON public.workspace_members FOR UPDATE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can remove members"
  ON public.workspace_members FOR DELETE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- RLS for invitations: members can view, admins can manage
CREATE POLICY "Members can view invitations"
  ON public.workspace_invitations FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can create invitations"
  ON public.workspace_invitations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update invitations"
  ON public.workspace_invitations FOR UPDATE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete invitations"
  ON public.workspace_invitations FOR DELETE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- Function to auto-create workspace for new users
CREATE OR REPLACE FUNCTION public.create_default_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws_id UUID;
BEGIN
  INSERT INTO public.workspaces (name, created_by)
  VALUES ('My Workspace', NEW.id)
  RETURNING id INTO ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_workspace();

-- Function to accept an invitation
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  SELECT * INTO inv FROM public.workspace_invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or expired invitation');
  END IF;

  -- Add user as member
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, auth.uid(), inv.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- Mark invitation as accepted
  UPDATE public.workspace_invitations SET status = 'accepted' WHERE id = inv.id;

  RETURN json_build_object('success', true, 'workspace_id', inv.workspace_id);
END;
$$;
