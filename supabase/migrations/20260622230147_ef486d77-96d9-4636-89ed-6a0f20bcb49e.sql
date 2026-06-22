-- Owner-level platform setting: currency.
-- Lives separately from `profiles` because `profiles.account_status` is
-- admin-controlled and owners must not have write access to that row.
-- `currency` is nullable with no default — there is no silent fallback.

CREATE TABLE public.owner_settings (
  owner_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  currency   text CHECK (currency IN ('USD','EUR','GBP')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_settings TO authenticated;
GRANT ALL ON public.owner_settings TO service_role;

ALTER TABLE public.owner_settings ENABLE ROW LEVEL SECURITY;

-- Canonical four-policy set (owner = self, or admin).
CREATE POLICY "owner_settings_select_own_or_admin"
  ON public.owner_settings FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "owner_settings_insert_own_or_admin"
  ON public.owner_settings FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "owner_settings_update_own_or_admin"
  ON public.owner_settings FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "owner_settings_delete_own_or_admin"
  ON public.owner_settings FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Keep updated_at fresh on writes.
CREATE TRIGGER owner_settings_touch_updated_at
  BEFORE UPDATE ON public.owner_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();