
-- Add linked_business_id to ai_employees so we know what business data the employee queries
ALTER TABLE public.ai_employees ADD COLUMN linked_business_id uuid REFERENCES public.user_business_data(id) ON DELETE SET NULL;

-- Create activity log table for employee runs
CREATE TABLE public.ai_employee_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'running',
  step_label text,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_employee_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own employee logs"
  ON public.ai_employee_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own employee logs"
  ON public.ai_employee_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own employee logs"
  ON public.ai_employee_logs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
