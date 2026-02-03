-- Модифицируем функцию notify_trigger_manager для поддержки INSERT и UPDATE
CREATE OR REPLACE FUNCTION public.notify_trigger_manager()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  changed_fields TEXT[];
  project_url TEXT;
  anon_key TEXT;
  trigger_type_value TEXT;
BEGIN
  -- Получаем URL и ключ проекта
  project_url := 'https://vmtjcycacbrzefrxeakv.supabase.co';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdGpjeWNhY2JyemVmcnhlYWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMzM0MTUsImV4cCI6MjA3NjgwOTQxNX0.G3r36d9Mdye8iSSDh_uqr-Txu9exOiRs72yqI7eo3R8';

  -- Определяем тип триггера
  IF TG_OP = 'INSERT' THEN
    trigger_type_value := 'on_create';
    changed_fields := ARRAY[]::TEXT[];
  ELSIF TG_OP = 'UPDATE' THEN
    trigger_type_value := 'on_update';
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
  ELSE
    RETURN NEW;
  END IF;

  -- Если есть изменения или это INSERT, вызываем edge function асинхронно
  IF array_length(changed_fields, 1) > 0 OR TG_OP = 'INSERT' THEN
    PERFORM net.http_post(
      url := project_url || '/functions/v1/check-and-execute-triggers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'triggerType', trigger_type_value,
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

-- Добавляем триггеры на INSERT для tasks
DROP TRIGGER IF EXISTS trigger_agent_on_task_insert ON public.tasks;
CREATE TRIGGER trigger_agent_on_task_insert
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_trigger_manager();

-- Добавляем триггеры на INSERT для profiles
DROP TRIGGER IF EXISTS trigger_agent_on_profile_insert ON public.profiles;
CREATE TRIGGER trigger_agent_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_trigger_manager();

-- Обновляем constraint для trigger_executions
ALTER TABLE public.trigger_executions
DROP CONSTRAINT IF EXISTS trigger_executions_trigger_type_check;

ALTER TABLE public.trigger_executions
ADD CONSTRAINT trigger_executions_trigger_type_check
CHECK (trigger_type IN ('on_update', 'on_create', 'scheduled', 'button'));