-- Add input and output configuration to agents table
ALTER TABLE public.agents 
ADD COLUMN inputs jsonb DEFAULT '[]'::jsonb,
ADD COLUMN outputs jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.agents.inputs IS 'Array of input configurations: [{id, type, order, customText?}]';
COMMENT ON COLUMN public.agents.outputs IS 'Array of output configurations: [{id, type, config?}]';