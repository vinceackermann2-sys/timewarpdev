
CREATE TABLE public.scrape_jobs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  url text,
  instruction text,
  result text,
  error text,
  status text,
  live_url text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON public.scrape_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select" ON public.scrape_jobs FOR SELECT USING (true);
