-- Создаем таблицу для хранения истории оценок задач
CREATE TABLE IF NOT EXISTS public.task_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  score DECIMAL(2,1) NOT NULL CHECK (score >= 0 AND score <= 5),
  scored_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  reasoning TEXT,
  quality_criteria TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Добавляем индексы для быстрого поиска
CREATE INDEX idx_task_scores_task_id ON public.task_scores(task_id);
CREATE INDEX idx_task_scores_created_at ON public.task_scores(created_at DESC);

-- Включаем RLS
ALTER TABLE public.task_scores ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Authenticated users can view task scores"
  ON public.task_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create task scores"
  ON public.task_scores FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Добавляем поле last_score_at в таблицу tasks для отслеживания последней оценки
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS last_score_at TIMESTAMP WITH TIME ZONE;

-- Создаем функцию для обновления last_score_at
CREATE OR REPLACE FUNCTION public.update_task_last_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tasks 
  SET last_score_at = NEW.created_at
  WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$;

-- Создаем триггер для автоматического обновления last_score_at
CREATE TRIGGER update_task_last_score_trigger
  AFTER INSERT ON public.task_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_task_last_score();