import { useState, useEffect } from "react";
import { Task } from "@/types/kanban";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { GitBranch, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCleanTitle } from "@/lib/utils";

interface MultiParentIndicatorProps {
  taskId: string;
  currentParentId?: string;
  onNavigateToParent?: (parentTask: Task) => void;
  className?: string;
}

interface ParentInfo {
  parentTask: Task;
  columnTitle: string;
  rootTask?: Task;
  pathToRoot: Task[];
}

export const MultiParentIndicator = ({
  taskId,
  currentParentId,
  onNavigateToParent,
  className = "",
}: MultiParentIndicatorProps) => {
  const [parents, setParents] = useState<ParentInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      loadAllParents();
    }
  }, [isOpen, taskId]);

  const loadAllParents = async () => {
    setLoading(true);
    try {
      // Get all parent relations for this task
      const { data: relations, error: relError } = await supabase
        .from("task_relations")
        .select("parent_id")
        .eq("child_id", taskId);

      if (relError || !relations || relations.length <= 1) {
        setParents([]);
        setLoading(false);
        return;
      }

      const parentIds = relations.map((r) => r.parent_id);

      // Get parent tasks
      const { data: parentTasks, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .in("id", parentIds);

      if (taskError || !parentTasks) {
        setParents([]);
        setLoading(false);
        return;
      }

      // Build parent info with paths to root
      const parentInfos: ParentInfo[] = [];

      for (const parentTask of parentTasks) {
        const pathToRoot = await buildPathToRoot(parentTask.id);
        const rootTask = pathToRoot.find((t) => t.is_root);
        
        // Get column title for this task on this parent's board
        const columnTitle = await getColumnTitle(taskId, parentTask.id);

        parentInfos.push({
          parentTask: {
            id: parentTask.id,
            title: parentTask.title,
            content: parentTask.content,
            columnId: parentTask.column_id,
            is_root: parentTask.is_root,
            custom_columns: parentTask.custom_columns as Array<{ id: string; title: string; color?: string }> | null,
          },
          columnTitle,
          rootTask: rootTask ? {
            id: rootTask.id,
            title: rootTask.title,
            content: rootTask.content,
            columnId: rootTask.columnId,
            is_root: true,
          } : undefined,
          pathToRoot,
        });
      }

      setParents(parentInfos);
    } catch (error) {
      console.error("Error loading parents:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildPathToRoot = async (taskId: string): Promise<Task[]> => {
    const path: Task[] = [];
    let currentId = taskId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      const { data: task } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", currentId)
        .single();

      if (!task) break;

      path.push({
        id: task.id,
        title: task.title,
        content: task.content,
        columnId: task.column_id,
        is_root: task.is_root,
      });

      if (task.is_root) break;

      // Get parent
      const { data: relation } = await supabase
        .from("task_relations")
        .select("parent_id")
        .eq("child_id", currentId)
        .limit(1)
        .single();

      if (!relation) break;
      currentId = relation.parent_id;
    }

    return path;
  };

  const getColumnTitle = async (taskId: string, parentId: string): Promise<string> => {
    // Get the task's column_id
    const { data: task } = await supabase
      .from("tasks")
      .select("column_id")
      .eq("id", taskId)
      .single();

    if (!task?.column_id) return "Неизвестно";

    // Get parent's custom columns to find column title
    const { data: parent } = await supabase
      .from("tasks")
      .select("custom_columns")
      .eq("id", parentId)
      .single();

    if (parent?.custom_columns && Array.isArray(parent.custom_columns)) {
      const column = parent.custom_columns.find(
        (c: unknown) => {
          const col = c as { id?: string; title?: string };
          return col.id === task.column_id;
        }
      );
      if (column) {
        const col = column as { id?: string; title?: string };
        return col.title || "Неизвестно";
      }
    }

    return "Неизвестно";
  };

  const handleParentClick = (parentInfo: ParentInfo) => {
    if (onNavigateToParent) {
      onNavigateToParent(parentInfo.parentTask);
    }
    setIsOpen(false);
  };

  // Check parent count on mount
  const [parentCount, setParentCount] = useState(0);

  useEffect(() => {
    const checkParentCount = async () => {
      const { count } = await supabase
        .from("task_relations")
        .select("*", { count: "exact", head: true })
        .eq("child_id", taskId);
      setParentCount(count || 0);
    };
    if (taskId) checkParentCount();
  }, [taskId]);

  // Don't render if task has only one or no parents
  if (parentCount <= 1) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 px-1.5 gap-1 text-xs text-muted-foreground hover:text-foreground ${className}`}
          title="Задача находится на нескольких досках"
        >
          <GitBranch className="h-3.5 w-3.5" />
          <span className="font-medium">{parentCount}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5" />
            Задача на {parentCount} досках
          </div>
          {loading ? (
            <div className="text-xs text-muted-foreground px-2 py-2">
              Загрузка...
            </div>
          ) : parents.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2 py-2">
              Не удалось загрузить доски
            </div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {parents.map((parentInfo) => {
                const isCurrentParent = parentInfo.parentTask.id === currentParentId;
                
                return (
                  <Button
                    key={parentInfo.parentTask.id}
                    variant={isCurrentParent ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handleParentClick(parentInfo)}
                    className="w-full justify-start h-auto py-2 px-2 flex-col items-start gap-1"
                  >
                    <div className="flex items-center gap-1 w-full">
                      {parentInfo.rootTask && (
                        <>
                          <span className="text-xs font-medium truncate max-w-[80px]">
                            {getCleanTitle(parentInfo.rootTask.title, "").slice(0, 10)}
                          </span>
                          <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/50 flex-shrink-0" />
                        </>
                      )}
                      <span className="text-xs truncate flex-1 text-left">
                        {getCleanTitle(parentInfo.parentTask.title)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 w-full">
                      <Badge variant="outline" className="text-[10px] h-4">
                        {parentInfo.columnTitle}
                      </Badge>
                      {isCurrentParent && (
                        <span className="text-[10px] text-muted-foreground">текущая</span>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
