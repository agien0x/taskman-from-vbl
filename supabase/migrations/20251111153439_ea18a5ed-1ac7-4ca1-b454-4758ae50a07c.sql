-- Create agent_input_versions table for storing agent input history
CREATE TABLE public.agent_input_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_input_versions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view agent input versions"
  ON public.agent_input_versions
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create agent input versions"
  ON public.agent_input_versions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete agent input versions"
  ON public.agent_input_versions
  FOR DELETE
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_agent_input_versions_agent_id ON public.agent_input_versions(agent_id);
CREATE INDEX idx_agent_input_versions_created_at ON public.agent_input_versions(created_at DESC);