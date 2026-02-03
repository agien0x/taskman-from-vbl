export interface AgentInput {
  id: string;
  type: string;
  order: number;
  customText?: string;
}

export interface AgentOutput {
  id: string;
  type: string;
  config?: Record<string, any>;
}

export type InputElement = {
  id: string;
  type: string;
  label?: string;
  content?: string;
  order?: number;
};

export type DestinationElement = {
  id: string;
  type: string;
  label?: string;
  targetType?: 'database' | 'ui_component'; // Тип назначения
  // Для database:
  targetTable?: string; // 'tasks', 'comments', и т.д.
  targetColumn?: string; // 'content', 'title', 'pitch'
  targetRecordId?: string; // Опционально: ID записи
  // Для UI:
  componentName?: string; // 'ParentSuggestions', 'TaskComments', и т.д.
  eventType?: string; // 'parent_suggestions_ready', 'comments_update'
  config?: Record<string, any>;
  order?: number;
};

export interface RouterRule {
  id: string;
  sourceVariableId?: string | string[]; // ID JSON переменной (источник данных) или массив ID для объединения в массив
  destinationId: string;
  // Обратная совместимость со старым форматом:
  conditions?: TriggerCondition[]; // Условия триггера (старый формат)
  conditionLogic?: string; // Логика условий (старый формат)
  variableMapping?: Record<string, any>; // Маппинг переменных (старый формат)
}

export interface RouterConfig {
  strategy: 'based_on_input' | 'based_on_llm' | 'all_destinations';
  rules?: RouterRule[]; // Правила с условиями и формулами
  description?: string;
  content?: string; // Описание роутинга (rich text)
  // Обратная совместимость со старым форматом:
  sourceInputId?: string; // ID источника данных (старый формат)
  sourceInputIds?: string[]; // Массив ID источников (старый формат)
}

export interface TriggerCondition {
  id: string;
  type: 'trigger' | 'filter';
  // Для trigger
  triggerType?: 'on_create' | 'on_update' | 'scheduled' | 'on_demand';
  scheduledTime?: string;
  scheduledTimezone?: string;
  // Для filter
  operator?: 'is_empty' | 'is_not_empty' | 'equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with';
  value?: string;
}

export interface InputTrigger {
  id: string;
  inputId: string;
  conditions: TriggerCondition[]; // массив условий (триггеров и фильтров)
  conditionLogic: string; // строка типа "(0 OR 1) AND 2" для описания логики
}

export interface TriggerConfig {
  enabled: boolean;
  inputTriggers: InputTrigger[];
  strategy: 'all_match' | 'any_match'; // OR/AND между разными инпутами
  activateModuleId?: string; // ID модуля, который нужно активировать при срабатывании триггера (deprecated, use correctActivateModuleId)
  correctActivateModuleId?: string; // ID модуля для активации при выполнении условий (Correct)
  notCorrectActivateModuleId?: string; // ID модуля для активации при невыполнении условий (NotCorrect), или 'stop'
}

// Модуль агента - универсальная структура для всех секций
export interface AgentModule {
  id: string;
  type: 'trigger' | 'prompt' | 'model' | 'json_extractor' | 'router' | 'destinations' | 'channels';
  order: number;
  config: any; // Специфичная конфигурация для каждого типа модуля
}

// Конфигурация модуля извлечения JSON переменных
export interface JsonVariable {
  id: string;
  name: string; // Название переменной (например, "user_id", "order_total")
  path: string; // JSON path (например, "data.user.id", "items[0].price")
  description?: string;
  example?: string; // Пример значения
}

export interface JsonExtractorConfig {
  variables: JsonVariable[];
  sourceInputId?: string; // ID инпута, из которого извлекаем (если не указан, то из output модели)
}

export interface Agent {
  id: string;
  name: string;
  model: string;
  prompt: string;
  pitch?: string;
  icon_url?: string;
  created_at: string;
  updated_at: string;
  inputs?: AgentInput[];
  outputs?: AgentOutput[];
  inputElements?: InputElement[];
  outputElements?: DestinationElement[];
  routerConfig?: RouterConfig;
  triggerConfig?: TriggerConfig;
  modules?: AgentModule[]; // Новая модульная структура
}

