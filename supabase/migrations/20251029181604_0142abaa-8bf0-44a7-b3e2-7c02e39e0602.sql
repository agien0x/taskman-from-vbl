-- Create global stages table for cross-board stage management
CREATE TABLE IF NOT EXISTS public.global_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_stages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view global stages" 
ON public.global_stages 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create global stages" 
ON public.global_stages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update global stages" 
ON public.global_stages 
FOR UPDATE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_global_stages_updated_at
BEFORE UPDATE ON public.global_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Populate with existing stages used on 2+ boards
INSERT INTO public.global_stages (title)
SELECT DISTINCT jsonb_array_elements(custom_columns)->>'title' as stage_title
FROM tasks 
WHERE custom_columns IS NOT NULL
GROUP BY stage_title
HAVING COUNT(DISTINCT id) >= 2
ON CONFLICT (title) DO NOTHING;

-- Also add default stages
INSERT INTO public.global_stages (title) VALUES ('To Do'), ('In Progress'), ('Done')
ON CONFLICT (title) DO NOTHING;