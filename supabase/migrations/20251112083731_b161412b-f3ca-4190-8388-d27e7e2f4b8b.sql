-- Fix search_path security issue for search_similar_tasks function
DROP FUNCTION IF EXISTS search_similar_tasks(vector, text, integer, float);

CREATE OR REPLACE FUNCTION search_similar_tasks(
  query_embedding vector(384),
  query_text text,
  limit_count integer DEFAULT 10,
  similarity_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  column_id text,
  subtask_order integer,
  similarity_score float,
  freshness_score float,
  exact_match_score float,
  final_score float,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql 
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.content,
    t.column_id,
    t.subtask_order,
    -- Vector similarity (cosine similarity, 60% weight)
    GREATEST(0, 1 - (t.content_embedding <=> query_embedding)) * 0.6 as similarity_score,
    -- Freshness score (20% weight) - newer tasks get higher scores
    GREATEST(0, 1 - EXTRACT(EPOCH FROM (NOW() - t.updated_at)) / (30 * 24 * 3600)) * 0.2 as freshness_score,
    -- Exact match score (20% weight)
    CASE 
      WHEN t.title ILIKE '%' || query_text || '%' OR t.content ILIKE '%' || query_text || '%' 
      THEN 0.2
      ELSE 0.0
    END as exact_match_score,
    -- Final combined score
    (
      GREATEST(0, 1 - (t.content_embedding <=> query_embedding)) * 0.6 +
      GREATEST(0, 1 - EXTRACT(EPOCH FROM (NOW() - t.updated_at)) / (30 * 24 * 3600)) * 0.2 +
      CASE 
        WHEN t.title ILIKE '%' || query_text || '%' OR t.content ILIKE '%' || query_text || '%' 
        THEN 0.2
        ELSE 0.0
      END
    ) as final_score,
    t.created_at,
    t.updated_at
  FROM public.tasks t
  WHERE t.content_embedding IS NOT NULL
  ORDER BY final_score DESC
  LIMIT limit_count;
END;
$$;