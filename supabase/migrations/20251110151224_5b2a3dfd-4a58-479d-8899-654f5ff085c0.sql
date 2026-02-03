-- Add recurrence_time column to task_type_templates table
ALTER TABLE public.task_type_templates 
ADD COLUMN IF NOT EXISTS recurrence_time time DEFAULT '09:00:00'::time;

-- Add recurrence_time column to tasks table for individual task settings
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_time time DEFAULT '09:00:00'::time;