-- Create table for JSON variable templates
CREATE TABLE IF NOT EXISTS public.json_variable_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_id UUID NOT NULL,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.json_variable_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own templates and global templates
CREATE POLICY "Users can view own and global templates"
ON public.json_variable_templates
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_global = true);

-- Users can create their own templates
CREATE POLICY "Users can create own templates"
ON public.json_variable_templates
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
ON public.json_variable_templates
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
ON public.json_variable_templates
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_json_variable_templates_user_id ON public.json_variable_templates(user_id);
CREATE INDEX idx_json_variable_templates_is_global ON public.json_variable_templates(is_global);