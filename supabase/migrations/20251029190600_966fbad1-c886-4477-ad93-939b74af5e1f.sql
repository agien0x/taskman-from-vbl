-- Add task_type column to tasks table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_type') THEN
    CREATE TYPE task_type AS ENUM ('task', 'personal_board', 'standard', 'function');
  END IF;
END $$;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS task_type task_type DEFAULT 'task';