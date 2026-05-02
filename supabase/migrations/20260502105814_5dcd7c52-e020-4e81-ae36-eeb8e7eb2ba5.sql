DROP VIEW IF EXISTS public.workspace_memory_aggregate;
CREATE VIEW public.workspace_memory_aggregate
WITH (security_invoker = true) AS
SELECT
  workspace_id,
  key,
  value,
  category,
  source,
  updated_at,
  user_id
FROM public.assistant_memory
WHERE workspace_id IS NOT NULL;