import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/types/kanban";
import { useToast } from "@/hooks/use-toast";
import { TaskTooltip } from "@/components/TaskTooltip";
import { getCleanTitle } from "@/lib/utils";

interface TaskWithParent extends Task {
  parentTitle?: string;
}

interface TaskRelationSearchProps {
  currentTaskId: string;
  relationType: "parent" | "child";
  onRelationChange: () => void;
  onDrillDown?: (task: Task) => void;
}

export const TaskRelationSearch = ({
  currentTaskId,
  relationType,
  onRelationChange,
  onDrillDown,
}: TaskRelationSearchProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TaskWithParent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      searchTasks();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchTasks = async () => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .neq("id", currentTaskId)
        .ilike("title", `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      const tasks: TaskWithParent[] = await Promise.all(
        (data || []).map(async (t) => {
          // Get parent task if exists
          const { data: relationData } = await supabase
            .from("task_relations")
            .select("parent_id")
            .eq("child_id", t.id)
            .limit(1)
            .single();

          let parentTitle: string | undefined;
          if (relationData?.parent_id) {
            const { data: parentTask } = await supabase
              .from("tasks")
              .select("title")
              .eq("id", relationData.parent_id)
              .single();
            
            parentTitle = parentTask?.title;
          }

          return {
            id: t.id,
            title: t.title,
            content: t.content,
            columnId: t.column_id,
            subtaskOrder: t.subtask_order,
            subtasks: [],
            parentTitle,
          };
        })
      );

      setSearchResults(tasks);
    } catch (error) {
      console.error("Error searching tasks:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectTask = async (task: Task) => {
    try {
      if (relationType === "parent") {
        // Add selected task as parent
        const { error } = await supabase
          .from("task_relations")
          .insert({
            parent_id: task.id,
            child_id: currentTaskId,
          });

        if (error) {
          if (error.code === "23505") {
            toast({
              title: "Внимание",
              description: "Эта связь уже существует",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }

        toast({
          title: "Успешно",
          description: "Родительская задача добавлена",
        });
      } else {
        // Add current task as parent for selected task
        const { error } = await supabase
          .from("task_relations")
          .insert({
            parent_id: currentTaskId,
            child_id: task.id,
          });

        if (error) {
          if (error.code === "23505") {
            toast({
              title: "Внимание",
              description: "Эта связь уже существует",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }

        toast({
          title: "Успешно",
          description: "Подзадача добавлена",
        });
      }

      onRelationChange();
      setOpen(false);
      setSearchQuery("");
    } catch (error: any) {
      console.error("Error setting relation:", error);
      
      if (error.message?.includes("Circular dependency")) {
        toast({
          title: "Ошибка",
          description: "Обнаружена циклическая зависимость. Эта связь создаст цикл в иерархии задач.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось установить связь",
          variant: "destructive",
        });
      }
    }
  };

  const handleCreateNew = async () => {
    if (!searchQuery.trim()) return;

    try {
      const newTask = {
        title: searchQuery,
        content: "",
        column_id: "backlog",
        position: 0,
      };

      const { data, error } = await supabase
        .from("tasks")
        .insert(newTask)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Create relation in task_relations table
        const { error: relationError } = await supabase
          .from("task_relations")
          .insert({
            parent_id: relationType === "parent" ? data.id : currentTaskId,
            child_id: relationType === "parent" ? currentTaskId : data.id,
          });

        if (relationError) throw relationError;
      }

      toast({
        title: "Успешно",
        description: `${relationType === "parent" ? "Родительская задача" : "Подзадача"} создана`,
      });

      onRelationChange();
      setOpen(false);
      setSearchQuery("");
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать задачу",
        variant: "destructive",
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-muted-foreground">
                <Plus className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={5}>
            {relationType === "parent" ? "Добавить родителя" : "Добавить подзадачу"}
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Input
                placeholder="Найти или создать задачу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <CommandList>
              {searchQuery.trim() && (
                <CommandGroup heading="Создать новую">
                  <CommandItem onSelect={handleCreateNew} className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="flex-1 truncate">"{searchQuery}"</span>
                    <span className="text-xs text-muted-foreground">
                      как {relationType === "parent" ? "родитель" : "подзадача"}
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}
              
              {searchResults.length > 0 && (
                <CommandGroup heading="Выбрать существующую">
                  {searchResults.map((task) => {
                    const cleanTitle = getCleanTitle(task.title, task.title);
                    const truncatedTitle = cleanTitle.length > 20 
                      ? cleanTitle.slice(0, 20) + '...' 
                      : cleanTitle;
                    
                    const cleanParentTitle = task.parentTitle ? getCleanTitle(task.parentTitle, task.parentTitle) : undefined;
                    const truncatedParent = cleanParentTitle && cleanParentTitle.length > 10
                      ? cleanParentTitle.slice(0, 10) + '...'
                      : cleanParentTitle;

                    return (
                      <TaskTooltip key={task.id} title={task.title} content={task.content}>
                        <CommandItem
                          onSelect={() => handleSelectTask(task)}
                          className="gap-2"
                        >
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="truncate">{truncatedTitle}</span>
                            {truncatedParent && (
                              <span className="text-xs text-muted-foreground">
                                ← {truncatedParent}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{task.columnId}</span>
                        </CommandItem>
                      </TaskTooltip>
                    );
                  })}
                </CommandGroup>
              )}
              
              {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
                <CommandEmpty>Задачи не найдены</CommandEmpty>
              )}
              
              {isSearching && (
                <CommandEmpty>Поиск...</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
  );
};
