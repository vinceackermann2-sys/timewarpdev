INSERT INTO public.user_business_data (user_id, workspace_id, data_type, source, title, content, is_analyzed, metadata)
SELECT
  '5fa26c8d-b936-4870-9378-257027135243'::uuid,
  '1c11ef85-8fec-4f09-a112-162528b54970'::uuid,
  'brand',
  'business-dna',
  'PhysVital',
  '{"id":"brand-1777624579138","name":"PhysVital","category":""}',
  true,
  jsonb_build_object('brandId','brand-1777624579138')
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_business_data
  WHERE workspace_id='1c11ef85-8fec-4f09-a112-162528b54970'
    AND data_type='brand'
);