
-- 1. pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. will_ai_sources
CREATE TABLE public.will_ai_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('book','video','podcast','blog_post','document')),
  title text NOT NULL,
  author text,
  storage_path text,
  external_url text,
  total_pages integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.will_ai_sources TO authenticated;
GRANT ALL ON public.will_ai_sources TO service_role;
ALTER TABLE public.will_ai_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY will_ai_sources_select ON public.will_ai_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY will_ai_sources_insert ON public.will_ai_sources FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY will_ai_sources_update ON public.will_ai_sources FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY will_ai_sources_delete ON public.will_ai_sources FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER will_ai_sources_touch BEFORE UPDATE ON public.will_ai_sources FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. will_ai_chunks
CREATE TABLE public.will_ai_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.will_ai_sources(id) ON DELETE CASCADE,
  chunk_type text NOT NULL CHECK (chunk_type IN ('text','diagram')),
  content text NOT NULL,
  page_number integer,
  section_label text,
  timestamp_seconds integer,
  image_storage_path text,
  embedding vector(768),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.will_ai_chunks TO authenticated;
GRANT ALL ON public.will_ai_chunks TO service_role;
ALTER TABLE public.will_ai_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY will_ai_chunks_select ON public.will_ai_chunks FOR SELECT TO authenticated USING (true);
CREATE POLICY will_ai_chunks_insert ON public.will_ai_chunks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY will_ai_chunks_update ON public.will_ai_chunks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY will_ai_chunks_delete ON public.will_ai_chunks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX will_ai_chunks_source_id_idx ON public.will_ai_chunks(source_id);
-- HNSW index for cosine distance; grows well without periodic rebuilds
CREATE INDEX will_ai_chunks_embedding_idx ON public.will_ai_chunks USING hnsw (embedding vector_cosine_ops);

-- 4. will_ai_conversations
CREATE TABLE public.will_ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.will_ai_conversations TO authenticated;
GRANT ALL ON public.will_ai_conversations TO service_role;
ALTER TABLE public.will_ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY will_ai_conversations_select ON public.will_ai_conversations FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY will_ai_conversations_insert ON public.will_ai_conversations FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY will_ai_conversations_update ON public.will_ai_conversations FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY will_ai_conversations_delete ON public.will_ai_conversations FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE INDEX will_ai_conversations_owner_idx ON public.will_ai_conversations(owner_id);

-- 5. will_ai_messages
CREATE TABLE public.will_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.will_ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  cited_chunk_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  used_fallback boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.will_ai_messages TO authenticated;
GRANT ALL ON public.will_ai_messages TO service_role;
ALTER TABLE public.will_ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY will_ai_messages_select ON public.will_ai_messages FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY will_ai_messages_insert ON public.will_ai_messages FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY will_ai_messages_update ON public.will_ai_messages FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY will_ai_messages_delete ON public.will_ai_messages FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE INDEX will_ai_messages_conversation_idx ON public.will_ai_messages(conversation_id);
CREATE INDEX will_ai_messages_owner_created_idx ON public.will_ai_messages(owner_id, created_at DESC);
CREATE INDEX will_ai_messages_fallback_idx ON public.will_ai_messages(created_at DESC) WHERE used_fallback = true;

-- 6. pgmq queues
SELECT pgmq.create('will_ai_ingestion');
SELECT pgmq.create('will_ai_ingestion_dlq');

-- 7. Self-disarming dispatch (mirrors email_queue_dispatch)
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
    url := 'https://project--d6bc2cee-66be-4752-a74b-5adb8d12ce04.lovable.app/api/public/hooks/will-ai-ingest',
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

-- 8. Wake trigger (mirrors email_queue_wake)
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
      url := 'https://project--d6bc2cee-66be-4752-a74b-5adb8d12ce04.lovable.app/api/public/hooks/will-ai-ingest',
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

CREATE TRIGGER will_ai_sources_wake
AFTER INSERT ON public.will_ai_sources
FOR EACH ROW
EXECUTE FUNCTION public.will_ai_ingestion_wake();
