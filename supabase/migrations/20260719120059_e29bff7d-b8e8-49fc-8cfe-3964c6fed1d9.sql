
-- Helper: elevated = admin or mentor
create or replace function public.is_elevated(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('admin','mentor')
  );
$$;

-- ============ Audit section notes / summaries (admin-only originally) ============
drop policy if exists admin_select_notes on public.audit_section_notes;
create policy admin_select_notes on public.audit_section_notes
  for select using (public.is_elevated(auth.uid()));

drop policy if exists admin_select_summaries on public.audit_section_summaries;
create policy admin_select_summaries on public.audit_section_summaries
  for select using (public.is_elevated(auth.uid()));

-- ============ Business briefs (owner OR admin) ============
drop policy if exists business_briefs_select_own_or_admin on public.business_briefs;
create policy business_briefs_select_own_or_admin on public.business_briefs
  for select using ((owner_id = auth.uid()) or public.is_elevated(auth.uid()));

-- ============ Content review assets (owner OR admin) ============
drop policy if exists assets_select on public.content_review_assets;
create policy assets_select on public.content_review_assets
  for select using ((owner_id = auth.uid()) or public.is_elevated(auth.uid()));

-- ============ Content review notes (admin OR (published AND own)) ============
drop policy if exists notes_select on public.content_review_notes;
create policy notes_select on public.content_review_notes
  for select using (public.is_elevated(auth.uid()) or ((status = 'published') and (owner_id = auth.uid())));

-- ============ Respondent sessions (owner OR admin) ============
drop policy if exists "respondent_sessions owner select" on public.respondent_sessions;
create policy "respondent_sessions owner select" on public.respondent_sessions
  for select using ((owner_id = auth.uid()) or public.is_elevated(auth.uid()));

-- ============ Salescode results (admin-only elevated policy) ============
drop policy if exists "Admins can read all salescode results" on public.salescode_results;
create policy "Admins can read all salescode results" on public.salescode_results
  for select using (public.is_elevated(auth.uid()));

-- ============ Selling systems audit intakes (admin-only elevated policies) ============
drop policy if exists "Admins can view all activity intakes" on public.selling_systems_audit_activity;
create policy "Admins can view all activity intakes" on public.selling_systems_audit_activity
  for select using (public.is_elevated(auth.uid()));

drop policy if exists "Admins can read all alignment intakes" on public.selling_systems_audit_alignment;
create policy "Admins can read all alignment intakes" on public.selling_systems_audit_alignment
  for select using (public.is_elevated(auth.uid()));

drop policy if exists "Admins can view all conversion intakes" on public.selling_systems_audit_conversion;
create policy "Admins can view all conversion intakes" on public.selling_systems_audit_conversion
  for select using (public.is_elevated(auth.uid()));

drop policy if exists "Admins read all messaging intakes" on public.selling_systems_audit_messaging;
create policy "Admins read all messaging intakes" on public.selling_systems_audit_messaging
  for select using (public.is_elevated(auth.uid()));

drop policy if exists "Admins can read all pipeline intakes" on public.selling_systems_audit_pipeline;
create policy "Admins can read all pipeline intakes" on public.selling_systems_audit_pipeline
  for select using (public.is_elevated(auth.uid()));

drop policy if exists "Admins can view all process intakes" on public.selling_systems_audit_process;
create policy "Admins can view all process intakes" on public.selling_systems_audit_process
  for select using (public.is_elevated(auth.uid()));

-- ============ Profiles: keep admin-all, add mentor read ============
create policy "profiles mentor read" on public.profiles
  for select using (public.has_role(auth.uid(), 'mentor'));

-- ============ SOPs writes → elevated ============
drop policy if exists sops_insert on public.sops;
create policy sops_insert on public.sops
  for insert with check (public.is_elevated(auth.uid()));

drop policy if exists sops_update on public.sops;
create policy sops_update on public.sops
  for update using (public.is_elevated(auth.uid())) with check (public.is_elevated(auth.uid()));

drop policy if exists sops_delete on public.sops;
create policy sops_delete on public.sops
  for delete using (public.is_elevated(auth.uid()));

drop policy if exists sop_folders_insert on public.sop_folders;
create policy sop_folders_insert on public.sop_folders
  for insert with check (public.is_elevated(auth.uid()));

drop policy if exists sop_folders_update on public.sop_folders;
create policy sop_folders_update on public.sop_folders
  for update using (public.is_elevated(auth.uid())) with check (public.is_elevated(auth.uid()));

drop policy if exists sop_folders_delete on public.sop_folders;
create policy sop_folders_delete on public.sop_folders
  for delete using (public.is_elevated(auth.uid()));

-- ============ Storage: sops bucket writes → elevated ============
drop policy if exists sops_storage_insert on storage.objects;
create policy sops_storage_insert on storage.objects
  for insert with check ((bucket_id = 'sops') and public.is_elevated(auth.uid()));

drop policy if exists sops_storage_update on storage.objects;
create policy sops_storage_update on storage.objects
  for update
  using ((bucket_id = 'sops') and public.is_elevated(auth.uid()))
  with check ((bucket_id = 'sops') and public.is_elevated(auth.uid()));

drop policy if exists sops_storage_delete on storage.objects;
create policy sops_storage_delete on storage.objects
  for delete using ((bucket_id = 'sops') and public.is_elevated(auth.uid()));
