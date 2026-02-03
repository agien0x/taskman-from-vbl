-- Обновляем функцию log_task_changes, добавляя search_path для безопасности
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.task_logs (task_id, action, user_id)
    VALUES (NEW.id, 'created', auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Log title changes
    IF (OLD.title IS DISTINCT FROM NEW.title) THEN
      INSERT INTO public.task_logs (task_id, action, field_name, old_value, new_value, user_id)
      VALUES (NEW.id, 'updated', 'title', OLD.title, NEW.title, auth.uid());
    END IF;
    
    -- Log content changes
    IF (OLD.content IS DISTINCT FROM NEW.content) THEN
      INSERT INTO public.task_logs (task_id, action, field_name, old_value, new_value, user_id)
      VALUES (NEW.id, 'updated', 'content', 
        LEFT(OLD.content, 100), LEFT(NEW.content, 100), auth.uid());
    END IF;
    
    -- Log status changes
    IF (OLD.column_id IS DISTINCT FROM NEW.column_id) THEN
      INSERT INTO public.task_logs (task_id, action, field_name, old_value, new_value, user_id)
      VALUES (NEW.id, 'updated', 'column_id', OLD.column_id, NEW.column_id, auth.uid());
    END IF;
    
    -- Log priority changes
    IF (OLD.priority IS DISTINCT FROM NEW.priority) THEN
      INSERT INTO public.task_logs (task_id, action, field_name, old_value, new_value, user_id)
      VALUES (NEW.id, 'updated', 'priority', OLD.priority::text, NEW.priority::text, auth.uid());
    END IF;
    
    -- Log owner changes
    IF (OLD.owner_id IS DISTINCT FROM NEW.owner_id) THEN
      INSERT INTO public.task_logs (task_id, action, field_name, old_value, new_value, user_id)
      VALUES (NEW.id, 'updated', 'owner_id', OLD.owner_id::text, NEW.owner_id::text, auth.uid());
    END IF;

    -- Log start_date changes
    IF (OLD.start_date IS DISTINCT FROM NEW.start_date) THEN
      INSERT INTO public.task_logs (task_id, action, field_name, old_value, new_value, user_id)
      VALUES (NEW.id, 'updated', 'start_date', 
        OLD.start_date::text, NEW.start_date::text, auth.uid());
    END IF;

    -- Log end_date changes
    IF (OLD.end_date IS DISTINCT FROM NEW.end_date) THEN
      INSERT INTO public.task_logs (task_id, action, field_name, old_value, new_value, user_id)
      VALUES (NEW.id, 'updated', 'end_date', 
        OLD.end_date::text, NEW.end_date::text, auth.uid());
    END IF;

    -- Log planned_hours changes
    IF (OLD.planned_hours IS DISTINCT FROM NEW.planned_hours) THEN
      INSERT INTO public.task_logs (task_id, action, field_name, old_value, new_value, user_id)
      VALUES (NEW.id, 'updated', 'planned_hours', 
        OLD.planned_hours::text, NEW.planned_hours::text, auth.uid());
    END IF;

    -- Log task_type changes
    IF (OLD.task_type IS DISTINCT FROM NEW.task_type) THEN
      INSERT INTO public.task_logs (task_id, action, field_name, old_value, new_value, user_id)
      VALUES (NEW.id, 'updated', 'task_type', 
        OLD.task_type::text, NEW.task_type::text, auth.uid());
    END IF;
    
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.task_logs (task_id, action, user_id)
    VALUES (OLD.id, 'deleted', auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;