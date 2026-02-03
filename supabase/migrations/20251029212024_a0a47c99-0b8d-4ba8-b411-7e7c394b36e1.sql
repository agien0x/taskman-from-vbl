-- Создаем enum для ролей участников задачи
CREATE TYPE public.task_member_role AS ENUM ('owner', 'contributor');

-- Создаем таблицу назначений участников на задачи
CREATE TABLE public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role task_member_role NOT NULL DEFAULT 'contributor',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Включаем RLS
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- Политики для task_assignments
CREATE POLICY "Authenticated users can view task assignments"
  ON public.task_assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create task assignments"
  ON public.task_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update task assignments"
  ON public.task_assignments
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete task assignments"
  ON public.task_assignments
  FOR DELETE
  TO authenticated
  USING (true);

-- Создаем индексы для производительности
CREATE INDEX idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX idx_task_assignments_user_id ON public.task_assignments(user_id);