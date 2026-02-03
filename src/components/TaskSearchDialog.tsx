import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/kanban';
import { getCleanTitle } from '@/lib/utils';

interface TaskSearchDialogProps {
  onTaskSelect: (task: Task) => void;
  buttonClassName?: string;
  showLabel?: boolean;
}

export const TaskSearchDialog = ({ onTaskSelect, buttonClassName, showLabel }: TaskSearchDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen, searchQuery]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('tasks')
        .select('id, title, content, column_id, priority, owner_id, start_date, end_date, is_root, task_type, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Remove duplicates by id
      const uniqueData = (data || []).filter((task, index, self) =>
        index === self.findIndex(t => t.id === task.id)
      );

      const tasksData: Task[] = uniqueData.map(task => ({
        id: task.id,
        title: task.title,
        content: task.content,
        columnId: task.column_id,
        priority: task.priority,
        owner_id: task.owner_id,
        start_date: task.start_date,
        end_date: task.end_date,
        is_root: task.is_root,
        task_type: task.task_type === 'standard' ? 'standup' : task.task_type,
      }));

      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskSelect = (task: Task) => {
    onTaskSelect(task);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={buttonClassName}
        title="Поиск задач"
      >
        <Search className="h-3.5 w-3.5" />
        {showLabel && <span className="hidden sm:inline">Поиск задач...</span>}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Поиск задач</DialogTitle>
            <DialogDescription className="sr-only">
              Поиск задач по названию или описанию
            </DialogDescription>
          </DialogHeader>

          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Введите название или описание задачи..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Загрузка...
                </div>
              ) : (
                <>
                  <CommandEmpty>Задачи не найдены</CommandEmpty>
                  <CommandGroup heading="Результаты поиска">
                    {tasks.map((task) => (
                      <CommandItem
                        key={task.id}
                        value={task.id}
                        onSelect={() => handleTaskSelect(task)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {getCleanTitle(task.title)}
                          </div>
                          {task.content && (
                            <div className="text-xs text-muted-foreground truncate max-w-md">
                              {getCleanTitle(task.content).slice(0, 100)}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
};
