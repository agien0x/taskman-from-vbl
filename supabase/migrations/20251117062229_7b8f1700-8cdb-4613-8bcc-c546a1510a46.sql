-- Изменяем тип колонки module_id с UUID на TEXT для поддержки custom module IDs
ALTER TABLE public.module_versions 
ALTER COLUMN module_id TYPE TEXT USING module_id::TEXT;