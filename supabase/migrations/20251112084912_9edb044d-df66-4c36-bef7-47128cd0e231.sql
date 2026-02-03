-- Create function to get embedding statistics
CREATE OR REPLACE FUNCTION get_embedding_stats()
RETURNS TABLE (
  total_tasks bigint,
  tasks_with_embeddings bigint,
  tasks_without_embeddings bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) as total_tasks,
    COUNT(content_embedding) as tasks_with_embeddings,
    COUNT(*) - COUNT(content_embedding) as tasks_without_embeddings
  FROM public.tasks;
$$;