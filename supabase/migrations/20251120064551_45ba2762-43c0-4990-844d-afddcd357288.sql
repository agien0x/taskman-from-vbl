-- Add missing channels and channel_message columns to agents table
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS channels jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS channel_message text DEFAULT NULL;