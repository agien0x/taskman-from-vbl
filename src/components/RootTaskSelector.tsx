import { useState, useEffect } from "react";
import { Task } from "@/types/kanban";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { RootTaskIcon } from "./RootTaskIcon";
import { getCleanTitle } from "@/lib/utils";
import { toast } from "sonner";

interface RootTaskSelectorProps {
  currentRootId?: string;
  currentRootTitle?: string;
  onRootSelect: (task: Task) => void;
  onRootClick?: () => void; // Click on the icon navigates to root
  className?: string;
  isForeignRoot?: boolean; // Задача с другого корня
  hasDuplicates?: boolean; // Задача дублирована на другие доски
}

export const RootTaskSelector = ({ 
  currentRootId, 
  currentRootTitle, 
  onRootSelect, 
  onRootClick, 
  className,
  isForeignRoot = false,
  hasDuplicates = false
}: RootTaskSelectorProps) => {
  const [rootTasks, setRootTasks] = useState<Task[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!currentRootTitle);

  // Handle click on the root icon - navigate to root board
  const handleIconClick = (e: React.MouseEvent) => {
    // If we have onRootClick and there's a current root, navigate to it
    if (onRootClick && currentRootId) {
      e.preventDefault();
      e.stopPropagation();
      onRootClick();
    }
  };

  // Сбросить loading когда title появился
  useEffect(() => {
    if (currentRootTitle) {
      setInitialLoading(false);
    }
  }, [currentRootTitle]);

  useEffect(() => {
    if (isOpen) {
      loadRootTasks();
    }
  }, [isOpen]);

  const loadRootTasks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRootTasks([]);
        setLoading(false);
        return;
      }

      // Get organization memberships
      const { data: orgMemberships } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id);

      const orgIds = orgMemberships?.map(m => m.organization_id) || [];

      // Get owned root tasks (not personal_board)
      const { data: ownedRoots } = await supabase
        .from("tasks")
        .select("*")
        .eq("owner_id", user.id)
        .eq("is_root", true)
        .neq("task_type", "personal_board");

      // Get organization root tasks
      let orgRoots: any[] = [];
      if (orgIds.length > 0) {
        const { data } = await supabase
          .from("tasks")
          .select("*")
          .in("id", orgIds);
        orgRoots = data || [];
      }

      // Combine and deduplicate
      const allRoots = [...(ownedRoots || []), ...orgRoots];
      const uniqueRoots = allRoots.filter((task, index, self) =>
        index === self.findIndex(t => t.id === task.id)
      );

      const tasks: Task[] = uniqueRoots
        .sort((a, b) => (a.title || "").localeCompare(b.title || ""))
        .map((task) => ({
          id: task.id,
          title: task.title,
          content: task.content,
          columnId: task.column_id,
          subtaskOrder: task.subtask_order || 0,
          subtasks: [],
          is_root: task.is_root,
        }));

      setRootTasks(tasks);
    } catch (error) {
      console.error("Error loading root tasks:", error);
      toast.error("Не удалось загрузить корневые задачи");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (task: Task) => {
    onRootSelect(task);
    setIsOpen(false);
  };

  const currentRoot = rootTasks.find((t) => t.id === currentRootId);
  // Используем currentRootTitle напрямую если он есть, иначе ищем в загруженных
  const displayTitle = currentRootTitle || currentRoot?.title || "";

  // Определяем вариант подсветки
  const iconVariant = isForeignRoot ? "foreign-root" : hasDuplicates ? "duplicated-folder" : "default";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className || "h-8 px-1.5 gap-1"}
          onClick={handleIconClick}
        >
          <RootTaskIcon 
            title={displayTitle} 
            className="h-7 w-7"
            showLetters={3}
            isLoading={initialLoading}
            variant={iconVariant}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
            Корневые задачи
          </div>
          {loading ? (
            <div className="text-xs text-muted-foreground px-2 py-2">
              Загрузка...
            </div>
          ) : rootTasks.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2 py-2">
              Нет корневых задач
            </div>
          ) : (
            rootTasks.map((task) => (
              <Button
                key={task.id}
                variant={task.id === currentRootId ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleSelect(task)}
                className="w-full justify-start gap-2 h-auto py-2 px-2"
              >
                <RootTaskIcon title={task.title} className="h-7 w-7 flex-shrink-0" showLetters={3} />
                <span className="text-xs truncate flex-1 text-left">
                  {getCleanTitle(task.title)}
                </span>
              </Button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
