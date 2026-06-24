
-- Phase 1: admin-only tables for per-section AI summaries and coach notes.
-- Both tables are NEVER owner-facing. RLS allows admin role only on all ops.

CREATE TABLE public.audit_section_summaries (
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_key text NOT NULL CHECK (section_key IN ('conversion','pipeline','process','activity','messaging','alignment')),
  summary_text text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, section_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_section_summaries TO authenticated;
GRANT ALL ON public.audit_section_summaries TO service_role;

ALTER TABLE public.audit_section_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_summaries" ON public.audit_section_summaries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_summaries" ON public.audit_section_summaries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_summaries" ON public.audit_section_summaries
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_delete_summaries" ON public.audit_section_summaries
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER audit_section_summaries_touch
  BEFORE UPDATE ON public.audit_section_summaries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.audit_section_notes (
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_key text NOT NULL CHECK (section_key IN ('conversion','pipeline','process','activity','messaging','alignment')),
  body text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, section_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_section_notes TO authenticated;
GRANT ALL ON public.audit_section_notes TO service_role;

ALTER TABLE public.audit_section_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_notes" ON public.audit_section_notes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_notes" ON public.audit_section_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_notes" ON public.audit_section_notes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_delete_notes" ON public.audit_section_notes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER audit_section_notes_touch
  BEFORE UPDATE ON public.audit_section_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
