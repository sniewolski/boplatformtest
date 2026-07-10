DROP FUNCTION IF EXISTS public.persist_will_ai_turn(uuid, uuid, text, text, uuid[], boolean);

CREATE OR REPLACE FUNCTION public.persist_will_ai_turn(
  p_conversation_id uuid,
  p_owner_id uuid,
  p_user_message text,
  p_assistant_message text,
  p_cited_chunk_ids uuid[],
  p_used_fallback boolean
)
RETURNS TABLE(
  conversation_id uuid,
  user_id uuid,
  user_created_at timestamptz,
  assistant_id uuid,
  assistant_content text,
  assistant_cited_chunk_ids jsonb,
  assistant_used_fallback boolean,
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
    conversation_id, owner_id, role, content, cited_chunk_ids, used_fallback
  )
  VALUES (
    v_conversation_id, p_owner_id, 'user', p_user_message, to_jsonb(ARRAY[]::uuid[]), false
  )
  RETURNING * INTO v_user_row;

  INSERT INTO public.will_ai_messages (
    conversation_id, owner_id, role, content, cited_chunk_ids, used_fallback
  )
  VALUES (
    v_conversation_id, p_owner_id, 'assistant', p_assistant_message,
    to_jsonb(COALESCE(p_cited_chunk_ids, ARRAY[]::uuid[])), p_used_fallback
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
    v_assistant_row.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.persist_will_ai_turn(
  uuid, uuid, text, text, uuid[], boolean
) TO authenticated;