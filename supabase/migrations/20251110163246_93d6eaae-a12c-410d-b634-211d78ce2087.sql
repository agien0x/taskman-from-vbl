-- Добавляем ON DELETE CASCADE для foreign key в task_logs
-- Сначала удаляем старый constraint
ALTER TABLE public.task_logs 
DROP CONSTRAINT IF EXISTS task_logs_task_id_fkey;

-- Добавляем новый constraint с CASCADE
ALTER TABLE public.task_logs 
ADD CONSTRAINT task_logs_task_id_fkey 
FOREIGN KEY (task_id) 
REFERENCES public.tasks(id) 
ON DELETE CASCADE;

-- Также добавляем триггер для DELETE, если его нет
DROP TRIGGER IF EXISTS task_delete_trigger ON public.tasks;

CREATE TRIGGER task_delete_trigger
  BEFORE DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_changes();