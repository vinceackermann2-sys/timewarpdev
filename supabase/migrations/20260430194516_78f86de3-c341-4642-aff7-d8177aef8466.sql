-- Vincent's account ended up with two "TimeWarp" workspaces:
--   dd3e8927… (newer, only an empty 109-byte brand stub — caused by the now-patched client bug)
--   f837d7ba… (original, with full DNA: brand, products, audiences, all 9 pillars)
-- Delete the empty stub brand and the empty duplicate workspace so the loader
-- falls back to the workspace with the real Business DNA.

DELETE FROM public.user_business_data
WHERE workspace_id = 'dd3e8927-1f66-4ca6-8ca3-71e57302e920'
  AND user_id = 'd81f2b69-8179-44c2-a969-3ad5ca390afb';

DELETE FROM public.workspace_members
WHERE workspace_id = 'dd3e8927-1f66-4ca6-8ca3-71e57302e920';

DELETE FROM public.workspaces
WHERE id = 'dd3e8927-1f66-4ca6-8ca3-71e57302e920'
  AND created_by = 'd81f2b69-8179-44c2-a969-3ad5ca390afb';