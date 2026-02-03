-- Add icon_url column to agents table
ALTER TABLE public.agents 
ADD COLUMN icon_url TEXT;

-- Add comment
COMMENT ON COLUMN public.agents.icon_url IS 'URL to the generated agent icon image';