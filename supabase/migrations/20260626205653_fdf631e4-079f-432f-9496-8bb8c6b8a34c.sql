ALTER TABLE public.content_review_notes
  DROP CONSTRAINT content_review_notes_author_id_fkey,
  ADD CONSTRAINT content_review_notes_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;