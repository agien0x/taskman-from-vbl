-- Add pitch column to tasks table
ALTER TABLE public.tasks
ADD COLUMN pitch TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.tasks.pitch IS 'Short pitch/summary of the task (under 8 words)';