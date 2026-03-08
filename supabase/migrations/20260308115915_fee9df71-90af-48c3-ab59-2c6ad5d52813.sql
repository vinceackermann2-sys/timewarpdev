
CREATE TABLE public.ai_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  sop_title TEXT,
  sop_purpose TEXT,
  sop_scope TEXT,
  sop_responsibilities JSONB DEFAULT '[]'::jsonb,
  sop_definitions JSONB DEFAULT '[]'::jsonb,
  sop_materials JSONB DEFAULT '[]'::jsonb,
  sop_procedure JSONB DEFAULT '[]'::jsonb,
  sop_safety_notes TEXT,
  sop_documentation TEXT,
  sop_revision_history JSONB DEFAULT '[]'::jsonb,
  orb_colors JSONB DEFAULT '{"c1": "oklch(75% 0.15 350)", "c2": "oklch(80% 0.12 200)", "c3": "oklch(78% 0.14 280)"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or workspace employees"
ON public.ai_employees FOR SELECT TO authenticated
USING (
  (user_id = auth.uid()) OR 
  ((workspace_id IS NOT NULL) AND is_workspace_member(auth.uid(), workspace_id))
);

CREATE POLICY "Users can insert own employees"
ON public.ai_employees FOR INSERT TO authenticated
WITH CHECK (
  (user_id = auth.uid()) AND 
  ((workspace_id IS NULL) OR is_workspace_member(auth.uid(), workspace_id))
);

CREATE POLICY "Users can update own or workspace employees"
ON public.ai_employees FOR UPDATE TO authenticated
USING (
  (user_id = auth.uid()) OR 
  ((workspace_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = ai_employees.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = ANY (ARRAY['owner'::workspace_role, 'editor'::workspace_role])
  )))
);

CREATE POLICY "Users can delete own or workspace employees"
ON public.ai_employees FOR DELETE TO authenticated
USING (
  (user_id = auth.uid()) OR 
  ((workspace_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = ai_employees.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role = ANY (ARRAY['owner'::workspace_role, 'editor'::workspace_role])
  )))
);
