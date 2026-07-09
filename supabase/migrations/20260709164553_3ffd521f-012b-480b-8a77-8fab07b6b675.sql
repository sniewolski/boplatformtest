
CREATE POLICY "will_ai_content_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'will-ai-content');
CREATE POLICY "will_ai_content_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'will-ai-content' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "will_ai_content_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'will-ai-content' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'will-ai-content' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "will_ai_content_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'will-ai-content' AND public.has_role(auth.uid(), 'admin'));
