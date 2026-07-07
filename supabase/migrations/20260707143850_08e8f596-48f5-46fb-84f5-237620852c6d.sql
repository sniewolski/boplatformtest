
-- sop_folders
CREATE TABLE public.sop_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_folders TO authenticated;
GRANT ALL ON public.sop_folders TO service_role;

ALTER TABLE public.sop_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sop_folders_select" ON public.sop_folders
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "sop_folders_insert" ON public.sop_folders
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sop_folders_update" ON public.sop_folders
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sop_folders_delete" ON public.sop_folders
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- sops
CREATE TABLE public.sops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES public.sop_folders(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sops TO authenticated;
GRANT ALL ON public.sops TO service_role;

ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sops_select" ON public.sops
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "sops_insert" ON public.sops
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sops_update" ON public.sops
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sops_delete" ON public.sops
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sops_touch_updated_at
  BEFORE UPDATE ON public.sops
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage policies for the 'sops' bucket
CREATE POLICY "sops_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'sops' AND auth.role() = 'authenticated');
CREATE POLICY "sops_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'sops' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sops_storage_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'sops' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'sops' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sops_storage_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'sops' AND public.has_role(auth.uid(), 'admin'));
