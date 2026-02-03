-- Удаляем старый внешний ключ
ALTER TABLE public.task_logs 
DROP CONSTRAINT IF EXISTS task_logs_task_id_fkey;

-- Создаем новый внешний ключ с CASCADE
ALTER TABLE public.task_logs 
ADD CONSTRAINT task_logs_task_id_fkey 
FOREIGN KEY (task_id) 
REFERENCES public.tasks(id) 
ON DELETE CASCADE;