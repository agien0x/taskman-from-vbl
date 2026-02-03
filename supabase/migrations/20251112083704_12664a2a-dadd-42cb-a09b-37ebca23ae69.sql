-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to task_versions table
ALTER TABLE task_versions 
ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS task_versions_embedding_idx 
ON task_versions 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add embedding column to tasks table for current content
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS content_embedding vector(384);

-- Create index for vector similarity search on tasks
CREATE INDEX IF NOT EXISTS tasks_content_embedding_idx 
ON tasks 
USING ivfflat (content_embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to search similar tasks using hybrid approach
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
) AS $$
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
  FROM tasks t
  WHERE t.content_embedding IS NOT NULL
    AND (
      -- Use vector search when no exact match
      (t.title NOT ILIKE '%' || query_text || '%' AND t.content NOT ILIKE '%' || query_text || '%')
      OR
      -- Or always include for hybrid ranking
      true
    )
  ORDER BY final_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;