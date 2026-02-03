-- Мигрируем существующие owner_id в task_assignments
INSERT INTO public.task_assignments (task_id, user_id, role)
SELECT id, owner_id, 'owner'::task_member_role
FROM public.tasks
WHERE owner_id IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;