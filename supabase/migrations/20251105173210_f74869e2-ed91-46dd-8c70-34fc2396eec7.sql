-- Add recurrence and default content fields to tasks table for function type tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_type text DEFAULT 'none' CHECK (recurrence_type IN ('none', 'daily', 'weekdays', 'weekly')),
ADD COLUMN IF NOT EXISTS recurrence_days jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS default_content text,
ADD COLUMN IF NOT EXISTS last_recurrence_update timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.recurrence_type IS 'Тип периодичности для функций: none, daily (ежедневно), weekdays (Пн-Пт), weekly (еженедельно с указанием дней)';
COMMENT ON COLUMN public.tasks.recurrence_days IS 'Массив дней недели для weekly: [0-6], где 0=Вс, 1=Пн, ..., 6=Сб';
COMMENT ON COLUMN public.tasks.default_content IS 'Дефолтный шаблон контента для функций, который вставляется при начале дня';
COMMENT ON COLUMN public.tasks.last_recurrence_update IS 'Дата последнего автоматического обновления контента';

-- Create index for querying tasks by recurrence for cron job
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_active ON public.tasks(recurrence_type, last_recurrence_update, task_type) 
WHERE recurrence_type != 'none' AND task_type = 'function';