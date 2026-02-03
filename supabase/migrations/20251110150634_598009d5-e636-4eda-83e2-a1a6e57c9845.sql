-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own templates" ON public.task_type_templates;

-- Create updated policy that allows current owner or contributors to update
CREATE POLICY "Users can update accessible templates" 
ON public.task_type_templates 
FOR UPDATE 
USING (
  owner_id = auth.uid() OR 
  has_template_access(id, auth.uid())
)
WITH CHECK (
  -- Allow changing owner_id only if user is current owner
  (owner_id = auth.uid() OR has_template_access(id, auth.uid()))
);