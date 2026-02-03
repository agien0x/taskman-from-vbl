-- First, clean up invalid self-referencing parent_id values
UPDATE public.tasks 
SET parent_id = NULL 
WHERE parent_id = id;

-- Create task_relations table for many-to-many parent-child relationships
CREATE TABLE IF NOT EXISTS public.task_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(parent_id, child_id),
  CHECK (parent_id != child_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_task_relations_parent ON public.task_relations(parent_id);
CREATE INDEX IF NOT EXISTS idx_task_relations_child ON public.task_relations(child_id);

-- Migrate existing valid parent_id data to task_relations
INSERT INTO public.task_relations (parent_id, child_id)
SELECT parent_id, id 
FROM public.tasks 
WHERE parent_id IS NOT NULL AND parent_id != id
ON CONFLICT (parent_id, child_id) DO NOTHING;

-- Remove the old parent_id column from tasks table
ALTER TABLE public.tasks DROP COLUMN IF EXISTS parent_id;

-- Enable RLS on task_relations
ALTER TABLE public.task_relations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task_relations
CREATE POLICY "Anyone can view task relations" 
ON public.task_relations 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create task relations" 
ON public.task_relations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete task relations" 
ON public.task_relations 
FOR DELETE 
USING (true);

-- Create function to check for circular dependencies
CREATE OR REPLACE FUNCTION public.check_circular_dependency()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to prevent circular relations
DROP TRIGGER IF EXISTS prevent_circular_relations ON public.task_relations;
CREATE TRIGGER prevent_circular_relations
  BEFORE INSERT ON public.task_relations
  FOR EACH ROW 
  EXECUTE FUNCTION public.check_circular_dependency();