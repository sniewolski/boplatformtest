CREATE TABLE public.business_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  your_offer text NOT NULL DEFAULT '',
  average_deal_size text NOT NULL DEFAULT '',
  ideal_client text NOT NULL DEFAULT '',
  how_you_sell text NOT NULL DEFAULT '',
  whos_selling text NOT NULL DEFAULT '',
  sales_cycle text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_briefs TO authenticated;
GRANT ALL ON public.business_briefs TO service_role;

ALTER TABLE public.business_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_briefs_select_own_or_admin"
  ON public.business_briefs FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business_briefs_insert_own_or_admin"
  ON public.business_briefs FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business_briefs_update_own_or_admin"
  ON public.business_briefs FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business_briefs_delete_own_or_admin"
  ON public.business_briefs FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER business_briefs_touch_updated_at
  BEFORE UPDATE ON public.business_briefs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();