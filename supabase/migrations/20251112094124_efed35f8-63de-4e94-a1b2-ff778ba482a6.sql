-- Add pitch field to agents table
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS pitch TEXT;