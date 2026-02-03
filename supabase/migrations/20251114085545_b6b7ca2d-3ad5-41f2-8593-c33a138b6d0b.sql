-- Add modules column to agents table to store module configurations
ALTER TABLE public.agents
ADD COLUMN modules jsonb DEFAULT '[]'::jsonb;

-- Add comment explaining the modules structure
COMMENT ON COLUMN public.agents.modules IS 'Array of agent modules with their configurations (trigger, prompt, model, json_extractor, router, destinations, channels)';