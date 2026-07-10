
CREATE OR REPLACE FUNCTION public.will_ai_ingestion_wake()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(7700000000000002);
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-will-ai-ingestion') THEN
    BEGIN
      PERFORM cron.schedule('process-will-ai-ingestion', '5 seconds', $cron$ SELECT public.will_ai_ingestion_dispatch(); $cron$);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'will_ai_ingestion_wake: cron schedule failed: %', SQLERRM;
    END;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://ezmtptfptyzoxqmcgebi.supabase.co/functions/v1/will-ai-ingest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Lovable-Context', 'cron',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
        )
      ),
      body := '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'will_ai_ingestion_wake failed (insert preserved): %', SQLERRM;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.will_ai_ingestion_dispatch()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgmq.q_will_ai_ingestion) THEN
    BEGIN
      PERFORM pg_catalog.pg_advisory_xact_lock(7700000000000002);
      IF EXISTS (SELECT 1 FROM pgmq.q_will_ai_ingestion) THEN
        RETURN;
      END IF;
      PERFORM cron.unschedule('process-will-ai-ingestion');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'will_ai_ingestion_dispatch: cron unschedule failed: %', SQLERRM;
    END;
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://ezmtptfptyzoxqmcgebi.supabase.co/functions/v1/will-ai-ingest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
END;
$function$;
