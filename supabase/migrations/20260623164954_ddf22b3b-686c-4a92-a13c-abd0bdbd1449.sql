ALTER TABLE public.content_review_assets
  ADD CONSTRAINT content_review_assets_title_length_check
  CHECK (char_length(title) <= 80);

CREATE OR REPLACE FUNCTION public.content_review_assets_trim_title()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.title IS NOT NULL THEN
    NEW.title := btrim(NEW.title);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_review_assets_trim_title_trg ON public.content_review_assets;
CREATE TRIGGER content_review_assets_trim_title_trg
  BEFORE INSERT OR UPDATE OF title ON public.content_review_assets
  FOR EACH ROW EXECUTE FUNCTION public.content_review_assets_trim_title();