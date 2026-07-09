ALTER TABLE public.will_ai_sources
  ADD COLUMN IF NOT EXISTS failed_pages jsonb NOT NULL DEFAULT '[]'::jsonb;