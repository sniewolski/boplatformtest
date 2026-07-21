
CREATE TABLE public.will_ai_canonical_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_key text NOT NULL UNIQUE,
  label text NOT NULL,
  fact_text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.will_ai_canonical_facts TO authenticated;
GRANT ALL ON public.will_ai_canonical_facts TO service_role;

ALTER TABLE public.will_ai_canonical_facts ENABLE ROW LEVEL SECURITY;

-- Mirror will_ai_sources policies exactly.
CREATE POLICY will_ai_canonical_facts_select
  ON public.will_ai_canonical_facts FOR SELECT
  USING (true);

CREATE POLICY will_ai_canonical_facts_insert
  ON public.will_ai_canonical_facts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY will_ai_canonical_facts_update
  ON public.will_ai_canonical_facts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY will_ai_canonical_facts_delete
  ON public.will_ai_canonical_facts FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_will_ai_canonical_facts_updated_at
  BEFORE UPDATE ON public.will_ai_canonical_facts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.get_active_canonical_facts()
RETURNS TABLE (fact_key text, fact_text text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT fact_key, fact_text
  FROM public.will_ai_canonical_facts
  WHERE is_active = true
  ORDER BY sort_order, fact_key
$$;

GRANT EXECUTE ON FUNCTION public.get_active_canonical_facts() TO authenticated;

INSERT INTO public.will_ai_canonical_facts (fact_key, label, fact_text)
VALUES (
  'skool-community',
  'Skool community',
  'The Salesman.com community is hosted on Skool at https://www.skool.com/salesman-com-mentorship'
);