export const INPUT_TYPES = [
  { value: "task_title", label: "Название задачи" },
  { value: "task_pitch", label: "Питч задачи" },
  { value: "task_content", label: "Контент задачи" },
  { value: "task_priority", label: "Приоритет задачи" },
  { value: "task_column", label: "Этап задачи" },
  { value: "task_owner", label: "Владелец задачи" },
  { value: "task_assignees", label: "Участники задачи" },
  { value: "task_parent_chain", label: "Цепочка парентов" },
  { value: "task_subtasks", label: "Подзадачи" },
  { value: "task_start_date", label: "Дата начала" },
  { value: "task_end_date", label: "Дата окончания" },
  { value: "task_planned_hours", label: "Планируемые часы" },
  { value: "all_tasks_list", label: "Список всех задач (названия + питчи)" },
  { value: "profile_recommended_parents", label: "Рекомендованные паренты" },
  { value: "editor_content", label: "Содержимое редактора" },
  { value: "incoming_messages", label: "Входящие сообщения" },
  { value: "custom_text", label: "Произвольный текст" },
  { value: "ui_parent_suggestions", label: "Предложенные паренты" },
] as const;

export const INPUT_GROUPS = [
  {
    name: "Основные поля задачи",
    inputs: [
      { value: "task_title", label: "Название задачи" },
      { value: "task_pitch", label: "Питч задачи" },
      { value: "task_content", label: "Контент задачи" },
      { value: "task_priority", label: "Приоритет задачи" },
      { value: "task_column", label: "Этап задачи" },
    ]
  },
  {
    name: "Участники",
    inputs: [
      { value: "task_owner", label: "Владелец задачи" },
      { value: "task_assignees", label: "Участники задачи" },
    ]
  },
  {
    name: "Иерархия задач",
    inputs: [
      { value: "task_parent_chain", label: "Цепочка парентов" },
      { value: "profile_recommended_parents", label: "Рекомендованные паренты" },
      { value: "task_subtasks", label: "Подзадачи" },
      { value: "all_tasks_list", label: "Список всех задач" },
    ]
  },
  {
    name: "Даты и время",
    inputs: [
      { value: "task_start_date", label: "Дата начала" },
      { value: "task_end_date", label: "Дата окончания" },
      { value: "task_planned_hours", label: "Планируемые часы" },
    ]
  },
  {
    name: "Контент и сообщения",
    inputs: [
      { value: "editor_content", label: "Содержимое редактора" },
      { value: "incoming_messages", label: "Входящие сообщения" },
      { value: "custom_text", label: "Произвольный текст" },
    ]
  },
  {
    name: "Коллекция компонентов",
    inputs: [
      { value: "ui_parent_suggestions", label: "Предложенные паренты" },
    ]
  },
  {
    name: "Промпты",
    inputs: [] // Динамически заполняется из prompt модулей
  },
  {
    name: "Модель LLM",
    inputs: [] // Динамически заполняется из model модулей
  },
  {
    name: "Извлекатель Json",
    inputs: [] // Динамически заполняется из json_extractor модулей
  },
  {
    name: "Правила роутинга",
    inputs: [] // Динамически заполняется из router модулей
  },
  {
    name: "Направления",
    inputs: [] // Динамически заполняется из destinations модулей
  },
  {
    name: "Каналы",
    inputs: [] // Динамически заполняется из channels модулей
  },
  {
    name: "Триггеры",
    inputs: [] // Динамически заполняется из trigger модулей
  },
];

export const DESTINATION_TYPES = [
  { value: "task_title", label: "Заголовок задачи", description: "Название задачи" },
  { value: "task_pitch", label: "Питч задачи", description: "Краткое описание (до 8 слов)" },
  { value: "task_content", label: "Контент задачи", description: "Основное содержимое" },
  { value: "editor_content", label: "Редактор задачи", description: "Rich-контент в редакторе" },
  { value: "task_comment", label: "Комментарий к задаче", description: "Добавить комментарий" },
  { value: "parent_suggestions", label: "Виджет рекомендаций парентов", description: "Предложения родительских задач" },
  { value: "ui_parent_suggestions", label: "UI: Предложенные паренты", description: "ParentSuggestions.tsx компонент" },
  { value: "message_telegram", label: "Отправка в Telegram", description: "Отправить сообщение" },
  { value: "message_email", label: "Отправка на Email", description: "Отправить письмо" },
  { value: "message_telegram_bot", label: "Отправка через Telegram бота", description: "Через бот API" },
] as const;

export const OUTPUT_TYPES = DESTINATION_TYPES;

export const AVAILABLE_MODELS = [
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "openai/gpt-5", label: "GPT-5" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano" },
  { value: "x-ai/grok-beta", label: "Grok Beta" },
  { value: "x-ai/grok-4-reasoning", label: "Grok 4 Reasoning" },
  { value: "x-ai/grok-vision-beta", label: "Grok Vision Beta" },
] as const;
