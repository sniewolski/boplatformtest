CREATE TABLE public.daily_log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  emails_sent integer NOT NULL DEFAULT 0 CHECK (emails_sent >= 0),
  calls_made integer NOT NULL DEFAULT 0 CHECK (calls_made >= 0),
  connects integer NOT NULL DEFAULT 0 CHECK (connects >= 0),
  meetings_booked integer NOT NULL DEFAULT 0 CHECK (meetings_booked >= 0),
  revenue numeric(12,2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  mit_done boolean NOT NULL DEFAULT false,
  mood text CHECK (mood IN ('bad','neutral','good')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, entry_date)
);

CREATE INDEX daily_log_entries_owner_date_idx
  ON public.daily_log_entries (owner_id, entry_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_log_entries TO authenticated;
GRANT ALL ON public.daily_log_entries TO service_role;

ALTER TABLE public.daily_log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_log_entries_select_own_or_admin"
  ON public.daily_log_entries FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "daily_log_entries_insert_own_or_admin"
  ON public.daily_log_entries FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "daily_log_entries_update_own_or_admin"
  ON public.daily_log_entries FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "daily_log_entries_delete_own_or_admin"
  ON public.daily_log_entries FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER daily_log_entries_touch_updated_at
  BEFORE UPDATE ON public.daily_log_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();