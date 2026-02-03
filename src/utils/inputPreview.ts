// Генерация preview значений для типов инпутов
export const getInputPreview = (inputType: string): string => {
  switch (inputType) {
    case 'task_title':
      return 'Название выбранной задачи';
    case 'task_pitch':
      return 'Питч выбранной задачи';
    case 'task_content':
      return 'Полное содержимое выбранной задачи';
    case 'task_priority':
      return 'Приоритет задачи (urgent, high, medium, low, none)';
    case 'task_column':
      return 'Этап/колонка, в которой находится задача';
    case 'task_owner':
      return 'ID владельца задачи';
    case 'task_assignees':
      return 'Список ID участников задачи';
    case 'task_parent_chain':
      return 'Цепочка родительских задач';
    case 'profile_recommended_parents':
      return 'Рекомендованные родительские задачи';
    case 'task_subtasks':
      return 'Список подзадач';
    case 'all_tasks_list':
      return 'Все задачи (названия + питчи)';
    case 'task_start_date':
      return 'Дата начала задачи';
    case 'task_end_date':
      return 'Дата окончания задачи';
    case 'task_planned_hours':
      return 'Планируемые часы';
    case 'editor_content':
      return 'Содержимое редактора';
    case 'incoming_messages':
      return 'Входящие сообщения';
    case 'custom_text':
      return 'Произвольный текст';
    default:
      return 'Значение из задачи';
  }
};
