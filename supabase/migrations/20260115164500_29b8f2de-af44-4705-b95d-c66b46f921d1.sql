-- Create new enum for board roles
CREATE TYPE public.board_role AS ENUM ('admin', 'executor', 'viewer');

-- Add new role column to task_assignments using new enum
ALTER TABLE public.task_assignments 
ADD COLUMN board_role public.board_role DEFAULT 'executor';

-- Migrate existing roles
UPDATE public.task_assignments 
SET board_role = CASE 
  WHEN role = 'owner' THEN 'admin'::public.board_role
  ELSE 'executor'::public.board_role
END;

-- Create function to check board access
CREATE OR REPLACE FUNCTION public.get_board_role(_board_id uuid, _user_id uuid)
RETURNS public.board_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- First check if user is owner (admin)
  SELECT 'admin'::public.board_role
  FROM public.tasks
  WHERE id = _board_id AND owner_id = _user_id
  UNION ALL
  -- Then check task_assignments
  SELECT board_role
  FROM public.task_assignments
  WHERE task_id = _board_id AND user_id = _user_id
  LIMIT 1
$$;

-- Create function to check if user can edit board (admin or executor)
CREATE OR REPLACE FUNCTION public.can_edit_board(_board_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = _board_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.task_assignments
    WHERE task_id = _board_id 
      AND user_id = _user_id 
      AND board_role IN ('admin', 'executor')
  )
$$;

-- Create function to check if user can view board (any role)
CREATE OR REPLACE FUNCTION public.can_view_board(_board_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = _board_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.task_assignments
    WHERE task_id = _board_id AND user_id = _user_id
  )
$$;