-- Часть 1: Добавляем новое значение 'standup' в enum
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'standup';