-- Add parent_id column to tasks table to support nested tasks
ALTER TABLE public.tasks ADD COLUMN parent_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_tasks_parent_id ON public.tasks(parent_id);

-- Add order column for subtasks ordering within parent
ALTER TABLE public.tasks ADD COLUMN subtask_order integer DEFAULT 0;