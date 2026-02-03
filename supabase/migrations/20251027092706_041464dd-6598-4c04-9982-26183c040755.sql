-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update tasks RLS policies to include owner-based access
DROP POLICY IF EXISTS "Anyone can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Anyone can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Anyone can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Anyone can delete tasks" ON public.tasks;

-- New tasks policies with authentication
CREATE POLICY "Authenticated users can view all tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tasks"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Task owners can update their tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR owner_id IS NULL);

CREATE POLICY "Task owners can delete their tasks"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR owner_id IS NULL);

-- Update comments, task_relations, task_versions policies for authenticated users
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can create comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can update comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can delete comments" ON public.comments;

CREATE POLICY "Authenticated users can view comments"
  ON public.comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update comments"
  ON public.comments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete comments"
  ON public.comments FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view task relations" ON public.task_relations;
DROP POLICY IF EXISTS "Anyone can create task relations" ON public.task_relations;
DROP POLICY IF EXISTS "Anyone can delete task relations" ON public.task_relations;

CREATE POLICY "Authenticated users can view task relations"
  ON public.task_relations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create task relations"
  ON public.task_relations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete task relations"
  ON public.task_relations FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view task versions" ON public.task_versions;
DROP POLICY IF EXISTS "Anyone can create task versions" ON public.task_versions;
DROP POLICY IF EXISTS "Anyone can delete task versions" ON public.task_versions;

CREATE POLICY "Authenticated users can view task versions"
  ON public.task_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create task versions"
  ON public.task_versions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete task versions"
  ON public.task_versions FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view agents" ON public.agents;
DROP POLICY IF EXISTS "Anyone can insert agents" ON public.agents;
DROP POLICY IF EXISTS "Anyone can update agents" ON public.agents;

CREATE POLICY "Authenticated users can view agents"
  ON public.agents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert agents"
  ON public.agents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update agents"
  ON public.agents FOR UPDATE TO authenticated USING (true);