export type TaskPriority = 'none' | 'low' | 'medium' | 'high';

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly';

export interface Task {
  id: string;
  title: string;
  pitch?: string | null;
  content: string;
  columnId: string;
  /** Manual order within a column (lower = higher). */
  position?: number;
  subtaskOrder?: number;
  subtasks?: Task[];
  priority?: TaskPriority;
  start_date?: string;
  end_date?: string;
  owner_id?: string;
  is_root?: boolean;
  custom_columns?: Array<{ id: string; title: string; color?: string; collapsed?: boolean }> | null;
  planned_hours?: number;
  task_type?: 'task' | 'personal_board' | 'standup' | 'function';
  recurrence_type?: RecurrenceType;
  recurrence_days?: number[];
  default_content?: string;
  last_recurrence_update?: string;
  use_custom_settings?: boolean;
  custom_template?: string | null;
  custom_quality_criteria?: string | null;
  updated_at?: string;
  created_at?: string;
  attachments?: Array<{ url: string; name: string; size: number }>;
  duplicates?: Array<{ id: string }>;
  auto_load_my_tasks?: boolean;
}

export interface TimeLog {
  id: string;
  task_id: string;
  user_id: string;
  hours: number;
  description: string;
  completion_percentage?: number;
  created_at: string;
}

export interface TaskRelation {
  id: string;
  parent_id: string;
  child_id: string;
  created_at: string;
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
  collapsed?: boolean;
  color?: string;
}
