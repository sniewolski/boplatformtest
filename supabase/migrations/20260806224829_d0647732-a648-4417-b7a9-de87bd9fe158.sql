-- 1. audits table
CREATE TABLE public.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audits TO authenticated;
GRANT ALL ON public.audits TO service_role;

ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audits_select" ON public.audits FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_elevated(auth.uid()));
CREATE POLICY "audits_insert" ON public.audits FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "audits_update" ON public.audits FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "audits_delete" ON public.audits FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE TRIGGER audits_touch_updated_at
  BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX audits_owner_id_idx ON public.audits (owner_id);

-- 2. add nullable audit_id
ALTER TABLE public.selling_systems_audit_conversion ADD COLUMN audit_id uuid;
ALTER TABLE public.selling_systems_audit_pipeline   ADD COLUMN audit_id uuid;
ALTER TABLE public.selling_systems_audit_process    ADD COLUMN audit_id uuid;
ALTER TABLE public.selling_systems_audit_activity   ADD COLUMN audit_id uuid;
ALTER TABLE public.selling_systems_audit_messaging  ADD COLUMN audit_id uuid;
ALTER TABLE public.selling_systems_audit_alignment  ADD COLUMN audit_id uuid;
ALTER TABLE public.content_review_assets            ADD COLUMN audit_id uuid;
ALTER TABLE public.audit_section_summaries          ADD COLUMN audit_id uuid;
ALTER TABLE public.audit_section_notes              ADD COLUMN audit_id uuid;

-- 3. backfill
WITH owners AS (
  SELECT owner_id FROM public.selling_systems_audit_conversion
  UNION SELECT owner_id FROM public.selling_systems_audit_pipeline
  UNION SELECT owner_id FROM public.selling_systems_audit_process
  UNION SELECT owner_id FROM public.selling_systems_audit_activity
  UNION SELECT owner_id FROM public.selling_systems_audit_messaging
  UNION SELECT owner_id FROM public.selling_systems_audit_alignment
  UNION SELECT owner_id FROM public.content_review_assets
  UNION SELECT owner_id FROM public.audit_section_summaries
  UNION SELECT owner_id FROM public.audit_section_notes
)
INSERT INTO public.audits (owner_id, name)
SELECT owner_id, 'Main service' FROM owners WHERE owner_id IS NOT NULL;

UPDATE public.selling_systems_audit_conversion t SET audit_id = a.id FROM public.audits a WHERE a.owner_id = t.owner_id;
UPDATE public.selling_systems_audit_pipeline   t SET audit_id = a.id FROM public.audits a WHERE a.owner_id = t.owner_id;
UPDATE public.selling_systems_audit_process    t SET audit_id = a.id FROM public.audits a WHERE a.owner_id = t.owner_id;
UPDATE public.selling_systems_audit_activity   t SET audit_id = a.id FROM public.audits a WHERE a.owner_id = t.owner_id;
UPDATE public.selling_systems_audit_messaging  t SET audit_id = a.id FROM public.audits a WHERE a.owner_id = t.owner_id;
UPDATE public.selling_systems_audit_alignment  t SET audit_id = a.id FROM public.audits a WHERE a.owner_id = t.owner_id;
UPDATE public.content_review_assets            t SET audit_id = a.id FROM public.audits a WHERE a.owner_id = t.owner_id;
UPDATE public.audit_section_summaries          t SET audit_id = a.id FROM public.audits a WHERE a.owner_id = t.owner_id;
UPDATE public.audit_section_notes              t SET audit_id = a.id FROM public.audits a WHERE a.owner_id = t.owner_id;

-- 4. tighten
ALTER TABLE public.selling_systems_audit_conversion ALTER COLUMN audit_id SET NOT NULL,
  ADD CONSTRAINT ssa_conversion_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audits(id) ON DELETE CASCADE,
  DROP CONSTRAINT selling_systems_audit_conversion_pkey,
  ADD PRIMARY KEY (audit_id);
ALTER TABLE public.selling_systems_audit_pipeline ALTER COLUMN audit_id SET NOT NULL,
  ADD CONSTRAINT ssa_pipeline_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audits(id) ON DELETE CASCADE,
  DROP CONSTRAINT selling_systems_audit_pipeline_pkey,
  ADD PRIMARY KEY (audit_id);
ALTER TABLE public.selling_systems_audit_process ALTER COLUMN audit_id SET NOT NULL,
  ADD CONSTRAINT ssa_process_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audits(id) ON DELETE CASCADE,
  DROP CONSTRAINT selling_systems_audit_process_pkey,
  ADD PRIMARY KEY (audit_id);
ALTER TABLE public.selling_systems_audit_activity ALTER COLUMN audit_id SET NOT NULL,
  ADD CONSTRAINT ssa_activity_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audits(id) ON DELETE CASCADE,
  DROP CONSTRAINT selling_systems_audit_activity_pkey,
  ADD PRIMARY KEY (audit_id);
ALTER TABLE public.selling_systems_audit_messaging ALTER COLUMN audit_id SET NOT NULL,
  ADD CONSTRAINT ssa_messaging_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audits(id) ON DELETE CASCADE,
  DROP CONSTRAINT selling_systems_audit_messaging_pkey,
  ADD PRIMARY KEY (audit_id);
ALTER TABLE public.selling_systems_audit_alignment ALTER COLUMN audit_id SET NOT NULL,
  ADD CONSTRAINT ssa_alignment_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audits(id) ON DELETE CASCADE,
  DROP CONSTRAINT selling_systems_audit_alignment_pkey,
  ADD PRIMARY KEY (audit_id);

ALTER TABLE public.content_review_assets ALTER COLUMN audit_id SET NOT NULL,
  ADD CONSTRAINT content_review_assets_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audits(id) ON DELETE CASCADE;
CREATE INDEX content_review_assets_audit_id_idx ON public.content_review_assets (audit_id);

ALTER TABLE public.audit_section_summaries ALTER COLUMN audit_id SET NOT NULL,
  ADD CONSTRAINT audit_section_summaries_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audits(id) ON DELETE CASCADE,
  DROP CONSTRAINT audit_section_summaries_pkey,
  ADD PRIMARY KEY (audit_id, section_key);

ALTER TABLE public.audit_section_notes ALTER COLUMN audit_id SET NOT NULL,
  ADD CONSTRAINT audit_section_notes_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audits(id) ON DELETE CASCADE,
  DROP CONSTRAINT audit_section_notes_pkey,
  ADD PRIMARY KEY (audit_id, section_key);