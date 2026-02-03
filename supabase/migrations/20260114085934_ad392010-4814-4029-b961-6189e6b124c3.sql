-- Индекс для ускорения выборки дочерних задач
CREATE INDEX IF NOT EXISTS idx_task_relations_parent_id ON public.task_relations(parent_id);

-- Индекс для ускорения выборки родительских задач  
CREATE INDEX IF NOT EXISTS idx_task_relations_child_id ON public.task_relations(child_id);

-- Составной индекс для частых запросов
CREATE INDEX IF NOT EXISTS idx_tasks_column_updated ON public.tasks(column_id, updated_at DESC);