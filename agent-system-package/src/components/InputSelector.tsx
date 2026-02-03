import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "./ui/checkbox";
import { ChevronRight, ChevronDown, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Badge } from "./ui/badge";
import { getCleanTitle } from "../lib/utils";

interface Column {
  id: string;
  title: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

interface TaskRelation {
  parent_id: string;
  parent_task?: {
    title: string;
    custom_columns?: Array<{ id: string; title: string; color?: string }> | null;
  } | null;
}

interface TaskChildRelation {
  child_id: string;
  child_task?: {
    title: string;
  };
}

export interface InputType {
  value: string;
  label: string;
}

export interface InputGroup {
  name: string;
  inputs: InputType[];
}

interface InputSelectorProps {
  groups: InputGroup[];
  onSelectInput: (inputValue: string) => void;
  onSelectGroup: (groupInputs: InputType[]) => void;
  supabaseClient?: any;
}

interface Task {
  id: string;
  title: string;
  content: string;
  pitch?: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  planned_hours?: number;
  owner_id?: string;
  column_id?: string;
  custom_columns?: Array<{ id: string; title: string }> | null;
  updated_at: string;
}

// Фиксированное маппирование групп на контрастные цвета
const GROUP_COLOR_MAP: Record<string, string> = {
  "Основные поля задачи": "bg-blue-100 text-blue-700 border-blue-200",
  "Участники": "bg-orange-100 text-orange-700 border-orange-200",
  "Иерархия задач": "bg-purple-100 text-purple-700 border-purple-200",
  "Даты и время": "bg-green-100 text-green-700 border-green-200",
  "Контент и сообщения": "bg-pink-100 text-pink-700 border-pink-200",
  "Коллекция компонентов": "bg-teal-100 text-teal-700 border-teal-200",
  "Промпты": "bg-violet-100 text-violet-700 border-violet-200",
  "Модель LLM": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Извлекатель Json": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Правила роутинга": "bg-rose-100 text-rose-700 border-rose-200",
  "Направления": "bg-amber-100 text-amber-700 border-amber-200",
  "Каналы": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Триггеры": "bg-sky-100 text-sky-700 border-sky-200",
};

// Функция для получения уникального цвета группы на основе её имени
const getGroupColor = (groupName: string): string => {
  return GROUP_COLOR_MAP[groupName] || "bg-gray-100 text-gray-700 border-gray-200";
};

export const InputSelector = ({ groups, onSelectInput, onSelectGroup, supabaseClient }: InputSelectorProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedInputs, setSelectedInputs] = useState<Set<string>>(new Set());
  const [recentInputExamples, setRecentInputExamples] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskSelectorOpen, setTaskSelectorOpen] = useState(false);
  const [columns, setColumns] = useState<Column[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [taskRelations, setTaskRelations] = useState<TaskRelation[]>([]);
  const [taskChildren, setTaskChildren] = useState<TaskChildRelation[]>([]);
  const [assignments, setAssignments] = useState<Array<{ user_id: string; task_id: string }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Загружаем задачи
      const { data: tasksData } = await supabaseClient
        .from('tasks')
        .select('id, title, content, pitch, priority, start_date, end_date, planned_hours, owner_id, column_id, custom_columns, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);
      
      if (tasksData) {
        setTasks(tasksData as Task[]);
        if (tasksData.length > 0) {
          const first = tasksData[0] as Task;
          setSelectedTask(first);
          updateExamplesFromTask(first);
          
          // Родители первой задачи
          const { data: relationsData } = await supabaseClient
            .from('task_relations')
            .select('parent_id, parent:tasks!task_relations_parent_id_fkey(title, custom_columns)')
            .eq('child_id', first.id);
          if (relationsData) {
            setTaskRelations(relationsData.map((r: any) => ({
              parent_id: r.parent_id,
              parent_task: r.parent ? { title: r.parent.title, custom_columns: r.parent.custom_columns } : undefined,
            })));
          }

          // Дочерние задачи (подзадачи) первой задачи
          const { data: childrenData } = await supabaseClient
            .from('task_relations')
            .select('child_id, child:tasks!task_relations_child_id_fkey(title)')
            .eq('parent_id', first.id);
          if (childrenData) {
            setTaskChildren(childrenData.map((c: any) => ({
              child_id: c.child_id,
              child_task: c.child ? { title: c.child.title } : undefined,
            })));
          }
          
          // Assignments
          const { data: assignmentsData } = await supabaseClient
            .from('task_assignments')
            .select('user_id, task_id')
            .eq('task_id', first.id);
          if (assignmentsData) setAssignments(assignmentsData);
        }
      }
      
      // Колонки
      const { data: columnsData } = await supabaseClient
        .from('global_stages')
        .select('id, title');
      if (columnsData) setColumns(columnsData);
      
      // Профили
      const { data: profilesData } = await supabaseClient
        .from('profiles')
        .select('user_id, full_name');
      if (profilesData) setProfiles(profilesData);
    };
    
    fetchData();
  }, []);

  const updateExamplesFromTask = (task: Task) => {
    const examples: Record<string, string> = {};
    
    // Стандартные поля задачи
    const truncate = (str: string) => str && str.length > 7 ? str.substring(0, 7) + '...' : str;
    
    if (task.title) examples['task.title'] = truncate(getCleanTitle(task.title));
    if (task.content) examples['task.content'] = truncate(task.content);
    if (task.priority) examples['task.priority'] = truncate(task.priority);
    if (task.start_date) examples['task.start_date'] = truncate(task.start_date);
    if (task.end_date) examples['task.end_date'] = truncate(task.end_date);
    if (task.owner_id) examples['task.owner_id'] = truncate(task.owner_id);
    if (task.column_id) examples['task.column_id'] = truncate(task.column_id);
    
    // Custom columns
    if (task.custom_columns && Array.isArray(task.custom_columns)) {
      task.custom_columns.forEach((col: any) => {
        if (col.title && typeof col.title === 'string') {
          examples[col.id] = truncate(col.title);
        }
      });
    }
    
    setRecentInputExamples(examples);
  };

  const handleTaskSelect = async (task: Task) => {
    setSelectedTask(task);
    updateExamplesFromTask(task);
    setTaskSelectorOpen(false);
    
    // Родители выбранной задачи
    const { data: relationsData } = await supabaseClient
      .from('task_relations')
      .select('parent_id, parent:tasks!task_relations_parent_id_fkey(title, custom_columns)')
      .eq('child_id', task.id);
    if (relationsData) {
      setTaskRelations(relationsData.map((r: any) => ({
        parent_id: r.parent_id,
        parent_task: r.parent ? { title: r.parent.title, custom_columns: r.parent.custom_columns } : undefined,
      })));
    }

    // Дочерние задачи (подзадачи) выбранной задачи
    const { data: childrenData } = await supabaseClient
      .from('task_relations')
      .select('child_id, child:tasks!task_relations_child_id_fkey(title)')
      .eq('parent_id', task.id);
    if (childrenData) {
      setTaskChildren(childrenData.map((c: any) => ({
        child_id: c.child_id,
        child_task: c.child ? { title: c.child.title } : undefined,
      })));
    }
    
    // Assignments выбранной задачи
    const { data: assignmentsData } = await supabaseClient
      .from('task_assignments')
      .select('user_id, task_id')
      .eq('task_id', task.id);
    if (assignmentsData) setAssignments(assignmentsData);
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleInputSelection = (inputValue: string) => {
    const newSelected = new Set(selectedInputs);
    if (newSelected.has(inputValue)) {
      newSelected.delete(inputValue);
    } else {
      newSelected.add(inputValue);
    }
    setSelectedInputs(newSelected);
  };

  const handleGroupClick = (group: InputGroup) => {
    onSelectGroup(group.inputs);
    setSelectedInputs(new Set());
  };

  const isGroupSelected = (group: InputGroup) => {
    return group.inputs.every(input => selectedInputs.has(input.value));
  };

  // Функция для разрешения названия колонки/этапа
  const resolveColumnTitle = (columnId: string): string => {
    // 1. Проверяем глобальные этапы по ID
    const globalColumnById = columns.find(c => c.id === columnId);
    if (globalColumnById) return globalColumnById.title;
    
    // 2. Проверяем глобальные этапы по названию
    const globalColumnByTitle = columns.find(c => c.title === columnId);
    if (globalColumnByTitle) return globalColumnByTitle.title;
    
    // 3. Проверяем кастомные колонки самой задачи
    if (selectedTask?.custom_columns && Array.isArray(selectedTask.custom_columns)) {
      const customCol = selectedTask.custom_columns.find((col: any) => col.id === columnId);
      if (customCol && customCol.title) return customCol.title;
    }
    
    // 4. Проверяем кастомные колонки у родительских задач
    for (const relation of taskRelations) {
      if (relation.parent_task?.custom_columns && Array.isArray(relation.parent_task.custom_columns)) {
        const parentCustomCol = relation.parent_task.custom_columns.find((col: any) => col.id === columnId);
        if (parentCustomCol && parentCustomCol.title) return parentCustomCol.title;
      }
    }
    
    // 5. Fallback - возвращаем исходный ID
    return columnId;
  };

  const getFullValueForInput = (inputValue: string, inputLabel?: string): string | null => {
    if (!selectedTask) return null;

    // Специальная обработка для контента - очищаем HTML
    if (inputValue === 'task_content') {
      return getCleanTitle(selectedTask.content, 'Нет содержимого');
    }
    
    // Специальная обработка для этапа - показываем название
    if (inputValue === 'task_column') {
      return resolveColumnTitle(selectedTask.column_id || '');
    }
    
    // Специальная обработка для заголовка - очищаем HTML
    if (inputValue === 'task_title') {
      return getCleanTitle(selectedTask.title);
    }
    
    // Для списка всех задач - очищаем HTML
    if (inputValue === 'all_tasks_list') {
      return tasks.map(t => `- ${getCleanTitle(t.title)}`).join('\n');
    }
    
    // Для родительских задач - очищаем HTML
    if (inputValue === 'profile_recommended_parents') {
      if (taskRelations.length === 0) return 'Нет родительских задач';
      return taskRelations.map(r => `- ${getCleanTitle(r.parent_task?.title || 'Без названия')}`).join('\n');
    }
    
    // Для подзадач - очищаем HTML
    if (inputValue === 'task_children' || inputValue === 'task_subtasks' || inputValue === 'subtasks_list') {
      if (taskChildren.length === 0) return 'Нет подзадач';
      return taskChildren.map(c => `- ${getCleanTitle(c.child_task?.title || 'Без названия')}`).join('\n');
    }
    
    // Теперь старая логика для task_column
    if (inputValue === 'old_task_column_logic') {
      // Сначала проверяем глобальные этапы
      const globalColumn = columns.find(c => c.id === selectedTask.column_id);
      if (globalColumn) return globalColumn.title;
      
      // Затем проверяем кастомные колонки задачи
      if (selectedTask.custom_columns && Array.isArray(selectedTask.custom_columns)) {
        const customCol = selectedTask.custom_columns.find((col: any) => col.id === selectedTask.column_id);
        if (customCol && customCol.title) return customCol.title;
      }
      
      return selectedTask.column_id;
    }
    
    // Специальная обработка для владельца - показываем имя
    if (inputValue === 'task_owner') {
      const profile = profiles.find(p => p.user_id === selectedTask.owner_id);
      return profile?.full_name || selectedTask.owner_id || 'Не назначен';
    }
    
    // Специальная обработка для участников
    if (inputValue === 'task_assignees') {
      if (assignments.length === 0) return 'Нет участников';
      const assigneeNames = assignments
        .map(a => {
          const profile = profiles.find(p => p.user_id === a.user_id);
          return profile?.full_name || a.user_id;
        })
        .join(', ');
      return assigneeNames;
    }
    
    // Специальная обработка для родителей
    if (inputValue === 'profile_recommended_parents') {
      if (taskRelations.length === 0) return 'Нет родительских задач';
      const parentTitles = taskRelations
        .map(r => r.parent_task?.title || r.parent_id)
        .join(', ');
      return parentTitles;
    }

    // Специальная обработка для дочерних задач (подзадач)
    if (inputValue === 'task_children' || inputValue === 'task_subtasks' || inputValue === 'subtasks_list') {
      if (taskChildren.length === 0) return 'Нет подзадач';
      const childTitles = taskChildren
        .map(c => c.child_task?.title || c.child_id)
        .join(', ');
      return childTitles;
    }
    
    // Специальная обработка для списка всех задач
    if (inputValue === 'all_tasks_list') {
      if (tasks.length === 0) return 'Нет задач';
      const tasksList = tasks
        .map(t => `${t.title}${t.pitch ? ` (${t.pitch})` : ''}`)
        .join('; ');
      return tasksList;
    }

    // Mapping input values to task fields
    const fieldMap: Record<string, any> = {
      'task_title': selectedTask.title,
      'task_pitch': selectedTask.pitch,
      'task_content': getCleanTitle(selectedTask.content, 'Нет содержимого'),
      'task_priority': selectedTask.priority,
      'task_column': selectedTask.column_id,
      'task_owner': selectedTask.owner_id,
      'task_start_date': selectedTask.start_date,
      'task_end_date': selectedTask.end_date,
      'task_planned_hours': selectedTask.planned_hours,
    };

    // Check standard fields
    if (fieldMap[inputValue] !== undefined && fieldMap[inputValue] !== null) {
      return String(fieldMap[inputValue]);
    }

    // Check custom columns
    if (selectedTask.custom_columns && Array.isArray(selectedTask.custom_columns)) {
      const customCol = selectedTask.custom_columns.find((col: any) => col.id === inputValue);
      if (customCol && customCol.title) {
        return customCol.title;
      }
    }

    return null;
  };

  const getInputTooltip = (inputValue: string, inputLabel: string): string => {
    // Специальная обработка для UI компонентов
    if (inputValue === 'ui_parent_suggestions') {
      return `${inputLabel} - ParentSuggestions.tsx компонент для отображения предложенных родительских задач. Принимает данные через UI events из роутинга агента.`;
    }

    const fullValue = getFullValueForInput(inputValue);
    if (!fullValue) {
      return `${inputLabel} (нет данных в выбранной задаче)`;
    }
    
    return `${inputLabel}: "${fullValue}"`;
  };

  return (
    <TooltipProvider delayDuration={300}>
    <div className="w-[400px]">
      <div className="mb-2 pb-2 border-b">
        <Popover open={taskSelectorOpen} onOpenChange={setTaskSelectorOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between text-[15px] h-8"
            >
              <span className="truncate">{selectedTask ? selectedTask.title : "Выберите задачу"}</span>
              <Search className="h-3 w-3 ml-2 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Поиск задачи..." className="h-8 text-[15px]" />
              <CommandList>
                <CommandEmpty>Задачи не найдены</CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-[200px]">
                    {tasks.map((task) => (
                      <CommandItem
                        key={task.id}
                        value={task.title}
                        onSelect={() => handleTaskSelect(task)}
                        className="text-[15px]"
                      >
                        {task.title}
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <ScrollArea className="h-[280px]">
        <div className="space-y-0.5 pr-3">
          {groups.map((group) => {
            const groupColor = getGroupColor(group.name);
            const isExpanded = expandedGroups.has(group.name);
            const allSelected = isGroupSelected(group);

            return (
              <div key={group.name} className="space-y-0.5">
                <div className="flex items-center gap-1 py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-accent/50"
                    onClick={() => toggleGroup(group.name)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-6 justify-start text-[15px] font-medium px-2 hover:bg-accent/50 flex items-center gap-2"
                    onClick={() => handleGroupClick(group)}
                  >
                    <span>{group.name}</span>
                    <span className="mx-1">-</span>
                    <Badge variant="outline" className={`text-[13px] px-1.5 py-0 h-4 border ${getGroupColor(group.name)}`}>
                      {group.inputs.length}
                    </Badge>
                  </Button>
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => {
                      if (allSelected) {
                        const newSelected = new Set(selectedInputs);
                        group.inputs.forEach(input => newSelected.delete(input.value));
                        setSelectedInputs(newSelected);
                      } else {
                        const newSelected = new Set(selectedInputs);
                        group.inputs.forEach(input => newSelected.add(input.value));
                        setSelectedInputs(newSelected);
                      }
                    }}
                    className="h-3 w-3"
                  />
                </div>

                {isExpanded && (
                  <div className="ml-6 space-y-1">
                    {/* Специальная обработка для группы "Извлекатель Json" */}
                    {group.name === "Извлекатель Json" ? (
                      <>
                        {/* Группируем переменные по модулям JSON экстрактора */}
                        {(() => {
                          // Находим JSON файлы (они имеют формат module_X_json_file)
                          const jsonFiles = group.inputs.filter(input => input.value.includes('_json_file'));
                          const variables = group.inputs.filter(input => input.value.startsWith('json_') && !input.value.includes('_json_file'));
                          
                          // Если есть JSON файлы, показываем их с переменными
                          if (jsonFiles.length > 0) {
                            return (
                              <>
                                {jsonFiles.map((jsonFile) => {
                                  // Извлекаем ID модуля из value
                                  const moduleIdMatch = jsonFile.value.match(/module_(.+)_json_file/);
                                  const moduleId = moduleIdMatch ? moduleIdMatch[1] : null;
                                  
                                  // Находим переменные, относящиеся к этому модулю (по факту все json_ переменные)
                                  // Формируем список переменных для тултипа
                                  const variablesList = variables.map(v => v.label).join('\n• ');
                                  const tooltipContent = `${jsonFile.label}\n\nИзвлеченные переменные:\n• ${variablesList || 'Нет переменных'}`;
                                  
                                  return (
                                    <Tooltip key={jsonFile.value}>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="w-full h-8 justify-start text-[15px] px-2 hover:bg-accent/50 flex flex-row items-center gap-1.5"
                                          onClick={() => onSelectInput(jsonFile.value)}
                                        >
                                          <Badge 
                                            variant="outline" 
                                            className={`text-[13px] px-2 py-0.5 h-5 ${groupColor}`}
                                          >
                                            {jsonFile.label}
                                          </Badge>
                                          <span className="text-[11px] text-muted-foreground ml-2">
                                            {variables.length} переменных
                                          </span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="right" className="max-w-md">
                                        <p className="text-[15px] whitespace-pre-wrap break-words">
                                          {tooltipContent}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                                
                                {/* Показываем отдельные переменные под JSON файлом */}
                                {variables.length > 0 && (
                                  <div className="ml-4 mt-1 space-y-0.5">
                                    {variables.map((input) => {
                                      const fullValue = getFullValueForInput(input.value);
                                      const badgeValue = fullValue && fullValue !== "Нет данных" 
                                        ? (fullValue.length > 15 ? fullValue.substring(0, 15) + '...' : fullValue)
                                        : null;
                                      const tooltipContent = getInputTooltip(input.value, input.label);
                                      
                                      return (
                                        <Tooltip key={input.value}>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="w-full h-7 justify-start text-[14px] px-2 hover:bg-accent/50 flex flex-row items-center gap-1.5 opacity-80"
                                              onClick={() => onSelectInput(input.value)}
                                            >
                                              <Badge 
                                                variant="outline" 
                                                className={`text-[12px] px-1.5 py-0.5 h-4 ${groupColor}`}
                                              >
                                                {input.label}
                                              </Badge>
                                              {badgeValue && (
                                                <span className="text-[12px] text-muted-foreground ml-2 truncate max-w-[120px]">
                                                  {badgeValue}
                                                </span>
                                              )}
                                            </Button>
                                          </TooltipTrigger>
                                          {tooltipContent && tooltipContent !== "Нет данных в выбранной задаче" && (
                                            <TooltipContent side="right" className="max-w-md">
                                              <p className="text-[15px] whitespace-pre-wrap break-words">
                                                {tooltipContent}
                                              </p>
                                            </TooltipContent>
                                          )}
                                        </Tooltip>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            );
                          } else {
                            // Если нет JSON файлов, показываем просто переменные
                            return group.inputs.map((input) => {
                              const fullValue = getFullValueForInput(input.value);
                              const badgeValue = fullValue && fullValue !== "Нет данных" 
                                ? (fullValue.length > 15 ? fullValue.substring(0, 15) + '...' : fullValue)
                                : null;
                              const tooltipContent = getInputTooltip(input.value, input.label);
                              
                              return (
                                <Tooltip key={input.value}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full h-8 justify-start text-[15px] px-2 hover:bg-accent/50 flex flex-row items-center gap-1.5"
                                      onClick={() => onSelectInput(input.value)}
                                    >
                                      <Badge 
                                        variant="outline" 
                                        className={`text-[13px] px-2 py-0.5 h-5 ${groupColor}`}
                                      >
                                        {input.label}
                                      </Badge>
                                      {badgeValue && (
                                        <span className="text-[13px] text-muted-foreground ml-2 truncate max-w-[120px]">
                                          {badgeValue}
                                        </span>
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  {tooltipContent && tooltipContent !== "Нет данных в выбранной задаче" && (
                                    <TooltipContent side="right" className="max-w-md">
                                      <p className="text-[15px] whitespace-pre-wrap break-words">
                                        {tooltipContent}
                                      </p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              );
                            });
                          }
                        })()}
                      </>
                    ) : (
                      /* Обычное отображение для других групп */
                      group.inputs.map((input) => {
                        const fullValue = getFullValueForInput(input.value);
                        const badgeValue = fullValue && fullValue !== "Нет данных" 
                          ? (fullValue.length > 15 ? fullValue.substring(0, 15) + '...' : fullValue)
                          : null;
                        const tooltipContent = getInputTooltip(input.value, input.label);
                        
                        return (
                          <Tooltip key={input.value}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-8 justify-start text-[15px] px-2 hover:bg-accent/50 flex flex-row items-center gap-1.5"
                                onClick={() => onSelectInput(input.value)}
                              >
                                <Badge 
                                  variant="outline" 
                                  className={`text-[13px] px-2 py-0.5 h-5 ${groupColor}`}
                                >
                                  {input.label}
                                </Badge>
                                {badgeValue && (
                                  <span className="text-[13px] text-muted-foreground ml-2 truncate max-w-[120px]">
                                    {badgeValue}
                                  </span>
                                )}
                              </Button>
                            </TooltipTrigger>
                            {tooltipContent && tooltipContent !== "Нет данных в выбранной задаче" && (
                              <TooltipContent side="right" className="max-w-md">
                                <p className="text-[15px] whitespace-pre-wrap break-words">
                                  {tooltipContent}
                                </p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {selectedInputs.size > 0 && (
        <div className="mt-2 pt-2 border-t">
          <Button
            size="sm"
            className="w-full h-7 text-[15px]"
            onClick={() => {
              const inputs = Array.from(selectedInputs)
                .map(value => groups.flatMap(g => g.inputs).find(i => i.value === value))
                .filter(Boolean) as InputType[];
              onSelectGroup(inputs);
              setSelectedInputs(new Set());
            }}
          >
            Добавить выбранные ({selectedInputs.size})
          </Button>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
};
