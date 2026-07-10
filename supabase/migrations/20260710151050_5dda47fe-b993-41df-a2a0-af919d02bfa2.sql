
CREATE OR REPLACE FUNCTION public.get_ingest_cron_token()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
$$;

REVOKE ALL ON FUNCTION public.get_ingest_cron_token() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ingest_cron_token() TO service_role;
