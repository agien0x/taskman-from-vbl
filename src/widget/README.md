# Task Manager Widget

Встраиваемые виджеты для отображения и управления задачами на любом сайте с автоматической Realtime синхронизацией.

## 🚀 Быстрый старт

### 1. Получите API токен

Перейдите на `/widget-docs` в вашем приложении и создайте новый API токен.

### 2. Добавьте виджет на свой сайт

#### Вариант A: Полный виджет задач

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <!-- Подключаем Web Component -->
  <script type="module">
    import { TaskWidget } from 'https://your-domain.com/widget/index.js';
  </script>

  <!-- Виджет с автоматическим обновлением -->
  <task-widget 
    api-token="your-api-token-here"
    theme="light">
  </task-widget>
</body>
</html>
```

#### Вариант B: Флажки задач

```html
<!-- Флажок для отдельной задачи -->
<script type="module">
  import { TaskBadgeWidget } from 'https://your-domain.com/widget/index.js';
</script>

<task-badge 
  api-token="your-api-token-here"
  task-id="task-uuid-here"
  position="top-right">
</task-badge>
```

## ⚡ Realtime синхронизация

Все виджеты автоматически подключаются к Realtime через WebSocket:

- ✅ **INSERT** - Новые задачи появляются автоматически
- ✅ **UPDATE** - Изменения синхронизируются мгновенно  
- ✅ **DELETE** - Удаленные задачи исчезают сразу

**Никаких дополнительных настроек не требуется!** Просто добавьте виджет, и он будет обновляться автоматически.

## 🔧 REST API

### Создание задачи из другого проекта Lovable

```javascript
const response = await fetch(
  'https://vmtjcycacbrzefrxeakv.supabase.co/functions/v1/widget-api-create/YOUR_TOKEN/tasks',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Новая задача',
      content: 'Описание задачи',
      column_id: 'todo',
      priority: 'medium'
    })
  }
);

const task = await response.json();
console.log('Created task:', task);
```

### Получение списка задач

```javascript
const response = await fetch(
  'https://vmtjcycacbrzefrxeakv.supabase.co/functions/v1/widget-api-list/YOUR_TOKEN/tasks'
);
const tasks = await response.json();
console.log('Tasks:', tasks);
```

### Обновление задачи

```javascript
const response = await fetch(
  'https://vmtjcycacbrzefrxeakv.supabase.co/functions/v1/widget-api-update/YOUR_TOKEN/tasks/TASK_ID',
  {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      column_id: 'done',
      priority: 'high'
    })
  }
);
```

### Удаление задачи

```javascript
const response = await fetch(
  'https://vmtjcycacbrzefrxeakv.supabase.co/functions/v1/widget-api-delete/YOUR_TOKEN/tasks/TASK_ID',
  { method: 'DELETE' }
);
```

## 📦 Использование в React (Lovable проект)

```tsx
import { useEffect, useRef } from 'react';

function MyComponent() {
  const widgetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Web Component автоматически подключит Realtime
    const loadWidget = async () => {
      await import('https://your-domain.com/widget/index.js');
    };
    loadWidget();
  }, []);

  return (
    <div>
      <task-widget 
        ref={widgetRef}
        api-token="your-token"
        theme="dark"
      />
    </div>
  );
}
```

## 🎨 Кастомизация

### Атрибуты `<task-widget>`

- `api-token` (required) - API токен для доступа
- `theme` (optional) - "light" или "dark"
- `parent-task-id` (optional) - ID родительской задачи для фильтрации

### Атрибуты `<task-badge>`

- `api-token` (required) - API токен
- `task-id` (required) - ID задачи
- `position` (optional) - "top-right", "top-left", "bottom-right", "bottom-left"

### CSS переменные (Shadow DOM)

```css
task-widget {
  --widget-bg: #ffffff;
  --widget-text: #1a1a1a;
  --widget-border: #e5e7eb;
  --widget-accent: #3b82f6;
  --widget-hover: #f3f4f6;
}
```

## 🔐 Безопасность

- Токены имеют настраиваемые права доступа (read, write, delete)
- Можно ограничить доступ к конкретной родительской задаче
- Все запросы проходят через защищенные Edge Functions
- Realtime использует публичный anon key (безопасно для чтения)

## 📊 Мониторинг использования

В разделе `/widget-docs` вы можете:
- Создавать и удалять токены
- Просматривать последнее использование
- Управлять правами доступа
- Генерировать код для интеграции

## 🐛 Отладка

Все виджеты логируют события в консоль браузера:

```javascript
// Откройте DevTools и проверьте:
// - Realtime subscription created
// - Realtime event: INSERT/UPDATE/DELETE
// - Task data updates
```

## 📚 Примеры использования

### 1. Dashboard с несколькими виджетами

```html
<div class="dashboard">
  <task-widget api-token="token1" theme="light"></task-widget>
  <task-widget api-token="token2" theme="dark"></task-widget>
</div>
```

### 2. Флажки на разных элементах

```html
<div class="page">
  <task-badge api-token="token" task-id="id1" position="top-right"></task-badge>
  <task-badge api-token="token" task-id="id2" position="bottom-left"></task-badge>
</div>
```

### 3. Создание задач из внешней формы

```html
<form id="taskForm">
  <input type="text" id="title" placeholder="Название задачи">
  <textarea id="content" placeholder="Описание"></textarea>
  <button type="submit">Создать задачу</button>
</form>

<script>
  document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const response = await fetch(
      'https://vmtjcycacbrzefrxeakv.supabase.co/functions/v1/widget-api-create/YOUR_TOKEN/tasks',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: document.getElementById('title').value,
          content: document.getElementById('content').value,
          column_id: 'todo'
        })
      }
    );
    
    // Виджет обновится автоматически через Realtime!
    alert('Задача создана!');
  });
</script>
```

## 🤝 Поддержка

При возникновении проблем:
1. Проверьте консоль браузера на ошибки
2. Убедитесь, что токен валиден
3. Проверьте права доступа токена
4. Проверьте, что Realtime включен для таблицы tasks

---

**Создано с ❤️ для встраивания задач везде**
