CREATE TABLE public.integration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  integration_name text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own requests"
ON public.integration_requests FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own requests"
ON public.integration_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid());