-- Шаг 1: Исправить личную доску val@agiens.com
UPDATE tasks 
SET is_root = true 
WHERE id = '6895ecec-7a52-410f-afd2-de8e4ffeee8f';

-- Шаг 2: Удалить дублирующиеся пустые доски
DELETE FROM tasks WHERE id IN (
  'edb45686-8f9d-4eff-b092-16d62ff18af2',
  '92fc9e16-6dc3-4cf7-b41a-009980ec98c9',
  '1384d3c3-b68f-470e-8480-a911c960c83e'
);

-- Шаг 3: Создать личные доски для 9 пользователей без них
INSERT INTO tasks (owner_id, title, task_type, is_root, column_id, content)
VALUES 
  ('a45f0765-5566-4687-aa0a-7103316f924c', 'Моя доска', 'personal_board', true, 'in_progress', ''),
  ('3a560376-0ff0-420d-96bc-7a804fe92da3', 'Моя доска', 'personal_board', true, 'in_progress', ''),
  ('902287cc-accd-4f57-8f70-ae2a25e0c754', 'Моя доска', 'personal_board', true, 'in_progress', ''),
  ('867a1847-348c-4861-98d9-37a5277fe8ff', 'Моя доска', 'personal_board', true, 'in_progress', ''),
  ('7408d408-bdbe-46a1-afa7-f91c9ffb9d62', 'Моя доска', 'personal_board', true, 'in_progress', ''),
  ('c3e29e71-91fd-442e-b42d-1483d63e65b8', 'Моя доска', 'personal_board', true, 'in_progress', ''),
  ('345eb9cc-17b6-4d81-8e7c-4fdf12c52893', 'Моя доска', 'personal_board', true, 'in_progress', ''),
  ('416d55a0-07cf-486e-ad06-7d2cdd4ed06e', 'Моя доска', 'personal_board', true, 'in_progress', ''),
  ('f0d1dd12-35f2-4666-bf0a-4dd604d838df', 'Моя доска', 'personal_board', true, 'in_progress', '');

-- Шаг 4: Добавить UNIQUE индекс для предотвращения дублей
CREATE UNIQUE INDEX unique_personal_board_per_user 
ON tasks (owner_id) 
WHERE task_type = 'personal_board';

-- Шаг 5: Создать функцию и триггер для автосоздания личной доски при регистрации
CREATE OR REPLACE FUNCTION public.create_personal_board_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tasks (owner_id, title, task_type, is_root, column_id, content)
  VALUES (NEW.id, 'Моя доска', 'personal_board', true, 'in_progress', '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_personal_board
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_personal_board_for_user();