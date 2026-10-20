CREATE POLICY "sosa-uploads insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sosa-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "sosa-uploads select own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sosa-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "sosa-uploads update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'sosa-uploads' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'sosa-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "sosa-uploads delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'sosa-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "sosa-uploads select elevated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sosa-uploads' AND public.is_elevated(auth.uid()));