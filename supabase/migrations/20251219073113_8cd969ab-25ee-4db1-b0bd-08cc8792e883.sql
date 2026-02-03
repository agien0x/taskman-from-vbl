-- Drop existing update policy
DROP POLICY IF EXISTS "Task owners can update their tasks" ON public.tasks;

-- Create new update policy that checks both owner_id and task_assignments
CREATE POLICY "Task members can update their tasks" 
ON public.tasks 
FOR UPDATE 
TO public
USING (
  (auth.uid() = owner_id) 
  OR (owner_id IS NULL)
  OR EXISTS (
    SELECT 1 FROM public.task_assignments 
    WHERE task_assignments.task_id = tasks.id 
    AND task_assignments.user_id = auth.uid()
  )
)
WITH CHECK (true);

-- Also update delete policy to include assigned users
DROP POLICY IF EXISTS "Task owners can delete their tasks" ON public.tasks;

CREATE POLICY "Task members can delete their tasks" 
ON public.tasks 
FOR DELETE 
TO authenticated
USING (
  (auth.uid() = owner_id) 
  OR (owner_id IS NULL)
  OR EXISTS (
    SELECT 1 FROM public.task_assignments 
    WHERE task_assignments.task_id = tasks.id 
    AND task_assignments.user_id = auth.uid()
  )
);