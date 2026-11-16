CREATE OR REPLACE FUNCTION public.get_coaching_sender_names()
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.full_name
    FROM public.profiles p
   WHERE p.id IN (
     SELECT DISTINCT m.sender_id
       FROM public.coaching_messages m
      WHERE m.owner_id = auth.uid()
   );
$$;
REVOKE ALL ON FUNCTION public.get_coaching_sender_names() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coaching_sender_names() TO authenticated;