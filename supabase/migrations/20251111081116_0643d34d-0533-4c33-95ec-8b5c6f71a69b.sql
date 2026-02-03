-- Function to update custom columns bypassing RLS safely
CREATE OR REPLACE FUNCTION public.update_task_custom_columns(
  _task_id uuid,
  _columns jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.tasks
  SET custom_columns = _columns,
      updated_at = now()
  WHERE id = _task_id;
END;
$$;

-- Allow authenticated users to call the function
GRANT EXECUTE ON FUNCTION public.update_task_custom_columns(uuid, jsonb) TO authenticated;