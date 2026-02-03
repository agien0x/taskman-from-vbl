-- Create security definer function to check template access
CREATE OR REPLACE FUNCTION public.has_template_access(_template_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_type_templates t
    WHERE t.id = _template_id
      AND (
        t.is_global = true 
        OR t.owner_id = _user_id
        OR EXISTS (
          SELECT 1 FROM public.task_type_template_assignments a
          WHERE a.template_id = _template_id 
            AND a.user_id = _user_id
        )
      )
  )
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view global templates and own templates" ON public.task_type_templates;

-- Create new policy using security definer function
CREATE POLICY "Users can view accessible templates"
ON public.task_type_templates
FOR SELECT
USING (
  is_global = true 
  OR owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.task_type_template_assignments
    WHERE template_id = id 
      AND user_id = auth.uid()
  )
);