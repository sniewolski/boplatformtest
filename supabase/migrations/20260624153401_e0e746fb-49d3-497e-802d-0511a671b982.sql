CREATE TABLE public.selling_systems_audit_messaging (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_answers jsonb,
  submitted_answers jsonb,
  has_unsubmitted_changes boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.selling_systems_audit_messaging TO authenticated;
GRANT ALL ON public.selling_systems_audit_messaging TO service_role;

ALTER TABLE public.selling_systems_audit_messaging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own messaging intake"
  ON public.selling_systems_audit_messaging
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners insert own messaging intake"
  ON public.selling_systems_audit_messaging
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners update own messaging intake"
  ON public.selling_systems_audit_messaging
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners delete own messaging intake"
  ON public.selling_systems_audit_messaging
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins read all messaging intakes"
  ON public.selling_systems_audit_messaging
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER selling_systems_audit_messaging_touch_updated_at
  BEFORE UPDATE ON public.selling_systems_audit_messaging
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();