-- Add priority, start_date, and end_date to tasks table
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');

ALTER TABLE public.tasks 
ADD COLUMN priority public.task_priority DEFAULT 'medium',
ADD COLUMN start_date timestamp with time zone,
ADD COLUMN end_date timestamp with time zone;