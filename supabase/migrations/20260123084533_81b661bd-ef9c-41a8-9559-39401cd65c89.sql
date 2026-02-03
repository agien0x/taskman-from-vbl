-- Add auto_load_my_tasks boolean field to tasks table for personal boards
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS auto_load_my_tasks boolean DEFAULT false;

-- Set default for existing personal boards
UPDATE public.tasks 
SET auto_load_my_tasks = true 
WHERE task_type = 'personal_board';

-- Add default smart columns for personal boards that don't have custom_columns yet
UPDATE public.tasks 
SET custom_columns = '[
  {"id": "my_projects", "title": "Мои проекты", "color": "#8b5cf6"},
  {"id": "todo", "title": "To Do", "color": "#6b7280"},
  {"id": "inprogress", "title": "In Progress", "color": "#f59e0b"},
  {"id": "done", "title": "Done", "color": "#22c55e", "collapsed": true},
  {"id": "archive", "title": "Архив", "color": "#9ca3af", "collapsed": true}
]'::jsonb
WHERE task_type = 'personal_board' AND (custom_columns IS NULL OR custom_columns = '[]'::jsonb);