-- Add custom_columns field to tasks table to store custom kanban columns for each task
ALTER TABLE public.tasks
ADD COLUMN custom_columns JSONB DEFAULT NULL;

-- Add a comment to explain the structure
COMMENT ON COLUMN public.tasks.custom_columns IS 'Custom kanban columns for this task. If NULL, uses default columns (todo, in-progress, done). Format: [{"id": "string", "title": "string"}]';