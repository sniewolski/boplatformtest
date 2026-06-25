
CREATE TABLE public.salescode_results (
  owner_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_answers JSONB,
  type_code TEXT,
  traits JSONB,
  has_unsubmitted_changes BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salescode_results TO authenticated;
GRANT ALL ON public.salescode_results TO service_role;

ALTER TABLE public.salescode_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can select own salescode result"
  ON public.salescode_results FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert own salescode result"
  ON public.salescode_results FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own salescode result"
  ON public.salescode_results FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own salescode result"
  ON public.salescode_results FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can read all salescode results"
  ON public.salescode_results FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER salescode_results_touch_updated_at
  BEFORE UPDATE ON public.salescode_results
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
