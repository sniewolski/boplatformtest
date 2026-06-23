
-- =====================================================
-- content_review_assets
-- =====================================================
create table public.content_review_assets (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  category      text not null,
  title         text not null,
  input_type    text not null check (input_type in ('text','pdf','md','image')),
  body_text     text,
  storage_path  text,
  review_status text not null default 'pending'
                check (review_status in ('pending','reviewed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

grant select, insert, update, delete on public.content_review_assets to authenticated;
grant all on public.content_review_assets to service_role;

alter table public.content_review_assets enable row level security;

create policy "assets_select" on public.content_review_assets
  for select using (
    owner_id = auth.uid() or public.has_role(auth.uid(), 'admin')
  );
create policy "assets_insert" on public.content_review_assets
  for insert with check (
    owner_id = auth.uid() or public.has_role(auth.uid(), 'admin')
  );
create policy "assets_update" on public.content_review_assets
  for update using (
    owner_id = auth.uid() or public.has_role(auth.uid(), 'admin')
  ) with check (
    owner_id = auth.uid() or public.has_role(auth.uid(), 'admin')
  );
create policy "assets_delete" on public.content_review_assets
  for delete using (
    owner_id = auth.uid() or public.has_role(auth.uid(), 'admin')
  );

create index content_review_assets_owner_idx on public.content_review_assets(owner_id);
create index content_review_assets_category_idx on public.content_review_assets(owner_id, category);

create trigger content_review_assets_touch_updated_at
  before update on public.content_review_assets
  for each row execute function public.touch_updated_at();

-- =====================================================
-- content_review_notes
-- =====================================================
create table public.content_review_notes (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid not null references public.content_review_assets(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  author_id   uuid references auth.users(id),
  source      text not null default 'coach'
              check (source in ('coach','ai_suggestion')),
  status      text not null default 'draft'
              check (status in ('draft','published')),
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

grant select, insert, update, delete on public.content_review_notes to authenticated;
grant all on public.content_review_notes to service_role;

alter table public.content_review_notes enable row level security;

-- LOAD-BEARING: owners only see published notes on their own assets.
-- Admins see every note (including drafts and AI suggestions).
create policy "notes_select" on public.content_review_notes
  for select using (
    public.has_role(auth.uid(), 'admin')
    or (status = 'published' and owner_id = auth.uid())
  );

-- Admin-only writes. Owners can NEVER author notes.
create policy "notes_insert" on public.content_review_notes
  for insert with check ( public.has_role(auth.uid(), 'admin') );
create policy "notes_update" on public.content_review_notes
  for update using ( public.has_role(auth.uid(), 'admin') )
                with check ( public.has_role(auth.uid(), 'admin') );
create policy "notes_delete" on public.content_review_notes
  for delete using ( public.has_role(auth.uid(), 'admin') );

create index content_review_notes_asset_idx on public.content_review_notes(asset_id);
create index content_review_notes_owner_idx on public.content_review_notes(owner_id);

create trigger content_review_notes_touch_updated_at
  before update on public.content_review_notes
  for each row execute function public.touch_updated_at();

-- =====================================================
-- Publish -> reviewed automation
-- =====================================================
create or replace function public.content_review_mark_asset_reviewed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    update public.content_review_assets
       set review_status = 'reviewed'
     where id = new.asset_id;
  end if;
  return new;
end;
$$;

create trigger content_review_notes_publish_marks_asset
  after insert or update of status on public.content_review_notes
  for each row execute function public.content_review_mark_asset_reviewed();

-- =====================================================
-- Storage policies for the private `content-review` bucket
-- Path convention: {owner_id}/{asset_id}/{filename}
-- storage.foldername(name)[1] = owner_id (text)
-- =====================================================
create policy "content_review_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'content-review'
    and (
      public.has_role(auth.uid(), 'admin')
      or auth.uid()::text = (storage.foldername(name))[1]
    )
  );

create policy "content_review_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'content-review'
    and (
      public.has_role(auth.uid(), 'admin')
      or auth.uid()::text = (storage.foldername(name))[1]
    )
  );

create policy "content_review_storage_update_own"
  on storage.objects for update
  using (
    bucket_id = 'content-review'
    and (
      public.has_role(auth.uid(), 'admin')
      or auth.uid()::text = (storage.foldername(name))[1]
    )
  )
  with check (
    bucket_id = 'content-review'
    and (
      public.has_role(auth.uid(), 'admin')
      or auth.uid()::text = (storage.foldername(name))[1]
    )
  );

create policy "content_review_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'content-review'
    and (
      public.has_role(auth.uid(), 'admin')
      or auth.uid()::text = (storage.foldername(name))[1]
    )
  );
