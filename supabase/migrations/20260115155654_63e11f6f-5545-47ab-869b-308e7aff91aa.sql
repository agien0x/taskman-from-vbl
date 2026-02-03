-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Org members can view members" ON organization_members;

-- Create a security definer function to check org membership without recursion
CREATE OR REPLACE FUNCTION public.is_organization_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- Create new non-recursive SELECT policy
CREATE POLICY "Org members can view members"
ON organization_members
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR user_id = auth.uid()
  OR is_organization_member(auth.uid(), organization_id)
);