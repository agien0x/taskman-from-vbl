-- Удаление внешнего ключа task_id в таблице task_logs
-- Это позволит хранить логи для удаленных задач
ALTER TABLE public.task_logs 
DROP CONSTRAINT task_logs_task_id_fkey;