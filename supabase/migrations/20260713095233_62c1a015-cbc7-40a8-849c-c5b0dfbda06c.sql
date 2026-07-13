-- 1. Extend source_type check to allow 'youtube'
ALTER TABLE public.will_ai_sources DROP CONSTRAINT will_ai_sources_source_type_check;
ALTER TABLE public.will_ai_sources ADD CONSTRAINT will_ai_sources_source_type_check
  CHECK (source_type = ANY (ARRAY['book','video','podcast','blog_post','document','youtube']));

-- 2. Add YouTube-specific columns to sources (external_url already exists, reuse it)
ALTER TABLE public.will_ai_sources
  ADD COLUMN external_id text,
  ADD COLUMN duration_seconds integer;

-- 3. Prevent duplicate YouTube imports
CREATE UNIQUE INDEX will_ai_sources_youtube_external_id_idx
  ON public.will_ai_sources (external_id)
  WHERE source_type = 'youtube';

-- 4. Extend chunk_type to allow 'transcript'
ALTER TABLE public.will_ai_chunks DROP CONSTRAINT will_ai_chunks_chunk_type_check;
ALTER TABLE public.will_ai_chunks ADD CONSTRAINT will_ai_chunks_chunk_type_check
  CHECK (chunk_type = ANY (ARRAY['text','diagram','transcript']));

-- 5. Add transcript window columns to chunks
ALTER TABLE public.will_ai_chunks
  ADD COLUMN start_seconds integer,
  ADD COLUMN end_seconds integer;

-- 6. Monthly quota counter (single-row table)
CREATE TABLE public.will_ai_youtube_quota (
  id smallint PRIMARY KEY DEFAULT 1,
  cycle_start date NOT NULL DEFAULT date_trunc('month', now())::date,
  used integer NOT NULL DEFAULT 0,
  monthly_limit integer NOT NULL DEFAULT 1000,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT will_ai_youtube_quota_singleton CHECK (id = 1)
);

GRANT SELECT ON public.will_ai_youtube_quota TO authenticated;
GRANT ALL ON public.will_ai_youtube_quota TO service_role;

ALTER TABLE public.will_ai_youtube_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "will_ai_youtube_quota_select_admin"
  ON public.will_ai_youtube_quota FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER will_ai_youtube_quota_touch
  BEFORE UPDATE ON public.will_ai_youtube_quota
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed the single row
INSERT INTO public.will_ai_youtube_quota (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 7. Quota reservation helper — called by the ingestion worker (service_role).
-- Atomically: rolls over the cycle if a month has passed, then reserves up to
-- `requested` transcripts, returning how many were actually reserved (0 if the
-- quota is exhausted). Row lock prevents double-counting concurrent workers.
CREATE OR REPLACE FUNCTION public.reserve_youtube_quota(requested integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.will_ai_youtube_quota%ROWTYPE;
  remaining integer;
  granted integer;
BEGIN
  IF requested <= 0 THEN RETURN 0; END IF;

  SELECT * INTO q FROM public.will_ai_youtube_quota WHERE id = 1 FOR UPDATE;

  -- Roll over the monthly cycle if we've crossed into a new month.
  IF date_trunc('month', now())::date > q.cycle_start THEN
    UPDATE public.will_ai_youtube_quota
       SET cycle_start = date_trunc('month', now())::date,
           used = 0
     WHERE id = 1
     RETURNING * INTO q;
  END IF;

  remaining := GREATEST(0, q.monthly_limit - q.used);
  granted := LEAST(requested, remaining);

  IF granted > 0 THEN
    UPDATE public.will_ai_youtube_quota
       SET used = used + granted
     WHERE id = 1;
  END IF;

  RETURN granted;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_youtube_quota(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_youtube_quota(integer) TO service_role;