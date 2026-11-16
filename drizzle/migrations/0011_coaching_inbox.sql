CREATE OR REPLACE FUNCTION public.get_coaching_inbox()
RETURNS TABLE (
  owner_id uuid,
  full_name text,
  email text,
  last_message_body text,
  last_message_at timestamptz,
  awaiting_reply boolean,
  awaiting_since timestamptz,
  tasks_done integer,
  tasks_total integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    CASE WHEN lm.body IS NULL THEN NULL
         ELSE pg_catalog.left(pg_catalog.btrim(pg_catalog.regexp_replace(lm.body, '\s+', ' ', 'g')), 140)
    END,
    lm.created_at,
    COALESCE(lm.sender_id = p.id, false),
    CASE WHEN lm.sender_id = p.id THEN (
      SELECT pg_catalog.min(om.created_at)
        FROM public.coaching_messages om
       WHERE om.owner_id = p.id
         AND om.sender_id = p.id
         AND om.created_at > COALESCE((
           SELECT pg_catalog.max(sm.created_at)
             FROM public.coaching_messages sm
            WHERE sm.owner_id = p.id
              AND sm.sender_id <> p.id
         ), '-infinity'::timestamptz)
    ) END,
    COALESCE(tk.done_count, 0)::integer,
    COALESCE(tk.total_count, 0)::integer
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT m.body, m.created_at, m.sender_id
      FROM public.coaching_messages m
     WHERE m.owner_id = p.id
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT 1
  ) lm ON true
  LEFT JOIN LATERAL (
    SELECT pg_catalog.count(*) FILTER (WHERE t.done) AS done_count,
           pg_catalog.count(*) AS total_count
      FROM public.coaching_tasks t
     WHERE t.owner_id = p.id
  ) tk ON true
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles r
     WHERE r.user_id = p.id
       AND r.role = 'owner'::public.app_role
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_coaching_inbox() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coaching_inbox() TO authenticated;