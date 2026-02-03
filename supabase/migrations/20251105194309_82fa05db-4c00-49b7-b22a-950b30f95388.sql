-- Create agent_executions table for tracking all agent runs
CREATE TABLE public.agent_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  execution_type TEXT NOT NULL,
  input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  rating INTEGER CHECK (rating >= 0 AND rating <= 5),
  rating_comment TEXT,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rated_by UUID REFERENCES auth.users(id),
  rated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view agent executions"
  ON public.agent_executions
  FOR SELECT
  USING (true);

CREATE POLICY "System can insert agent executions"
  ON public.agent_executions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can rate executions"
  ON public.agent_executions
  FOR UPDATE
  USING (true);

-- Indexes for performance
CREATE INDEX idx_agent_executions_agent_id ON public.agent_executions(agent_id);
CREATE INDEX idx_agent_executions_type ON public.agent_executions(execution_type);
CREATE INDEX idx_agent_executions_created_at ON public.agent_executions(created_at DESC);