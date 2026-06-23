ALTER TABLE public.content_review_assets
  DROP CONSTRAINT IF EXISTS content_review_assets_title_check;

ALTER TABLE public.content_review_assets
  ADD CONSTRAINT content_review_assets_title_check
  CHECK (char_length(title) <= 120);