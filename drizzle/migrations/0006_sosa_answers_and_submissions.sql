CREATE TABLE public.sosa_answers (
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimates jsonb NOT NULL DEFAULT '{}'::jsonb,
  marker text NULL CHECK (marker IN ('dont_know','not_doing','dont_have')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sosa_answers TO authenticated;
GRANT ALL ON public.sosa_answers TO service_role;
ALTER TABLE public.sosa_answers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER sosa_answers_touch_updated_at BEFORE UPDATE ON public.sosa_answers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE POLICY "sosa_answers select own" ON public.sosa_answers FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "sosa_answers select elevated" ON public.sosa_answers FOR SELECT TO authenticated USING (public.is_elevated(auth.uid()));
CREATE POLICY "sosa_answers insert own" ON public.sosa_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "sosa_answers update own" ON public.sosa_answers FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "sosa_answers delete own" ON public.sosa_answers FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.sosa_submissions (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sosa_submissions TO authenticated;
GRANT ALL ON public.sosa_submissions TO service_role;
ALTER TABLE public.sosa_submissions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER sosa_submissions_touch_updated_at BEFORE UPDATE ON public.sosa_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE POLICY "sosa_submissions select own" ON public.sosa_submissions FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "sosa_submissions select elevated" ON public.sosa_submissions FOR SELECT TO authenticated USING (public.is_elevated(auth.uid()));
CREATE POLICY "sosa_submissions insert own" ON public.sosa_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "sosa_submissions update own" ON public.sosa_submissions FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "sosa_submissions delete own" ON public.sosa_submissions FOR DELETE TO authenticated USING (auth.uid() = owner_id);