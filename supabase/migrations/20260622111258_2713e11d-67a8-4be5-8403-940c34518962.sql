create table public.respondent_sessions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  tool_key text not null,
  status text not null default 'pending'
    check (status in ('pending','in_progress','completed','expired','revoked')),
  respondent_name text,
  respondent_email text,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  expires_at timestamptz,
  consent jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

grant select, insert, update, delete on public.respondent_sessions to authenticated;
grant all on public.respondent_sessions to service_role;

alter table public.respondent_sessions enable row level security;

create policy "respondent_sessions owner select"
on public.respondent_sessions
for select
to authenticated
using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "respondent_sessions owner insert"
on public.respondent_sessions
for insert
to authenticated
with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "respondent_sessions owner update"
on public.respondent_sessions
for update
to authenticated
using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "respondent_sessions owner delete"
on public.respondent_sessions
for delete
to authenticated
using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create trigger respondent_sessions_touch_updated_at
before update on public.respondent_sessions
for each row execute function public.touch_updated_at();

create index respondent_sessions_owner_idx
  on public.respondent_sessions(owner_id);
create index respondent_sessions_tool_idx
  on public.respondent_sessions(tool_key);