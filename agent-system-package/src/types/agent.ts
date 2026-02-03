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
  targetType?: 'database' | 'ui_component';
  targetTable?: string;
  targetColumn?: string;
  targetRecordId?: string;
  componentName?: string;
  eventType?: string;
  config?: Record<string, any>;
  order?: number;
};

export interface RouterRule {
  id: string;
  sourceVariableId?: string | string[];
  destinationId: string;
  conditions?: TriggerCondition[];
  conditionLogic?: string;
  variableMapping?: Record<string, any>;
}

export interface RouterConfig {
  strategy: 'based_on_input' | 'based_on_llm' | 'all_destinations';
  rules?: RouterRule[];
  description?: string;
  content?: string;
  sourceInputId?: string;
  sourceInputIds?: string[];
}

export interface TriggerCondition {
  id: string;
  type: 'trigger' | 'filter';
  triggerType?: 'on_create' | 'on_update' | 'scheduled' | 'on_demand';
  scheduledTime?: string;
  scheduledTimezone?: string;
  operator?: 'is_empty' | 'is_not_empty' | 'equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with';
  value?: string;
}

export interface InputTrigger {
  id: string;
  inputId: string;
  conditions: TriggerCondition[];
  conditionLogic: string;
}

export interface TriggerConfig {
  enabled: boolean;
  inputTriggers: InputTrigger[];
  strategy: 'all_match' | 'any_match';
  activateModuleId?: string;
  correctActivateModuleId?: string;
  notCorrectActivateModuleId?: string;
}

export interface AgentModule {
  id: string;
  type: 'trigger' | 'prompt' | 'model' | 'json_extractor' | 'router' | 'destinations' | 'channels';
  order: number;
  config: any;
}

export interface JsonVariable {
  id: string;
  name: string;
  path: string;
  description?: string;
  example?: string;
}

export interface JsonExtractorConfig {
  variables: JsonVariable[];
  sourceInputId?: string;
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
  modules?: AgentModule[];
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
    inputs: []
  },
  {
    name: "Модель LLM",
    inputs: []
  },
  {
    name: "Извлекатель Json",
    inputs: []
  },
  {
    name: "Правила роутинга",
    inputs: []
  },
  {
    name: "Направления",
    inputs: []
  },
  {
    name: "Каналы",
    inputs: []
  },
  {
    name: "Триггеры",
    inputs: []
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
