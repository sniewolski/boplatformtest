-- Destructive: pre-launch, no production data to preserve.
DROP TABLE IF EXISTS public.selling_systems_audit_conversion CASCADE;

CREATE TABLE public.selling_systems_audit_conversion (
  owner_id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_answers            jsonb,
  submitted_answers        jsonb,
  has_unsubmitted_changes  boolean NOT NULL DEFAULT false,
  submitted_at             timestamptz,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.selling_systems_audit_conversion TO authenticated;
GRANT ALL ON public.selling_systems_audit_conversion TO service_role;

ALTER TABLE public.selling_systems_audit_conversion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own conversion intake"
  ON public.selling_systems_audit_conversion
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own conversion intake"
  ON public.selling_systems_audit_conversion
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own conversion intake"
  ON public.selling_systems_audit_conversion
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own conversion intake"
  ON public.selling_systems_audit_conversion
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can view all conversion intakes"
  ON public.selling_systems_audit_conversion
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER selling_systems_audit_conversion_touch_updated_at
  BEFORE UPDATE ON public.selling_systems_audit_conversion
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();