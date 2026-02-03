-- Добавляем поле timezone в таблицу task_type_templates
ALTER TABLE public.task_type_templates 
ADD COLUMN timezone text NOT NULL DEFAULT 'UTC';

-- Добавляем поля timezone и country в таблицу profiles
ALTER TABLE public.profiles 
ADD COLUMN timezone text DEFAULT 'UTC',
ADD COLUMN country text;

-- Обновляем функцию handle_new_user для автоматического определения таймзоны
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_timezone text;
BEGIN
  -- Пытаемся получить таймзону из метаданных пользователя
  user_timezone := COALESCE(
    new.raw_user_meta_data->>'timezone',
    'UTC'
  );

  INSERT INTO public.profiles (user_id, full_name, timezone, country)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    user_timezone,
    new.raw_user_meta_data->>'country'
  );
  RETURN new;
END;
$function$;