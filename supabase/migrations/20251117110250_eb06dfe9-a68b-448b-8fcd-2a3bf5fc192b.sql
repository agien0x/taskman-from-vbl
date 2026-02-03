-- Временно отключаем триггер для предотвращения бесконечного цикла обновлений
ALTER TABLE public.tasks DISABLE TRIGGER trigger_agent_on_task_update;