-- Add time planning field to tasks
ALTER TABLE public.tasks 
ADD COLUMN planned_hours numeric(5,2) DEFAULT NULL;

-- Create time_logs table for tracking actual time spent
CREATE TABLE public.time_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  hours numeric(5,2) NOT NULL,
  description text NOT NULL,
  completion_percentage integer CHECK (completion_percentage IN (10, 25, 50, 75, 90, 100)),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for time_logs
CREATE POLICY "Authenticated users can view time logs"
ON public.time_logs FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create time logs"
ON public.time_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time logs"
ON public.time_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time logs"
ON public.time_logs FOR DELETE
USING (auth.uid() = user_id);