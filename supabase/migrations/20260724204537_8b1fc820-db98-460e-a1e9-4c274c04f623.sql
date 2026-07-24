-- Tracker: admin-only funnel attribution. Not owner-scoped by design.

-- anon may INSERT events only; admin may SELECT. tracked_videos is service-role written, admin read.
create table public.tracker_events (
  id           uuid primary key default gen_random_uuid(),
  event_type   text not null check (event_type in ('click','book_button','booking')),
  visitor_id   text not null,
  source_type  text,               -- 'video' in V1; null = direct/unattributed
  source_value text,               -- youtube video id when source_type='video'; null = direct
  booking_id   text,               -- calendly invitee id; only present on booking events
  referrer     text,
  created_at   timestamptz not null default now()
);

-- Dedup guarantees. The capture script inserts and ignores the 409 on conflict.
-- one booking row per calendly booking id:
create unique index ux_tracker_booking_id
  on public.tracker_events (booking_id)
  where booking_id is not null;

-- one book_button per visitor (funnel counts people, not raw clicks):
create unique index ux_tracker_book_button_per_visitor
  on public.tracker_events (visitor_id)
  where event_type = 'book_button';

-- Dashboard query support (date-range filter + per-video grouping):
create index ix_tracker_created_at on public.tracker_events (created_at);
create index ix_tracker_source_value on public.tracker_events (source_value);

grant insert on public.tracker_events to anon;
grant select on public.tracker_events to authenticated;
grant all    on public.tracker_events to service_role;

alter table public.tracker_events enable row level security;

create policy "anon inserts tracker_events"
  on public.tracker_events for insert to anon
  with check (true);

create policy "admin reads tracker_events"
  on public.tracker_events for select to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

-- deliberately no update/delete policies: not permitted from the client.

create table public.tracked_videos (
  video_id      text primary key,   -- youtube video id
  title         text,               -- populated later by the oembed resolver (phase 3)
  thumbnail_url text,
  first_seen_at timestamptz not null default now(),
  resolved_at   timestamptz         -- null = metadata not yet resolved
);

grant select on public.tracked_videos to authenticated;
grant all    on public.tracked_videos to service_role;

alter table public.tracked_videos enable row level security;

create policy "admin reads tracked_videos"
  on public.tracked_videos for select to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

-- writes only via service_role (the resolver edge function, phase 3).