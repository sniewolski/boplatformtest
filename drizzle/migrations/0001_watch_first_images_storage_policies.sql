-- Public read of lesson images; elevated-only writes.
CREATE POLICY "watch_first_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'watch-first-images');

CREATE POLICY "watch_first_images_insert_elevated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'watch-first-images' AND public.is_elevated(auth.uid()));

CREATE POLICY "watch_first_images_update_elevated"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'watch-first-images' AND public.is_elevated(auth.uid()))
  WITH CHECK (bucket_id = 'watch-first-images' AND public.is_elevated(auth.uid()));

CREATE POLICY "watch_first_images_delete_elevated"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'watch-first-images' AND public.is_elevated(auth.uid()));
