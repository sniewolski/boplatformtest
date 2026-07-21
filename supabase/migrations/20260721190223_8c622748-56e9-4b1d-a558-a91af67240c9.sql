
ALTER TABLE public.will_ai_messages
  ADD COLUMN IF NOT EXISTS used_fact_keys text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.will_ai_messages_archive
  ADD COLUMN IF NOT EXISTS used_fact_keys text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.trigger_archive_will_ai_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.will_ai_conversations_archive (id, owner_id, created_at)
  SELECT c.id, c.owner_id, c.created_at
  FROM public.will_ai_conversations c
  WHERE c.id = NEW.conversation_id
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.will_ai_messages_archive
    (id, conversation_id, owner_id, role, content, cited_chunk_ids, used_fallback, used_fact_keys, created_at)
  VALUES
    (NEW.id, NEW.conversation_id, NEW.owner_id, NEW.role, NEW.content,
     COALESCE(NEW.cited_chunk_ids, '[]'::jsonb),
     COALESCE(NEW.used_fallback, false),
     COALESCE(NEW.used_fact_keys, ARRAY[]::text[]),
     NEW.created_at)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.persist_will_ai_turn(uuid, uuid, text, text, uuid[], boolean);
DROP FUNCTION IF EXISTS public.persist_will_ai_turn(uuid, uuid, text, text, uuid[], boolean, text[]);

CREATE OR REPLACE FUNCTION public.persist_will_ai_turn(
  p_conversation_id uuid,
  p_owner_id uuid,
  p_user_message text,
  p_assistant_message text,
  p_cited_chunk_ids uuid[],
  p_used_fallback boolean,
  p_used_fact_keys text[] DEFAULT '{}'::text[]
)
RETURNS TABLE(
  conversation_id uuid,
  user_id uuid,
  user_created_at timestamptz,
  assistant_id uuid,
  assistant_content text,
  assistant_cited_chunk_ids jsonb,
  assistant_used_fallback boolean,
  assistant_used_fact_keys text[],
  assistant_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid := p_conversation_id;
  v_user_row public.will_ai_messages%ROWTYPE;
  v_assistant_row public.will_ai_messages%ROWTYPE;
BEGIN
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.will_ai_conversations (owner_id)
    VALUES (p_owner_id)
    RETURNING id INTO v_conversation_id;
  END IF;

  INSERT INTO public.will_ai_messages (
    conversation_id, owner_id, role, content, cited_chunk_ids, used_fallback, used_fact_keys
  )
  VALUES (
    v_conversation_id, p_owner_id, 'user', p_user_message,
    to_jsonb(ARRAY[]::uuid[]), false, ARRAY[]::text[]
  )
  RETURNING * INTO v_user_row;

  INSERT INTO public.will_ai_messages (
    conversation_id, owner_id, role, content, cited_chunk_ids, used_fallback, used_fact_keys
  )
  VALUES (
    v_conversation_id, p_owner_id, 'assistant', p_assistant_message,
    to_jsonb(COALESCE(p_cited_chunk_ids, ARRAY[]::uuid[])),
    p_used_fallback,
    COALESCE(p_used_fact_keys, ARRAY[]::text[])
  )
  RETURNING * INTO v_assistant_row;

  RETURN QUERY SELECT
    v_conversation_id,
    v_user_row.id,
    v_user_row.created_at,
    v_assistant_row.id,
    v_assistant_row.content,
    v_assistant_row.cited_chunk_ids,
    v_assistant_row.used_fallback,
    v_assistant_row.used_fact_keys,
    v_assistant_row.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.persist_will_ai_turn(
  uuid, uuid, text, text, uuid[], boolean, text[]
) TO authenticated;
