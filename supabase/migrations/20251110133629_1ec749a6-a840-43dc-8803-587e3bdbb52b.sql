-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view accessible templates" ON public.task_type_templates;
DROP POLICY IF EXISTS "Users can view assignments for their templates" ON public.task_type_template_assignments;

-- Create security definer function to check if user is template owner
CREATE OR REPLACE FUNCTION public.is_template_owner(_template_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_type_templates
    WHERE id = _template_id AND owner_id = _user_id
  )
$$;

-- Create new policy for task_type_templates using simpler logic
CREATE POLICY "Users can view accessible templates"
ON public.task_type_templates
FOR SELECT
USING (
  is_global = true 
  OR owner_id = auth.uid()
  OR public.has_template_access(id, auth.uid())
);

-- Create new policy for task_type_template_assignments without recursion
CREATE POLICY "Users can view assignments for their templates"
ON public.task_type_template_assignments
FOR SELECT
USING (
  public.is_template_owner(template_id, auth.uid())
  OR user_id = auth.uid()
);