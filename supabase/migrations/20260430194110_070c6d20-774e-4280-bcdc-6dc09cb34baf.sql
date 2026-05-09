-- 1. For each user, find their most recent workspace
WITH user_default_ws AS (
  SELECT created_by AS user_id,
         (ARRAY_AGG(id ORDER BY created_at DESC))[1] AS workspace_id
  FROM public.workspaces
  GROUP BY created_by
),
-- 2. Find all orphan brand rows (NULL workspace_id) per user, ranked by most recent
orphan_brands AS (
  SELECT id, user_id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM public.user_business_data
  WHERE workspace_id IS NULL
    AND data_type = 'brand'
    AND source = 'business-dna'
),
-- 3. Identify which orphan to keep (the newest one) per user, and the target workspace
keepers AS (
  SELECT ob.id AS row_id, ob.user_id, w.workspace_id AS target_ws
  FROM orphan_brands ob
  JOIN user_default_ws w ON w.user_id = ob.user_id
  WHERE ob.rn = 1
),
-- 4. Skip the keeper if the target workspace already has a brand (constraint conflict)
keepers_safe AS (
  SELECT k.row_id, k.user_id, k.target_ws
  FROM keepers k
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_business_data existing
    WHERE existing.workspace_id = k.target_ws
      AND existing.data_type = 'brand'
      AND existing.source = 'business-dna'
  )
)
-- 5. Reattach safe keepers
UPDATE public.user_business_data ubd
SET workspace_id = ks.target_ws
FROM keepers_safe ks
WHERE ubd.id = ks.row_id;

-- 6. Delete remaining orphan brand duplicates (and any orphan brand whose target ws already had a brand)
DELETE FROM public.user_business_data
WHERE workspace_id IS NULL
  AND data_type = 'brand'
  AND source = 'business-dna';

-- 7. Backfill orphan products / audiences onto the user's default workspace
WITH user_default_ws AS (
  SELECT created_by AS user_id,
         (ARRAY_AGG(id ORDER BY created_at DESC))[1] AS workspace_id
  FROM public.workspaces
  GROUP BY created_by
)
UPDATE public.user_business_data ubd
SET workspace_id = w.workspace_id
FROM user_default_ws w
WHERE ubd.user_id = w.user_id
  AND ubd.workspace_id IS NULL
  AND ubd.data_type IN ('product', 'audience')
  AND ubd.source = 'business-dna';