-- Add duplicates field to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS duplicates jsonb DEFAULT '[]'::jsonb;