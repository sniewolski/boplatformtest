ALTER TABLE public.tracked_videos ADD COLUMN view_count bigint;
ALTER TABLE public.tracked_videos ADD COLUMN views_updated_at timestamptz;