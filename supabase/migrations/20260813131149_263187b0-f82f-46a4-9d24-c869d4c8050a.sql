ALTER TABLE public.activity_events DROP CONSTRAINT IF EXISTS activity_events_event_type_check;
ALTER TABLE public.activity_events ADD CONSTRAINT activity_events_event_type_check CHECK (event_type IN ('login', 'heartbeat', 'resource_open', 'tool_view'));
