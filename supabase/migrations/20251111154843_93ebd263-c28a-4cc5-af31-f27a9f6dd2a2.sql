-- Create table for agent input version ratings
CREATE TABLE IF NOT EXISTS public.agent_input_version_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.agent_input_versions(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
  comment TEXT,
  rated_by UUID REFERENCES auth.users(id),
  rated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_input_version_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view ratings"
  ON public.agent_input_version_ratings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create ratings"
  ON public.agent_input_version_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own ratings"
  ON public.agent_input_version_ratings
  FOR UPDATE
  TO authenticated
  USING (rated_by = auth.uid());

CREATE POLICY "Users can delete their own ratings"
  ON public.agent_input_version_ratings
  FOR DELETE
  TO authenticated
  USING (rated_by = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_agent_input_version_ratings_version_id ON public.agent_input_version_ratings(version_id);
CREATE INDEX idx_agent_input_version_ratings_rated_by ON public.agent_input_version_ratings(rated_by);