
-- Add user_id column to scrape_jobs
ALTER TABLE public.scrape_jobs ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow public insert" ON public.scrape_jobs;
DROP POLICY IF EXISTS "Allow public select" ON public.scrape_jobs;

-- Add user-scoped policies
CREATE POLICY "Users can insert their own scrape jobs"
ON public.scrape_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own scrape jobs"
ON public.scrape_jobs FOR SELECT
USING (auth.uid() = user_id);
