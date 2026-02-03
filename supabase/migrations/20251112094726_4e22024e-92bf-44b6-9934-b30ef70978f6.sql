-- Создаем таблицу для логирования выполнений триггеров
CREATE TABLE IF NOT EXISTS public.trigger_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('on_update', 'scheduled', 'button')),
  source_entity_type TEXT NOT NULL CHECK (source_entity_type IN ('task', 'profile')),
  source_entity_id UUID NOT NULL,
  changed_fields JSONB,
  conditions_met BOOLEAN NOT NULL,
  executed BOOLEAN NOT NULL DEFAULT false,
  execution_id UUID REFERENCES public.agent_executions(id),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Включаем RLS
ALTER TABLE public.trigger_executions ENABLE ROW LEVEL SECURITY;

-- Политики для trigger_executions
CREATE POLICY "Authenticated users can view trigger executions"
  ON public.trigger_executions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert trigger executions"
  ON public.trigger_executions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_trigger_executions_agent_id ON public.trigger_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_trigger_executions_created_at ON public.trigger_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_trigger_executions_source ON public.trigger_executions(source_entity_type, source_entity_id);

-- Добавляем колонку last_trigger_execution в agents для отслеживания scheduled триггеров
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS last_trigger_execution TIMESTAMPTZ;

-- Функция для отправки уведомлений о триггерах через pg_net
CREATE OR REPLACE FUNCTION public.notify_trigger_manager()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields TEXT[];
  project_url TEXT;
  anon_key TEXT;
BEGIN
  -- Получаем URL и ключ проекта
  project_url := 'https://vmtjcycacbrzefrxeakv.supabase.co';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdGpjeWNhY2JyemVmcnhlYWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMzM0MTUsImV4cCI6MjA3NjgwOTQxNX0.G3r36d9Mdye8iSSDh_uqr-Txu9exOiRs72yqI7eo3R8';

  -- Определяем измененные поля
  changed_fields := ARRAY[]::TEXT[];
  
  IF TG_TABLE_NAME = 'tasks' THEN
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      changed_fields := array_append(changed_fields, 'title');
    END IF;
    IF OLD.content IS DISTINCT FROM NEW.content THEN
      changed_fields := array_append(changed_fields, 'content');
    END IF;
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      changed_fields := array_append(changed_fields, 'priority');
    END IF;
    IF OLD.column_id IS DISTINCT FROM NEW.column_id THEN
      changed_fields := array_append(changed_fields, 'column_id');
    END IF;
    IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
      changed_fields := array_append(changed_fields, 'owner_id');
    END IF;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
      changed_fields := array_append(changed_fields, 'full_name');
    END IF;
    IF OLD.recommended_parents IS DISTINCT FROM NEW.recommended_parents THEN
      changed_fields := array_append(changed_fields, 'recommended_parents');
    END IF;
  END IF;

  -- Если есть изменения, вызываем edge function асинхронно
  IF array_length(changed_fields, 1) > 0 THEN
    PERFORM net.http_post(
      url := project_url || '/functions/v1/check-and-execute-triggers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'triggerType', 'on_update',
        'sourceEntity', jsonb_build_object(
          'type', TG_TABLE_NAME,
          'id', NEW.id
        ),
        'changedFields', to_jsonb(changed_fields)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Создаем триггеры для tasks и profiles
DROP TRIGGER IF EXISTS trigger_agent_on_task_update ON public.tasks;
CREATE TRIGGER trigger_agent_on_task_update
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_trigger_manager();

DROP TRIGGER IF EXISTS trigger_agent_on_profile_update ON public.profiles;
CREATE TRIGGER trigger_agent_on_profile_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_trigger_manager();

-- Безопасное удаление существующего cron job если он есть
DO $$
BEGIN
  PERFORM cron.unschedule('check-scheduled-triggers');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Игнорируем ошибку если джоб не существует
END $$;

-- Создаем новый джоб для проверки scheduled триггеров каждые 5 минут
SELECT cron.schedule(
  'check-scheduled-triggers',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vmtjcycacbrzefrxeakv.supabase.co/functions/v1/check-and-execute-triggers',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdGpjeWNhY2JyemVmcnhlYWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMzM0MTUsImV4cCI6MjA3NjgwOTQxNX0.G3r36d9Mdye8iSSDh_uqr-Txu9exOiRs72yqI7eo3R8"}'::jsonb,
    body := '{"triggerType": "scheduled"}'::jsonb
  );
  $$
);