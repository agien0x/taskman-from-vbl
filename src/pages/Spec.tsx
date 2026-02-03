import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Circle, Clock, Archive, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Feature {
  id: string;
  name: string;
  description: string;
  taskId: string | null;
  taskTitle: string | null;
  status: 'done' | 'inprogress' | 'todo' | 'archived';
  category: string;
}

// Static list of features with task IDs
const FEATURES_CONFIG: Omit<Feature, 'status' | 'taskTitle'>[] = [
  // Core Features
  { id: '1', name: 'Канбан-доска с колонками', description: 'Основная функциональность доски с настраиваемыми колонками', taskId: 'bee63fd2-6a5a-48de-964d-ea063deaf355', category: 'Ядро' },
  { id: '2', name: 'Drag-n-drop задач', description: 'Перетаскивание задач между колонками', taskId: null, category: 'Ядро' },
  { id: '3', name: 'Иерархия задач (подзадачи)', description: 'Вложенные задачи с навигацией drill-down', taskId: null, category: 'Ядро' },
  { id: '4', name: 'Drag-n-drop подзадач между карточками', description: 'Перемещение подзадач из одной карточки в другую', taskId: null, category: 'Ядро' },
  
  // Personal Board
  { id: '5', name: 'Личная доска сотрудника', description: 'Автоматическое создание личной доски при регистрации', taskId: '14a49bca-9a44-4821-a0fd-02cfa4e32878', category: 'Личная доска' },
  { id: '6', name: 'Автозагрузка моих задач', description: 'Автоматическая загрузка задач где пользователь — owner или участник', taskId: '14a49bca-9a44-4821-a0fd-02cfa4e32878', category: 'Личная доска' },
  
  // Settings
  { id: '7', name: 'Персональные настройки доски', description: 'Per-user per-board настройки (сортировка, фильтры, позиции карточек)', taskId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', category: 'Настройки' },
  { id: '8', name: 'Сортировка "Сначала мои"', description: 'Отображение своих задач в начале списка', taskId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', category: 'Настройки' },
  { id: '9', name: 'Скрытие завершённых задач', description: 'Фильтр для скрытия Done и Архив', taskId: null, category: 'Настройки' },
  
  // Agents
  { id: '10', name: 'AI-агенты', description: 'Система автоматизации на основе AI', taskId: null, category: 'Агенты' },
  { id: '11', name: 'Триггеры агентов', description: 'Автоматический запуск агентов при изменениях', taskId: null, category: 'Агенты' },
  { id: '12', name: 'Оценка задач AI', description: 'Автоматическая оценка качества выполнения', taskId: null, category: 'Агенты' },
  
  // Collaboration
  { id: '13', name: 'Назначение участников', description: 'Добавление участников на задачи с ролями', taskId: null, category: 'Совместная работа' },
  { id: '14', name: 'Комментарии к задачам', description: 'Обсуждение задач в комментариях', taskId: null, category: 'Совместная работа' },
  { id: '15', name: 'Учёт времени', description: 'Логирование затраченного времени', taskId: null, category: 'Совместная работа' },
  
  // Views
  { id: '16', name: 'Табличный вид', description: 'Альтернативное отображение задач в таблице', taskId: null, category: 'Представления' },
  { id: '17', name: 'Граф-вид', description: '3D визуализация связей задач', taskId: null, category: 'Представления' },
  
  // Organization
  { id: '18', name: 'Организации', description: 'Группировка проектов по организациям', taskId: null, category: 'Организация' },
  { id: '19', name: 'Проекты', description: 'Проектная структура с участниками', taskId: null, category: 'Организация' },
  
  // Templates
  { id: '20', name: 'Шаблоны задач', description: 'Типовые шаблоны для создания задач', taskId: null, category: 'Шаблоны' },
  { id: '21', name: 'Рекуррентные задачи', description: 'Автоматическое создание повторяющихся задач', taskId: null, category: 'Шаблоны' },
  
  // This feature
  { id: '22', name: 'Техзадание', description: 'Страница с фичами и их статусами', taskId: null, category: 'Документация' },
];

const getStatusIcon = (status: Feature['status']) => {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'inprogress':
      return <Clock className="h-4 w-4 text-pink-500" />;
    case 'archived':
      return <Archive className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: Feature['status']) => {
  switch (status) {
    case 'done':
      return <Badge variant="default" className="bg-green-500/20 text-green-700 dark:text-green-400">Готово</Badge>;
    case 'inprogress':
      return <Badge variant="default" className="bg-pink-500/20 text-pink-700 dark:text-pink-400">В работе</Badge>;
    case 'archived':
      return <Badge variant="secondary">Архив</Badge>;
    default:
      return <Badge variant="outline">Запланировано</Badge>;
  }
};

const mapColumnToStatus = (columnId: string): Feature['status'] => {
  const col = columnId.toLowerCase();
  if (col === 'done' || col.includes('done') || col.includes('готов')) return 'done';
  if (col === 'inprogress' || col.includes('progress') || col.includes('работ')) return 'inprogress';
  if (col === 'archived' || col.includes('archiv') || col.includes('архив')) return 'archived';
  return 'todo';
};

export default function Spec() {
  const navigate = useNavigate();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFeatures = async () => {
      try {
        // Get task IDs that we need to fetch
        const taskIds = FEATURES_CONFIG
          .map(f => f.taskId)
          .filter((id): id is string => id !== null);

        // Fetch task statuses
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('id, title, column_id')
          .in('id', taskIds);

        if (error) throw error;

        // Build features with status
        const taskMap = new Map(tasks?.map(t => [t.id, t]) || []);
        
        const featuresWithStatus: Feature[] = FEATURES_CONFIG.map(config => {
          const task = config.taskId ? taskMap.get(config.taskId) : null;
          return {
            ...config,
            taskTitle: task?.title || null,
            status: task ? mapColumnToStatus(task.column_id) : 'todo',
          };
        });

        setFeatures(featuresWithStatus);
      } catch (error) {
        console.error('Error loading features:', error);
        // Fallback to defaults
        setFeatures(FEATURES_CONFIG.map(config => ({
          ...config,
          taskTitle: null,
          status: 'todo' as const,
        })));
      } finally {
        setIsLoading(false);
      }
    };

    loadFeatures();
  }, []);

  const handleOpenTask = (taskId: string) => {
    navigate(`/?task=${taskId}`);
  };

  // Group features by category
  const featuresByCategory = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  // Calculate stats
  const stats = {
    total: features.length,
    done: features.filter(f => f.status === 'done').length,
    inprogress: features.filter(f => f.status === 'inprogress').length,
    todo: features.filter(f => f.status === 'todo').length,
  };

  const completionPercent = Math.round((stats.done / stats.total) * 100);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Техническое задание</h1>
            <p className="text-sm text-muted-foreground">Fractal Task Manager</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Всего фич</div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl font-bold text-green-500">{stats.done}</div>
            <div className="text-sm text-muted-foreground">Готово</div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl font-bold text-pink-500">{stats.inprogress}</div>
            <div className="text-sm text-muted-foreground">В работе</div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl font-bold">{completionPercent}%</div>
            <div className="text-sm text-muted-foreground">Прогресс</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        {/* Features by category */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
        ) : (
          Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
            <div key={category} className="space-y-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {category}
                <Badge variant="secondary" className="font-normal">
                  {categoryFeatures.filter(f => f.status === 'done').length}/{categoryFeatures.length}
                </Badge>
              </h2>
              
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Фича</TableHead>
                      <TableHead className="hidden md:table-cell">Описание</TableHead>
                      <TableHead className="w-32">Статус</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryFeatures.map((feature) => (
                      <TableRow key={feature.id}>
                        <TableCell>{getStatusIcon(feature.status)}</TableCell>
                        <TableCell className="font-medium">{feature.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {feature.description}
                        </TableCell>
                        <TableCell>{getStatusBadge(feature.status)}</TableCell>
                        <TableCell>
                          {feature.taskId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleOpenTask(feature.taskId!)}
                              title={feature.taskTitle || 'Открыть задачу'}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
