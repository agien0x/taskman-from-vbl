-- Изменяем CHECK constraint для source_entity_type, чтобы принимать 'tasks' и 'profiles' (множественное число)
ALTER TABLE public.trigger_executions DROP CONSTRAINT IF EXISTS trigger_executions_source_entity_type_check;
ALTER TABLE public.trigger_executions ADD CONSTRAINT trigger_executions_source_entity_type_check 
  CHECK (source_entity_type IN ('task', 'profile', 'tasks', 'profiles'));