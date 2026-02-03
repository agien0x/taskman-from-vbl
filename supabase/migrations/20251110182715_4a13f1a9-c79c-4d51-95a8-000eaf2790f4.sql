-- Fix task deletion by updating the foreign key constraint to cascade deletes
-- This allows task_logs to be automatically deleted when a task is deleted

-- Drop the existing constraint
ALTER TABLE public.task_logs 
DROP CONSTRAINT IF EXISTS task_logs_task_id_fkey;

-- Add new constraint with ON DELETE CASCADE
ALTER TABLE public.task_logs 
ADD CONSTRAINT task_logs_task_id_fkey 
FOREIGN KEY (task_id) 
REFERENCES public.tasks(id) 
ON DELETE CASCADE;