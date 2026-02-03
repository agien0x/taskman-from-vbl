-- Добавляем поле активности шаблона
ALTER TABLE task_type_templates 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Создаем таблицу версий шаблонов
CREATE TABLE IF NOT EXISTS template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES task_type_templates(id) ON DELETE CASCADE,
  template_content TEXT NOT NULL,
  quality_criteria TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS для template_versions
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;

-- Пользователи могут просматривать версии шаблонов, к которым имеют доступ
CREATE POLICY "Users can view template versions"
  ON template_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_type_templates
      WHERE task_type_templates.id = template_versions.template_id
        AND (
          task_type_templates.is_global = true
          OR task_type_templates.owner_id = auth.uid()
          OR has_template_access(task_type_templates.id, auth.uid())
        )
    )
  );

-- Владельцы шаблонов могут создавать версии
CREATE POLICY "Template owners can create versions"
  ON template_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_type_templates
      WHERE task_type_templates.id = template_versions.template_id
        AND task_type_templates.owner_id = auth.uid()
    )
  );

-- Владельцы шаблонов могут удалять версии
CREATE POLICY "Template owners can delete versions"
  ON template_versions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM task_type_templates
      WHERE task_type_templates.id = template_versions.template_id
        AND task_type_templates.owner_id = auth.uid()
    )
  );

-- Создаем индекс для быстрой выборки версий
CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX idx_template_versions_created_at ON template_versions(created_at DESC);