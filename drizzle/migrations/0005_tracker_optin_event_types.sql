-- Tracker Phase 1: add opt-in event types

-- 1. Widen the allowed event_type values.
--    Old: tracker_events_event_type_check CHECK (event_type = ANY (ARRAY['click'::text, 'book_button'::text, 'booking'::text]))
ALTER TABLE public.tracker_events
  DROP CONSTRAINT tracker_events_event_type_check;

ALTER TABLE public.tracker_events
  ADD CONSTRAINT tracker_events_event_type_check
  CHECK (event_type = ANY (ARRAY['click'::text, 'book_button'::text, 'booking'::text, 'optin_view'::text, 'optin'::text]));

-- 2. One opt-in per visitor (mirrors ux_tracker_book_button_per_visitor).
CREATE UNIQUE INDEX ux_tracker_optin_per_visitor
  ON public.tracker_events (visitor_id)
  WHERE event_type = 'optin';
