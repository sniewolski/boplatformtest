
-- Archive tables for Will AI conversations (admin-only, permanent, survives owner deletion)

CREATE TABLE public.will_ai_conversations_archive (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  owner_name text,
  owner_email text,
  created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.will_ai_conversations_archive TO authenticated;
GRANT ALL ON public.will_ai_conversations_archive TO service_role;

ALTER TABLE public.will_ai_conversations_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read archived conversations"
  ON public.will_ai_conversations_archive
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.will_ai_messages_archive (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.will_ai_conversations_archive(id),
  owner_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  cited_chunk_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  used_fallback boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX will_ai_messages_archive_conversation_created_idx
  ON public.will_ai_messages_archive (conversation_id, created_at);
CREATE INDEX will_ai_conversations_archive_owner_idx
  ON public.will_ai_conversations_archive (owner_id, created_at DESC);

GRANT SELECT ON public.will_ai_messages_archive TO authenticated;
GRANT ALL ON public.will_ai_messages_archive TO service_role;

ALTER TABLE public.will_ai_messages_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read archived messages"
  ON public.will_ai_messages_archive
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger fns bypass RLS (SECURITY DEFINER); writes are the only path to the archive.
CREATE OR REPLACE FUNCTION public.trigger_archive_will_ai_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text;
  v_email text;
BEGIN
  SELECT full_name, email INTO v_name, v_email
  FROM public.profiles
  WHERE id = NEW.owner_id;

  INSERT INTO public.will_ai_conversations_archive
    (id, owner_id, owner_name, owner_email, created_at)
  VALUES
    (NEW.id, NEW.owner_id, v_name, v_email, NEW.created_at)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_archive_will_ai_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Defensive: ensure parent archive row exists (in case a message somehow
  -- arrives before the conversation trigger fired; keeps FK happy).
  INSERT INTO public.will_ai_conversations_archive (id, owner_id, created_at)
  SELECT c.id, c.owner_id, c.created_at
  FROM public.will_ai_conversations c
  WHERE c.id = NEW.conversation_id
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.will_ai_messages_archive
    (id, conversation_id, owner_id, role, content, cited_chunk_ids, used_fallback, created_at)
  VALUES
    (NEW.id, NEW.conversation_id, NEW.owner_id, NEW.role, NEW.content,
     COALESCE(NEW.cited_chunk_ids, '[]'::jsonb), COALESCE(NEW.used_fallback, false), NEW.created_at)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER archive_will_ai_conversation_ins
  AFTER INSERT ON public.will_ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.trigger_archive_will_ai_conversation();

CREATE TRIGGER archive_will_ai_message_ins
  AFTER INSERT ON public.will_ai_messages
  FOR EACH ROW EXECUTE FUNCTION public.trigger_archive_will_ai_message();

-- Backfill existing rows so the archive is complete on day one.
INSERT INTO public.will_ai_conversations_archive (id, owner_id, owner_name, owner_email, created_at)
SELECT c.id, c.owner_id, p.full_name, p.email, c.created_at
FROM public.will_ai_conversations c
LEFT JOIN public.profiles p ON p.id = c.owner_id
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.will_ai_messages_archive
  (id, conversation_id, owner_id, role, content, cited_chunk_ids, used_fallback, created_at)
SELECT m.id, m.conversation_id, m.owner_id, m.role, m.content,
       COALESCE(m.cited_chunk_ids, '[]'::jsonb), COALESCE(m.used_fallback, false), m.created_at
FROM public.will_ai_messages m
WHERE EXISTS (SELECT 1 FROM public.will_ai_conversations_archive a WHERE a.id = m.conversation_id)
ON CONFLICT (id) DO NOTHING;
