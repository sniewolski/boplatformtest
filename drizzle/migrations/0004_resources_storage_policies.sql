CREATE POLICY resources_storage_select ON storage.objects
  FOR SELECT USING (bucket_id = 'resources' AND auth.role() = 'authenticated');
CREATE POLICY resources_storage_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'resources' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY resources_storage_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'resources' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'resources' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY resources_storage_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'resources' AND public.has_role(auth.uid(), 'admin'::app_role));