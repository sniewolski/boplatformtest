CREATE TABLE public.will_ai_settings (
  id integer PRIMARY KEY DEFAULT 1,
  owner_access_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT will_ai_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.will_ai_settings TO authenticated;
GRANT UPDATE ON public.will_ai_settings TO authenticated;
GRANT ALL ON public.will_ai_settings TO service_role;

ALTER TABLE public.will_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Any authenticated can read will_ai_settings"
  ON public.will_ai_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can update will_ai_settings"
  ON public.will_ai_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER will_ai_settings_touch
  BEFORE UPDATE ON public.will_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.will_ai_settings (id, owner_access_enabled) VALUES (1, true);