import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw, Sparkles } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TaskTooltip } from '@/components/TaskTooltip';
import { RichContent } from '@/components/RichContent';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskVersion {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
  embedding?: number[] | null;
}

interface TaskVersionHistoryProps {
  versions: TaskVersion[];
  onRestore: (versionId: string) => void;
  isLoading: boolean;
}

export const TaskVersionHistory = ({
  versions,
  onRestore,
  isLoading,
}: TaskVersionHistoryProps) => {
  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="h-8 w-8 p-0">
        <History className="h-4 w-4" />
      </Button>
    );
  }

  if (versions.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <History className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Сохранённые версии</h4>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {versions.map((version, index) => (
                <Card key={version.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                          <span>
                            {index === 0 ? 'Последняя версия' : `Версия ${versions.length - index}`}
                            {' • '}
                            {new Date(version.created_at).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {version.embedding && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Sparkles className="h-3 w-3 text-muted-foreground/50" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Векторное представление сохранено</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <TaskTooltip
                          title={`Версия ${versions.length - index}`}
                          content={version.content}
                        >
                          <div className="cursor-help">
                            <RichContent 
                              content={version.content}
                              className="text-sm line-clamp-2"
                            />
                          </div>
                        </TaskTooltip>
                      </div>
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRestore(version.id)}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};
