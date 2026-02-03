-- Allow all authenticated users to view all templates
DROP POLICY IF EXISTS "Users can view accessible templates" ON public.task_type_templates;

CREATE POLICY "All authenticated users can view all templates"
ON public.task_type_templates
FOR SELECT
TO authenticated
USING (true);

-- Update task_type_templates to ensure is_active is properly set
COMMENT ON COLUMN public.task_type_templates.is_active IS 'Whether this template is active for automatic task creation';