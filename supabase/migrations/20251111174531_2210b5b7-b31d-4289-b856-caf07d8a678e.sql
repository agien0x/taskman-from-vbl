-- Создаем таблицу для версий всего агента
CREATE TABLE IF NOT EXISTS public.agent_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  inputs JSONB,
  outputs JSONB,
  router_config JSONB,
  trigger_config JSONB,
  inputs_raw TEXT,
  router_raw TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создаем таблицу для оценок агентов
CREATE TABLE IF NOT EXISTS public.agent_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  rated_by UUID,
  rated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Добавляем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_agent_versions_agent_id ON public.agent_versions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_versions_created_at ON public.agent_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_ratings_agent_id ON public.agent_ratings(agent_id);

-- RLS политики для agent_versions
ALTER TABLE public.agent_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agent versions"
  ON public.agent_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create agent versions"
  ON public.agent_versions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete agent versions"
  ON public.agent_versions FOR DELETE
  TO authenticated
  USING (true);

-- RLS политики для agent_ratings
ALTER TABLE public.agent_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agent ratings"
  ON public.agent_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create agent ratings"
  ON public.agent_ratings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own ratings"
  ON public.agent_ratings FOR UPDATE
  TO authenticated
  USING (rated_by = auth.uid());

CREATE POLICY "Users can delete their own ratings"
  ON public.agent_ratings FOR DELETE
  TO authenticated
  USING (rated_by = auth.uid());