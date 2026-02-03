-- Add missing channels and channel_message columns to agent_versions table
ALTER TABLE public.agent_versions
ADD COLUMN IF NOT EXISTS channels jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS channel_message text DEFAULT NULL;