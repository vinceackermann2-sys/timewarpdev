CREATE INDEX IF NOT EXISTS idx_ai_employees_user_id ON public.ai_employees (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_employees_workspace_id ON public.ai_employees (workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_employee_logs_employee_id ON public.ai_employee_logs (employee_id);
CREATE INDEX IF NOT EXISTS idx_ai_employee_logs_user_id ON public.ai_employee_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members (user_id);