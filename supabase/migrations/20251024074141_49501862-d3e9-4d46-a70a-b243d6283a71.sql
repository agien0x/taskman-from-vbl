-- Fix security warning: set search_path for the function
CREATE OR REPLACE FUNCTION public.check_circular_dependency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE task_tree AS (
      SELECT parent_id, child_id 
      FROM public.task_relations 
      WHERE child_id = NEW.parent_id
      UNION
      SELECT tr.parent_id, tr.child_id 
      FROM public.task_relations tr
      JOIN task_tree tt ON tr.child_id = tt.parent_id
    )
    SELECT 1 FROM task_tree WHERE parent_id = NEW.child_id
  ) THEN
    RAISE EXCEPTION 'Circular dependency detected';
  END IF;
  RETURN NEW;
END;
$$;