-- Часть 2: Мигрируем существующие данные и создаем триггеры

-- Обновляем все существующие записи 'standard' на 'standup'
UPDATE tasks 
SET task_type = 'standup' 
WHERE task_type = 'standard';

-- Создаем функцию для автоматического добавления задач на личную доску
CREATE OR REPLACE FUNCTION auto_add_to_personal_board()
RETURNS TRIGGER AS $$
DECLARE
  personal_board_id UUID;
BEGIN
  -- Проверяем, есть ли owner_id у задачи и это не личная доска
  IF NEW.owner_id IS NOT NULL AND NEW.task_type != 'personal_board' THEN
    -- Ищем личную доску пользователя
    SELECT id INTO personal_board_id
    FROM tasks
    WHERE owner_id = NEW.owner_id 
      AND task_type = 'personal_board'
      AND is_root = false
    LIMIT 1;
    
    -- Если личная доска найдена и это не она сама
    IF personal_board_id IS NOT NULL AND personal_board_id != NEW.id THEN
      -- Добавляем связь (задача становится дочерней для личной доски)
      INSERT INTO task_relations (parent_id, child_id)
      VALUES (personal_board_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Создаем триггер для автоматического добавления задач при создании
DROP TRIGGER IF EXISTS trigger_auto_add_to_personal_board ON tasks;
CREATE TRIGGER trigger_auto_add_to_personal_board
AFTER INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION auto_add_to_personal_board();

-- Создаем функцию для добавления на личную доску при добавлении участника
CREATE OR REPLACE FUNCTION auto_add_assignment_to_personal_board()
RETURNS TRIGGER AS $$
DECLARE
  personal_board_id UUID;
BEGIN
  -- Ищем личную доску участника
  SELECT id INTO personal_board_id
  FROM tasks
  WHERE owner_id = NEW.user_id 
    AND task_type = 'personal_board'
    AND is_root = false
  LIMIT 1;
  
  -- Если личная доска найдена и это не та же задача
  IF personal_board_id IS NOT NULL AND personal_board_id != NEW.task_id THEN
    -- Добавляем связь (задача добавляется на личную доску участника)
    INSERT INTO task_relations (parent_id, child_id)
    VALUES (personal_board_id, NEW.task_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Создаем триггер для добавления при назначении участника
DROP TRIGGER IF EXISTS trigger_auto_add_assignment_to_board ON task_assignments;
CREATE TRIGGER trigger_auto_add_assignment_to_board
AFTER INSERT ON task_assignments
FOR EACH ROW
EXECUTE FUNCTION auto_add_assignment_to_personal_board();