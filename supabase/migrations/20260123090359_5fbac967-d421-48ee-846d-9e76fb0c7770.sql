-- Таблица персональных настроек доски для каждого пользователя
CREATE TABLE public.board_user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  board_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  
  -- Настройки отображения
  view_mode text DEFAULT 'board', -- 'board' | 'table' | 'graph'
  sort_by text DEFAULT 'owner_first', -- 'owner_first' | 'priority' | 'end_date' | 'updated_at' | null
  sort_direction text DEFAULT 'desc',
  filter_by_owner uuid,
  hide_completed boolean DEFAULT true,
  search_query text,
  
  -- Персональные позиции карточек (JSON: {task_id: position})
  card_positions jsonb DEFAULT '{}',
  
  -- Свёрнутые колонки для этого пользователя
  collapsed_columns jsonb DEFAULT '[]',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, board_id)
);

-- RLS политики
ALTER TABLE public.board_user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.board_user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.board_user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.board_user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON public.board_user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger для автообновления updated_at
CREATE TRIGGER update_board_user_settings_updated_at
  BEFORE UPDATE ON public.board_user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();