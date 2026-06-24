CREATE TABLE public.selling_systems_audit_process (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_answers jsonb,
  submitted_answers jsonb,
  has_unsubmitted_changes boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.selling_systems_audit_process TO authenticated;
GRANT ALL ON public.selling_systems_audit_process TO service_role;

ALTER TABLE public.selling_systems_audit_process ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own process intake"
  ON public.selling_systems_audit_process
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own process intake"
  ON public.selling_systems_audit_process
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own process intake"
  ON public.selling_systems_audit_process
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins can view all process intakes"
  ON public.selling_systems_audit_process
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_selling_systems_audit_process_updated_at
  BEFORE UPDATE ON public.selling_systems_audit_process
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
