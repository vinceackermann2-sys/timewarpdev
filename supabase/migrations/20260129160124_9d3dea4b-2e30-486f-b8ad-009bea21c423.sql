-- Create storage bucket for business research data
INSERT INTO storage.buckets (id, name, public) VALUES ('business-data', 'business-data', false);

-- Users can read their own business data
CREATE POLICY "Users can read their own business data"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-data' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can upload their own business data  
CREATE POLICY "Users can upload their own business data"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'business-data' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own business data
CREATE POLICY "Users can update their own business data"
ON storage.objects FOR UPDATE
USING (bucket_id = 'business-data' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own business data
CREATE POLICY "Users can delete their own business data"
ON storage.objects FOR DELETE
USING (bucket_id = 'business-data' AND auth.uid()::text = (storage.foldername(name))[1]);