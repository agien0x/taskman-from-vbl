# 📖 Руководство по интеграции @lovable/agent-system

## Шаг 1: Установка

```bash
npm install @lovable/agent-system
```

## Шаг 2: Инициализация в проекте

```bash
npx agent-system init
```

Эта команда:
- Копирует SQL миграции в `supabase/migrations/`
- Копирует edge functions в `supabase/functions/`
- Создает конфиг файл `agent-system.config.ts`

## Шаг 3: Применить миграции

### Через Lovable Cloud UI
1. Откройте Cloud → Database → Migrations
2. Примените новые миграции

### Через CLI
```bash
npx agent-system migrate
# или через supabase CLI
npx supabase db push
```

## Шаг 4: Настройка в React приложении

### 4.1 Обернуть приложение в AgentSystemProvider

```typescript
// src/App.tsx
import { AgentSystemProvider } from '@lovable/agent-system';
import { supabase } from '@/integrations/supabase/client';

function App() {
  return (
    <AgentSystemProvider
      config={{
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      }}
    >
      {/* Ваше приложение */}
    </AgentSystemProvider>
  );
}
```

### 4.2 Использовать AgentDialog в компоненте

```typescript
// src/pages/Agents.tsx
import { useState } from 'react';
import AgentDialog from '@lovable/agent-system/components/AgentDialog';
import { useAgentSystem } from '@lovable/agent-system';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    // Агент уже сохранен через dialog
    setDialogOpen(false);
    toast({
      title: "Успешно",
      description: "Агент сохранен",
    });
  };

  return (
    <div>
      <button onClick={() => setDialogOpen(true)}>
        Создать агента
      </button>

      <AgentDialog
        agent={selectedAgent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        supabaseClient={supabase}
        toast={toast}
      />
    </div>
  );
}
```

## Шаг 5: Настройка Secrets для Edge Functions

Если используете X.AI API (или другие AI сервисы), добавьте secrets:

```bash
# Через Lovable Cloud UI
Cloud → Settings → Secrets → Add Secret

# Или через supabase CLI
npx supabase secrets set XAI_API_KEY=your-key-here
```

## Шаг 6: Деплой Edge Functions

Edge functions деплоятся автоматически при изменениях, но можно сделать и вручную:

```bash
npx agent-system deploy
# или через supabase CLI
npx supabase functions deploy test-agent
npx supabase functions deploy check-and-execute-triggers
npx supabase functions deploy list-tables
npx supabase functions deploy list-columns
```

## Шаг 7: Настройка триггеров (опционально)

Если нужны триггеры на изменение данных, добавьте в миграцию:

```sql
-- Пример триггера на обновление задач
CREATE OR REPLACE FUNCTION notify_trigger_manager()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/check-and-execute-triggers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || 'your-anon-key'
    ),
    body := jsonb_build_object(
      'triggerType', 'on_update',
      'sourceEntity', jsonb_build_object(
        'type', 'tasks',
        'id', NEW.id
      ),
      'changedFields', ARRAY['title', 'content']
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_tasks_update
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_trigger_manager();
```

## Расширение системы

### Добавление собственного модуля

```typescript
// src/modules/custom/MyCustomModule.ts
import { IModuleDefinition } from '@lovable/agent-system';
import { MyCustomEditor } from './MyCustomEditor';
import { MyCustomPreview } from './MyCustomPreview';
import { Zap } from 'lucide-react';

export const MyCustomModule: IModuleDefinition = {
  type: 'custom_module',
  label: 'Мой модуль',
  icon: Zap,
  color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  description: 'Описание моего модуля',
  
  getDefaultConfig: () => ({
    enabled: true,
    settings: {},
  }),
  
  validateConfig: (config) => {
    const errors = [];
    if (!config.enabled) {
      errors.push({ field: 'enabled', message: 'Module must be enabled' });
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  },
  
  EditorComponent: MyCustomEditor,
  PreviewComponent: MyCustomPreview,
  
  getDynamicOutputs: (config, moduleId) => {
    return [
      {
        id: `${moduleId}_output`,
        type: 'custom_output',
        label: 'Custom Output',
      }
    ];
  },
};
```

### Регистрация модуля

```typescript
// src/App.tsx
import { moduleRegistry } from '@lovable/agent-system';
import { MyCustomModule } from './modules/custom/MyCustomModule';

// Регистрируем при старте приложения
moduleRegistry.register(MyCustomModule);
```

## Troubleshooting

### Edge functions не вызываются
- Проверьте, что secrets установлены: Cloud → Settings → Secrets
- Проверьте logs: Cloud → Edge Functions → Logs
- Убедитесь, что CORS настроен в edge functions

### Миграции не применяются
- Проверьте права доступа к БД
- Убедитесь, что таблицы не существуют (или удалите старые)
- Проверьте Cloud → Database → Migrations для ошибок

### AgentDialog не отображается
- Проверьте, что все peer dependencies установлены
- Убедитесь, что Supabase client передан корректно
- Проверьте console для ошибок импортов

### Модули не работают
- Проверьте, что модули зарегистрированы в ModuleRegistry
- Убедитесь, что config валиден (вызовите validateConfig)
- Проверьте execution logs в таблице agent_executions

## Поддержка

- GitHub Issues: https://github.com/lovable/agent-system/issues
- Документация: https://docs.lovable.dev/agent-system
- Discord: https://discord.gg/lovable
