-- Add fields for individual task settings
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS custom_template text,
ADD COLUMN IF NOT EXISTS custom_quality_criteria text,
ADD COLUMN IF NOT EXISTS use_custom_settings boolean DEFAULT false;

COMMENT ON COLUMN public.tasks.custom_template IS 'Individual template for this specific task (overrides global template)';
COMMENT ON COLUMN public.tasks.custom_quality_criteria IS 'Individual quality criteria for this specific task (overrides global criteria)';
COMMENT ON COLUMN public.tasks.use_custom_settings IS 'Whether to use custom settings instead of global task type settings';