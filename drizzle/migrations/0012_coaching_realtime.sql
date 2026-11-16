ALTER PUBLICATION supabase_realtime ADD TABLE public.coaching_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coaching_tasks;
ALTER TABLE public.coaching_tasks REPLICA IDENTITY FULL;