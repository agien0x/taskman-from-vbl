-- Фаза 1: Критические исправления безопасности RLS

-- 1.1 Добавить поле author_id в comments для отслеживания авторства
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);

-- 1.2 Исправить политики для time_logs - ограничить просмотр только своих записей
DROP POLICY IF EXISTS "Authenticated users can view time logs" ON public.time_logs;
CREATE POLICY "Users can view own time logs" ON public.time_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 1.3 Исправить политики для comments - ограничить до автора
DROP POLICY IF EXISTS "Authenticated users can delete comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can update comments" ON public.comments;

CREATE POLICY "Authors can delete their comments" ON public.comments
  FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can update their comments" ON public.comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = author_id);

-- 1.4 Исправить INSERT политику для comments чтобы устанавливать author_id
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
CREATE POLICY "Authenticated users can create comments" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- 1.5 Исправить политики для task_assignments - ограничить до владельца задачи
DROP POLICY IF EXISTS "Authenticated users can delete task assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Authenticated users can update task assignments" ON public.task_assignments;

CREATE POLICY "Task owners can delete assignments" ON public.task_assignments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_assignments.task_id 
      AND (tasks.owner_id = auth.uid() OR tasks.owner_id IS NULL)
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Task owners can update assignments" ON public.task_assignments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_assignments.task_id 
      AND (tasks.owner_id = auth.uid() OR tasks.owner_id IS NULL)
    )
    OR user_id = auth.uid()
  );

-- 1.6 Исправить политики для task_relations - ограничить удаление до владельца родительской задачи
DROP POLICY IF EXISTS "Authenticated users can delete task relations" ON public.task_relations;

CREATE POLICY "Task owners can delete relations" ON public.task_relations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_relations.parent_id 
      AND (tasks.owner_id = auth.uid() OR tasks.owner_id IS NULL)
    )
    OR EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_relations.child_id 
      AND (tasks.owner_id = auth.uid() OR tasks.owner_id IS NULL)
    )
  );

-- 1.7 Добавить политику UPDATE для task_relations
CREATE POLICY "Task owners can update relations" ON public.task_relations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_relations.parent_id 
      AND (tasks.owner_id = auth.uid() OR tasks.owner_id IS NULL)
    )
  );

-- 1.8 Исправить политику для agents - ограничить UPDATE (добавим owner_id если нет)
-- Сначала проверим что таблица agents не имеет owner_id и добавим
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

DROP POLICY IF EXISTS "Authenticated users can update agents" ON public.agents;
CREATE POLICY "Owners can update agents" ON public.agents
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR owner_id IS NULL);

-- 1.9 Добавить политику DELETE для agents
CREATE POLICY "Owners can delete agents" ON public.agents
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR owner_id IS NULL);