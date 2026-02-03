-- Add timezone support to task_type_templates
ALTER TABLE public.task_type_templates 
ADD COLUMN IF NOT EXISTS recurrence_timezone TEXT NOT NULL DEFAULT 'UTC';

-- Update existing templates to use Moscow timezone as default
UPDATE public.task_type_templates 
SET recurrence_timezone = 'Europe/Moscow' 
WHERE recurrence_timezone = 'UTC' AND recurrence_type != 'none';

COMMENT ON COLUMN public.task_type_templates.recurrence_timezone IS 'Timezone for recurrence_time (e.g., Europe/Moscow, UTC)';