-- Create table for column/stage change logs
CREATE TABLE IF NOT EXISTS public.column_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'deleted', 'updated', 'renamed'
  column_id TEXT,
  column_title TEXT,
  old_value TEXT,
  new_value TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.column_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view column logs"
  ON public.column_logs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create column logs"
  ON public.column_logs FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_column_logs_task_id ON public.column_logs(task_id);
CREATE INDEX idx_column_logs_created_at ON public.column_logs(created_at DESC);