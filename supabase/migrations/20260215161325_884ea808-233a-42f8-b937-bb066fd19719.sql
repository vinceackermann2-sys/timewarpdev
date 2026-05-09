
-- Drop all RLS policies first, then tables

-- google_workspace_connections policies
DROP POLICY IF EXISTS "Users can update their own workspace connection" ON public.google_workspace_connections;
DROP POLICY IF EXISTS "Users can upsert their own workspace connection" ON public.google_workspace_connections;
DROP POLICY IF EXISTS "Users can view their own workspace connection" ON public.google_workspace_connections;

-- google_workspace_tokens policies
DROP POLICY IF EXISTS "Deny delete google workspace tokens" ON public.google_workspace_tokens;
DROP POLICY IF EXISTS "Deny insert google workspace tokens" ON public.google_workspace_tokens;
DROP POLICY IF EXISTS "Deny select google workspace tokens" ON public.google_workspace_tokens;
DROP POLICY IF EXISTS "Deny update google workspace tokens" ON public.google_workspace_tokens;

-- microsoft_workspace_connections policies
DROP POLICY IF EXISTS "Users can delete their own microsoft connection" ON public.microsoft_workspace_connections;
DROP POLICY IF EXISTS "Users can insert their own microsoft connection" ON public.microsoft_workspace_connections;
DROP POLICY IF EXISTS "Users can update their own microsoft connection" ON public.microsoft_workspace_connections;
DROP POLICY IF EXISTS "Users can view their own microsoft connection" ON public.microsoft_workspace_connections;

-- microsoft_workspace_tokens policies
DROP POLICY IF EXISTS "Deny delete microsoft workspace tokens" ON public.microsoft_workspace_tokens;
DROP POLICY IF EXISTS "Deny insert microsoft workspace tokens" ON public.microsoft_workspace_tokens;
DROP POLICY IF EXISTS "Deny select microsoft workspace tokens" ON public.microsoft_workspace_tokens;
DROP POLICY IF EXISTS "Deny update microsoft workspace tokens" ON public.microsoft_workspace_tokens;

-- scrape_jobs policies
DROP POLICY IF EXISTS "Users can insert their own scrape jobs" ON public.scrape_jobs;
DROP POLICY IF EXISTS "Users can view their own scrape jobs" ON public.scrape_jobs;

-- slack_installations policies
DROP POLICY IF EXISTS "Deny delete slack installations" ON public.slack_installations;
DROP POLICY IF EXISTS "Deny insert slack installations" ON public.slack_installations;
DROP POLICY IF EXISTS "Deny select slack installations" ON public.slack_installations;
DROP POLICY IF EXISTS "Deny update slack installations" ON public.slack_installations;

-- slack_user_links policies
DROP POLICY IF EXISTS "Users can delete their own slack links" ON public.slack_user_links;
DROP POLICY IF EXISTS "Users can insert their own slack links" ON public.slack_user_links;
DROP POLICY IF EXISTS "Users can view their own slack links" ON public.slack_user_links;

-- waitlist policies
DROP POLICY IF EXISTS "Deny direct insert into waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "No one can read waitlist from client" ON public.waitlist;

-- workspace_research policies
DROP POLICY IF EXISTS "Users can delete their own research" ON public.workspace_research;
DROP POLICY IF EXISTS "Users can insert their own research" ON public.workspace_research;
DROP POLICY IF EXISTS "Users can update their own research" ON public.workspace_research;
DROP POLICY IF EXISTS "Users can view their own research" ON public.workspace_research;

-- Drop all functions
DROP FUNCTION IF EXISTS public.insert_waitlist(text, text, text);
DROP FUNCTION IF EXISTS public.insert_waitlist(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop all tables
DROP TABLE IF EXISTS public.google_workspace_connections CASCADE;
DROP TABLE IF EXISTS public.google_workspace_tokens CASCADE;
DROP TABLE IF EXISTS public.microsoft_workspace_connections CASCADE;
DROP TABLE IF EXISTS public.microsoft_workspace_tokens CASCADE;
DROP TABLE IF EXISTS public.scrape_jobs CASCADE;
DROP TABLE IF EXISTS public.slack_installations CASCADE;
DROP TABLE IF EXISTS public.slack_user_links CASCADE;
DROP TABLE IF EXISTS public.waitlist CASCADE;
DROP TABLE IF EXISTS public.workspace_research CASCADE;
