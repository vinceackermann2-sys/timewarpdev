-- Add unique constraint on user_id for upsert operations
ALTER TABLE public.workspace_research ADD CONSTRAINT workspace_research_user_id_unique UNIQUE (user_id);