CREATE TABLE public.coaching_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(btrim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coaching_messages_owner_created_idx ON public.coaching_messages (owner_id, created_at);
GRANT SELECT, INSERT ON public.coaching_messages TO authenticated;
GRANT ALL ON public.coaching_messages TO service_role;
ALTER TABLE public.coaching_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coaching_messages select own or admin" ON public.coaching_messages FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "coaching_messages insert own or admin" ON public.coaching_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE TABLE public.coaching_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coaching_tasks_owner_created_idx ON public.coaching_tasks (owner_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_tasks TO authenticated;
GRANT ALL ON public.coaching_tasks TO service_role;
ALTER TABLE public.coaching_tasks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER coaching_tasks_touch_updated_at BEFORE UPDATE ON public.coaching_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE POLICY "coaching_tasks select own or admin" ON public.coaching_tasks FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "coaching_tasks insert admin" ON public.coaching_tasks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "coaching_tasks update admin" ON public.coaching_tasks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "coaching_tasks delete admin" ON public.coaching_tasks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_coaching_task_done(_task_id uuid, _done boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.coaching_tasks
     SET done = _done,
         done_at = CASE WHEN _done THEN pg_catalog.now() ELSE NULL END
   WHERE id = _task_id
     AND owner_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_coaching_task_done(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_coaching_task_done(uuid, boolean) TO authenticated;