-- Drop the old update policy
DROP POLICY IF EXISTS "Task owners can update their tasks" ON public.tasks;

-- Create new update policy that allows owners to change the owner
CREATE POLICY "Task owners can update their tasks"
ON public.tasks
FOR UPDATE
USING ((auth.uid() = owner_id) OR (owner_id IS NULL))
WITH CHECK (true);

-- Also update the insert policy to allow creating tasks without owner
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.tasks;

CREATE POLICY "Authenticated users can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK ((auth.uid() = owner_id) OR (owner_id IS NULL));