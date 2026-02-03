-- Add missing modules column to agent_versions table
ALTER TABLE public.agent_versions
ADD COLUMN IF NOT EXISTS modules jsonb DEFAULT '[]'::jsonb;