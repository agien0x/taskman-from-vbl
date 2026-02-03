import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RotateCcw, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichContent } from '@/components/RichContent';
import { useTaskLogs, TaskLog } from '@/hooks/useTaskLogs';
import type { Database } from '@/integrations/supabase/types';

type TaskVersion = Database['public']['Tables']['task_versions']['Row'];

interface TaskHistoryDialogProps {
  taskId: string;
  versions: TaskVersion[];
  onRestore: (versionId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const fieldNameMap: Record<string, string> = {
  title: 'Название',
  content: 'Описание',
  column_id: 'Колонка',
  priority: 'Приоритет',
  owner_id: 'Ответственный',
  start_date: 'Дата начала',
  end_date: 'Дата окончания',
  planned_hours: 'Плановое время',
};

const actionMap: Record<string, string> = {
  created: 'создана',
  updated: 'обновлена',
  deleted: 'удалена',
};

const formatLogMessage = (log: TaskLog) => {
  const action = actionMap[log.action] || log.action;
  const fieldName = log.field_name ? fieldNameMap[log.field_name] || log.field_name : '';
  
  if (log.action === 'created') {
    return `Задача ${action}`;
  }
  
  if (log.action === 'deleted') {
    return `Задача ${action}`;
  }
  
  if (log.field_name && log.old_value && log.new_value) {
    return `${fieldName}: "${log.old_value}" → "${log.new_value}"`;
  }
  
  if (log.field_name) {
    return `Изменено поле: ${fieldName}`;
  }
  
  return `Задача ${action}`;
};

export const TaskHistoryDialog = ({
  taskId,
  versions,
  onRestore,
  isOpen,
  onClose,
}: TaskHistoryDialogProps) => {
  const { logs, isLoading: isLoadingLogs } = useTaskLogs(taskId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            История изменений
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="versions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="versions">Версии контента</TabsTrigger>
            <TabsTrigger value="logs">Все изменения</TabsTrigger>
          </TabsList>

          <TabsContent value="versions" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Нет сохраненных версий
                </div>
              ) : (
                <div className="space-y-2">
                  {versions.map((version, index) => (
                    <Card key={version.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">
                              {index === 0 ? 'Последняя версия' : `Версия ${versions.length - index}`}
                              {' • '}
                              {new Date(version.created_at).toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <RichContent 
                              content={version.content}
                              className="text-sm line-clamp-3"
                            />
                          </div>
                          {index > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRestore(version.id)}
                              className="shrink-0"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Восстановить
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {isLoadingLogs ? (
                <div className="text-center py-8 text-muted-foreground">
                  Загрузка...
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Нет записей об изменениях
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <Card key={log.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium mb-1">
                              {formatLogMessage(log)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.user_name}
                              {' • '}
                              {new Date(log.created_at).toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
