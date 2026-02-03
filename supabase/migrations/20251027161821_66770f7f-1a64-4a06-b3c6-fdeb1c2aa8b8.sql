-- Add is_root column to tasks table
ALTER TABLE public.tasks
ADD COLUMN is_root BOOLEAN NOT NULL DEFAULT false;

-- Create index for quick lookup of root tasks
CREATE INDEX idx_tasks_is_root ON public.tasks(is_root) WHERE is_root = true;

-- Set existing root task as root
UPDATE public.tasks
SET is_root = true
WHERE id = 'bee63fd2-6a5a-48de-964d-ea063deaf355';

-- Set the new root task as root
UPDATE public.tasks
SET is_root = true
WHERE id = 'cc8f5e95-a759-4543-9e62-50793b8703fe';