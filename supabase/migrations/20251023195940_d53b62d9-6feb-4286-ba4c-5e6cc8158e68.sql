-- Create task_versions table for storing task history
CREATE TABLE IF NOT EXISTS public.task_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_versions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view task versions"
  ON public.task_versions
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create task versions"
  ON public.task_versions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete task versions"
  ON public.task_versions
  FOR DELETE
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_task_versions_task_id ON public.task_versions(task_id, created_at DESC);