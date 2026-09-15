CREATE TABLE public.watch_first_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  video_embed_url text,
  body_markdown text,
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_first_lessons TO authenticated;
GRANT ALL ON public.watch_first_lessons TO service_role;

ALTER TABLE public.watch_first_lessons ENABLE ROW LEVEL SECURITY;

-- Owners see published lessons; elevated roles (admin/mentor) see drafts too.
CREATE POLICY watch_first_lessons_select
  ON public.watch_first_lessons FOR SELECT
  USING (is_published OR public.is_elevated(auth.uid()));

CREATE POLICY watch_first_lessons_insert
  ON public.watch_first_lessons FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY watch_first_lessons_update
  ON public.watch_first_lessons FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY watch_first_lessons_delete
  ON public.watch_first_lessons FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_watch_first_lessons_updated_at
  BEFORE UPDATE ON public.watch_first_lessons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.watch_first_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.watch_first_lessons(id) ON DELETE CASCADE,
  watched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, lesson_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_first_lesson_progress TO authenticated;
GRANT ALL ON public.watch_first_lesson_progress TO service_role;

ALTER TABLE public.watch_first_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Owner-scoped access, mirroring the audits table shape; elevated roles read all.
CREATE POLICY watch_first_lesson_progress_select
  ON public.watch_first_lesson_progress FOR SELECT
  USING (owner_id = auth.uid() OR public.is_elevated(auth.uid()));

CREATE POLICY watch_first_lesson_progress_insert
  ON public.watch_first_lesson_progress FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY watch_first_lesson_progress_update
  ON public.watch_first_lesson_progress FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY watch_first_lesson_progress_delete
  ON public.watch_first_lesson_progress FOR DELETE
  USING (owner_id = auth.uid());

CREATE TRIGGER trg_watch_first_lesson_progress_updated_at
  BEFORE UPDATE ON public.watch_first_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();