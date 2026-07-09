CREATE OR REPLACE FUNCTION public.match_will_ai_chunks(
  query_embedding vector(768),
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  source_id uuid,
  chunk_type text,
  content text,
  section_label text,
  page_number int,
  image_storage_path text,
  distance double precision
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    c.id,
    c.source_id,
    c.chunk_type,
    c.content,
    c.section_label,
    c.page_number,
    c.image_storage_path,
    (c.embedding <=> query_embedding)::double precision AS distance
  FROM public.will_ai_chunks c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_will_ai_chunks(vector, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_will_ai_chunks(vector, int) TO service_role;