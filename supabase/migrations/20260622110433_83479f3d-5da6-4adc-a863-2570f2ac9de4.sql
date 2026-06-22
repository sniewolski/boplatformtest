-- has_role is meant to be called from RLS policies (signed-in users).
revoke execute on function public.has_role(uuid, public.app_role) from public;
revoke execute on function public.has_role(uuid, public.app_role) from anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to service_role;

-- touch_updated_at is only invoked by triggers; no one needs direct execute.
revoke execute on function public.touch_updated_at() from public;
revoke execute on function public.touch_updated_at() from anon;
revoke execute on function public.touch_updated_at() from authenticated;