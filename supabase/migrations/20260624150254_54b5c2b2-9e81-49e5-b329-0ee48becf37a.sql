CREATE TABLE public.selling_systems_audit_activity (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_answers jsonb,
  submitted_answers jsonb,
  has_unsubmitted_changes boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.selling_systems_audit_activity TO authenticated;
GRANT ALL ON public.selling_systems_audit_activity TO service_role;

ALTER TABLE public.selling_systems_audit_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own activity intake"
  ON public.selling_systems_audit_activity
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own activity intake"
  ON public.selling_systems_audit_activity
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own activity intake"
  ON public.selling_systems_audit_activity
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins can view all activity intakes"
  ON public.selling_systems_audit_activity
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_selling_systems_audit_activity_updated_at
  BEFORE UPDATE ON public.selling_systems_audit_activity
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();