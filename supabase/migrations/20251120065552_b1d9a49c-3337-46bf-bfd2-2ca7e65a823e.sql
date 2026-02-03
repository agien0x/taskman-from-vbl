-- Add missing pitch and icon_url columns to agent_versions table
ALTER TABLE public.agent_versions
ADD COLUMN IF NOT EXISTS pitch text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS icon_url text DEFAULT NULL;