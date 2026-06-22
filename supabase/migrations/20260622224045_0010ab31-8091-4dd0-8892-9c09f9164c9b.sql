create table public.selling_systems_audit_conversion (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  industry text,
  period text not null default 'month' check (period in ('month','quarter','year')),
  avg_deal_value numeric,
  stage_volumes jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.selling_systems_audit_conversion to authenticated;
grant all on public.selling_systems_audit_conversion to service_role;

alter table public.selling_systems_audit_conversion enable row level security;

create policy "ssa_conversion owner select"
on public.selling_systems_audit_conversion
for select
to authenticated
using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "ssa_conversion owner insert"
on public.selling_systems_audit_conversion
for insert
to authenticated
with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "ssa_conversion owner update"
on public.selling_systems_audit_conversion
for update
to authenticated
using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "ssa_conversion owner delete"
on public.selling_systems_audit_conversion
for delete
to authenticated
using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create trigger ssa_conversion_touch_updated_at
before update on public.selling_systems_audit_conversion
for each row execute function public.touch_updated_at();