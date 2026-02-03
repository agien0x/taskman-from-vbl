-- Create role enums
CREATE TYPE app_role AS ENUM ('admin', 'user');
CREATE TYPE organization_role AS ENUM ('admin', 'member');
CREATE TYPE project_role AS ENUM ('owner', 'member');

-- Create user_roles table for system-level roles
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create organization_members table
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role organization_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT now(),
    invited_by UUID,
    UNIQUE(organization_id, user_id)
);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Create project_members table
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role project_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT now(),
    granted_by UUID,
    UNIQUE(project_id, user_id)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check system admin role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Security definer function to get organization role
CREATE OR REPLACE FUNCTION public.get_organization_role(_user_id UUID, _org_id UUID)
RETURNS organization_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM organization_members
  WHERE user_id = _user_id AND organization_id = _org_id;
$$;

-- Security definer function to get project role
CREATE OR REPLACE FUNCTION public.get_project_role(_user_id UUID, _project_id UUID)
RETURNS project_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM project_members
  WHERE user_id = _user_id AND project_id = _project_id;
$$;

-- Security definer function to find organization for any task (recursive up)
CREATE OR REPLACE FUNCTION public.get_task_organization(_task_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE task_path AS (
    SELECT id, is_root FROM tasks WHERE id = _task_id
    UNION ALL
    SELECT t.id, t.is_root
    FROM tasks t
    JOIN task_relations tr ON tr.parent_id = t.id
    JOIN task_path tp ON tr.child_id = tp.id
    WHERE NOT tp.is_root
  )
  SELECT id FROM task_path WHERE is_root = true LIMIT 1;
$$;

-- Security definer function to find project for any task
CREATE OR REPLACE FUNCTION public.get_task_project(_task_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE task_path AS (
    SELECT id, id as original_id FROM tasks WHERE id = _task_id
    UNION ALL
    SELECT t.id, tp.original_id
    FROM tasks t
    JOIN task_relations tr ON tr.parent_id = t.id
    JOIN task_path tp ON tr.child_id = tp.id
  )
  SELECT tp.id FROM task_path tp
  JOIN task_relations tr ON tr.child_id = tp.id
  JOIN tasks parent ON parent.id = tr.parent_id
  WHERE parent.is_root = true
  LIMIT 1;
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own role" ON user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user_roles" ON user_roles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for organization_members
CREATE POLICY "Org members can view members" ON organization_members
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_members.organization_id 
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Org members can add members" ON organization_members
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_members.organization_id 
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Org admins can update members" ON organization_members
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR get_organization_role(auth.uid(), organization_id) = 'admin'
);

CREATE POLICY "Org admins can delete members" ON organization_members
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR get_organization_role(auth.uid(), organization_id) = 'admin'
);

-- RLS policies for project_members
CREATE POLICY "Project members can view" ON project_members
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = project_members.project_id 
    AND pm.user_id = auth.uid()
  )
  OR get_organization_role(auth.uid(), get_task_organization(project_id)) IS NOT NULL
);

CREATE POLICY "Org admin or project owner can insert" ON project_members
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR get_organization_role(auth.uid(), get_task_organization(project_id)) = 'admin'
  OR get_project_role(auth.uid(), project_id) = 'owner'
);

CREATE POLICY "Org admin or project owner can update" ON project_members
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR get_organization_role(auth.uid(), get_task_organization(project_id)) = 'admin'
  OR get_project_role(auth.uid(), project_id) = 'owner'
);

CREATE POLICY "Org admin or project owner can delete" ON project_members
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR get_organization_role(auth.uid(), get_task_organization(project_id)) = 'admin'
  OR get_project_role(auth.uid(), project_id) = 'owner'
);

-- Initialize: Add all existing users as system admins
INSERT INTO user_roles (user_id, role)
SELECT user_id, 'admin'::app_role FROM profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Initialize: Add all users to all organizations as admin
INSERT INTO organization_members (organization_id, user_id, role)
SELECT t.id, p.user_id, 'admin'::organization_role
FROM tasks t
CROSS JOIN profiles p
WHERE t.is_root = true
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Initialize: Add all users to all projects as owner
INSERT INTO project_members (project_id, user_id, role)
SELECT child.id, p.user_id, 'owner'::project_role
FROM tasks child
JOIN task_relations tr ON tr.child_id = child.id
JOIN tasks parent ON parent.id = tr.parent_id AND parent.is_root = true
CROSS JOIN profiles p
ON CONFLICT (project_id, user_id) DO NOTHING;