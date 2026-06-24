CREATE TABLE public.selling_systems_audit_alignment (
  owner_id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_answers            jsonb,
  submitted_answers        jsonb,
  has_unsubmitted_changes  boolean NOT NULL DEFAULT false,
  submitted_at             timestamptz,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.selling_systems_audit_alignment TO authenticated;
GRANT ALL ON public.selling_systems_audit_alignment TO service_role;

ALTER TABLE public.selling_systems_audit_alignment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read their alignment intake"
  ON public.selling_systems_audit_alignment
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their alignment intake"
  ON public.selling_systems_audit_alignment
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their alignment intake"
  ON public.selling_systems_audit_alignment
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their alignment intake"
  ON public.selling_systems_audit_alignment
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can read all alignment intakes"
  ON public.selling_systems_audit_alignment
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER selling_systems_audit_alignment_touch_updated_at
  BEFORE UPDATE ON public.selling_systems_audit_alignment
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
