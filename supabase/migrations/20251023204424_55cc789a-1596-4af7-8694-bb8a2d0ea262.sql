-- Add title column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN title text;

-- Set default title for existing tasks (take first 50 chars from content)
UPDATE public.tasks 
SET title = SUBSTRING(content, 1, 50) 
WHERE title IS NULL;

-- Make title required for new tasks
ALTER TABLE public.tasks 
ALTER COLUMN title SET NOT NULL;