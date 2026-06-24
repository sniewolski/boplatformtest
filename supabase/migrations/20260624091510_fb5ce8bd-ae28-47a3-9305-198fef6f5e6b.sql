CREATE TABLE public.selling_systems_audit_pipeline (
  owner_id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_answers            jsonb,
  submitted_answers        jsonb,
  has_unsubmitted_changes  boolean NOT NULL DEFAULT false,
  submitted_at             timestamptz,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.selling_systems_audit_pipeline TO authenticated;
GRANT ALL ON public.selling_systems_audit_pipeline TO service_role;

ALTER TABLE public.selling_systems_audit_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read their own pipeline intake"
  ON public.selling_systems_audit_pipeline
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own pipeline intake"
  ON public.selling_systems_audit_pipeline
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own pipeline intake"
  ON public.selling_systems_audit_pipeline
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own pipeline intake"
  ON public.selling_systems_audit_pipeline
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can read all pipeline intakes"
  ON public.selling_systems_audit_pipeline
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER selling_systems_audit_pipeline_touch_updated_at
  BEFORE UPDATE ON public.selling_systems_audit_pipeline
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();