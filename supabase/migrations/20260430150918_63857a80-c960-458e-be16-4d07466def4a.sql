
-- Enforce: one business (data_type='brand') per workspace.
-- Step 1: For workspaces with multiple brands, keep the newest brand in place
-- and move each older brand (plus its products/audiences keyed by metadata->>'brandId')
-- into a freshly created workspace owned by the original workspace owner.
DO $$
DECLARE
  ws RECORD;
  brand_row RECORD;
  new_ws_id uuid;
  brand_key text;
  is_first boolean;
BEGIN
  FOR ws IN
    SELECT workspace_id, COUNT(*) AS c
    FROM public.user_business_data
    WHERE data_type = 'brand' AND workspace_id IS NOT NULL
    GROUP BY workspace_id
    HAVING COUNT(*) > 1
  LOOP
    is_first := true;
    FOR brand_row IN
      SELECT ubd.id, ubd.title, ubd.metadata, ubd.user_id, w.created_by, w.name AS ws_name
      FROM public.user_business_data ubd
      JOIN public.workspaces w ON w.id = ubd.workspace_id
      WHERE ubd.workspace_id = ws.workspace_id AND ubd.data_type = 'brand'
      ORDER BY ubd.created_at DESC NULLS LAST, ubd.id DESC
    LOOP
      IF is_first THEN
        is_first := false;
        CONTINUE; -- keep newest in original workspace
      END IF;

      -- Create a new workspace for this archived brand
      INSERT INTO public.workspaces (name, created_by)
      VALUES (COALESCE(NULLIF(brand_row.title, ''), 'Archived Business'), brand_row.created_by)
      RETURNING id INTO new_ws_id;

      INSERT INTO public.workspace_members (workspace_id, user_id, role)
      VALUES (new_ws_id, brand_row.created_by, 'owner');

      -- Move the brand row itself
      UPDATE public.user_business_data
      SET workspace_id = new_ws_id
      WHERE id = brand_row.id;

      -- Move all related products/audiences/etc that share this brand's brandId
      brand_key := brand_row.metadata->>'brandId';
      IF brand_key IS NOT NULL AND brand_key <> '' THEN
        UPDATE public.user_business_data
        SET workspace_id = new_ws_id
        WHERE workspace_id = ws.workspace_id
          AND data_type <> 'brand'
          AND metadata->>'brandId' = brand_key;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Step 2: Enforce one brand per workspace at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS user_business_data_one_brand_per_workspace
ON public.user_business_data (workspace_id)
WHERE data_type = 'brand' AND workspace_id IS NOT NULL;
