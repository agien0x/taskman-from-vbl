-- Create default root task "Таск менеджер" if it doesn't exist
DO $$
DECLARE
  root_task_id uuid;
BEGIN
  -- Check if root task already exists
  SELECT id INTO root_task_id FROM public.tasks WHERE title = 'Таск менеджер' AND parent_id IS NULL LIMIT 1;
  
  -- If not exists, create it
  IF root_task_id IS NULL THEN
    INSERT INTO public.tasks (id, title, content, column_id, position, parent_id)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Таск менеджер',
      'Корневая задача для всех задач проекта',
      'inprogress',
      0,
      NULL
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO root_task_id;
  END IF;
  
  -- Update all tasks without parent to be children of root task
  UPDATE public.tasks 
  SET parent_id = '00000000-0000-0000-0000-000000000001'
  WHERE parent_id IS NULL 
    AND id != '00000000-0000-0000-0000-000000000001';
END $$;