-- Create module_versions table for storing module configuration versions
CREATE TABLE IF NOT EXISTS public.module_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  module_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_template BOOLEAN NOT NULL DEFAULT false,
  template_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.module_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for module_versions
CREATE POLICY "Authenticated users can view module versions"
  ON public.module_versions
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create module versions"
  ON public.module_versions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete their own module versions"
  ON public.module_versions
  FOR DELETE
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can update their own module versions"
  ON public.module_versions
  FOR UPDATE
  USING (created_by = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_module_versions_module_id ON public.module_versions(module_id);
CREATE INDEX IF NOT EXISTS idx_module_versions_agent_id ON public.module_versions(agent_id);
CREATE INDEX IF NOT EXISTS idx_module_versions_is_template ON public.module_versions(is_template);