CREATE OR REPLACE FUNCTION public.requeue_will_ai_ingestion(
  old_msg_id bigint,
  queue_name text,
  source_id uuid
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  new_id bigint;
BEGIN
  -- Both operations run in the implicit function transaction: either both
  -- commit or neither does. A crash mid-way leaves the original message
  -- intact, which falls back to its existing VT-based retry.
  PERFORM pgmq.delete(queue_name, old_msg_id);
  SELECT pgmq.send(queue_name, jsonb_build_object('source_id', source_id)) INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.requeue_will_ai_ingestion(bigint, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.requeue_will_ai_ingestion(bigint, text, uuid) TO service_role;