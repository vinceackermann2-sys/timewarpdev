INSERT INTO public.user_connections (user_id, workspace_id, provider, status, connected_at)
SELECT t.user_id, t.workspace_id, t.provider, 'connected', t.created_at
FROM public.user_oauth_tokens t
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_connections c
  WHERE c.user_id = t.user_id
    AND c.provider = t.provider
    AND ((c.workspace_id IS NULL AND t.workspace_id IS NULL) OR c.workspace_id = t.workspace_id)
);