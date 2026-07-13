ALTER TABLE public.will_ai_sources
  ADD COLUMN sop_id uuid NULL REFERENCES public.sops(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX will_ai_sources_sop_id_key
  ON public.will_ai_sources(sop_id)
  WHERE sop_id IS NOT NULL;