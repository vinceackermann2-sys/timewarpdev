
-- user_connections table
CREATE TABLE public.user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'connected',
  connected_at timestamptz DEFAULT now(),
  metadata jsonb
);
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own connections" ON public.user_connections
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- user_business_data table
CREATE TABLE public.user_business_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_type text NOT NULL,
  source text NOT NULL DEFAULT 'canvas',
  title text NOT NULL,
  content text,
  metadata jsonb,
  file_path text,
  analyzed_content text,
  is_analyzed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_business_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own business data" ON public.user_business_data
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
