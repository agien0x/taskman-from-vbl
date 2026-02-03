import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/types/kanban";

interface RootInfo {
  rootTask: Task | null;
  pathFromRoot: Task[];
  isLoading: boolean;
}

/**
 * Хук для загрузки информации о корневой доске для текущего parentTaskId.
 * Загружается ОДИН раз при изменении parentTaskId, а не для каждой карточки.
 */
export const useBoardRootInfo = (parentTaskId: string | undefined) => {
  const [rootInfo, setRootInfo] = useState<RootInfo>({
    rootTask: null,
    pathFromRoot: [],
    isLoading: true,
  });

  const loadRootInfo = useCallback(async () => {
    if (!parentTaskId) {
      setRootInfo({ rootTask: null, pathFromRoot: [], isLoading: false });
      return;
    }

    setRootInfo(prev => ({ ...prev, isLoading: true }));

    try {
      const path: Task[] = [];
      let currentId = parentTaskId;
      const visited = new Set<string>();

      // Поднимаемся вверх по иерархии до корня
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);

        // Загружаем текущую задачу
        const { data: task, error } = await supabase
          .from("tasks")
          .select("id, title, content, column_id, subtask_order, is_root")
          .eq("id", currentId)
          .maybeSingle();

        if (error || !task) break;

        const taskObj: Task = {
          id: task.id,
          title: task.title,
          content: task.content,
          columnId: task.column_id,
          subtaskOrder: task.subtask_order || 0,
          subtasks: [],
          is_root: task.is_root,
        };

        path.unshift(taskObj);

        // Если это корень - остановиться
        if (task.is_root) break;

        // Найти родителя
        const { data: relation } = await supabase
          .from("task_relations")
          .select("parent_id")
          .eq("child_id", currentId)
          .limit(1)
          .maybeSingle();

        if (!relation) break;
        currentId = relation.parent_id;
      }

      const rootTask = path.find(t => t.is_root) || null;

      setRootInfo({
        rootTask,
        pathFromRoot: path,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error loading root info:", error);
      setRootInfo({ rootTask: null, pathFromRoot: [], isLoading: false });
    }
  }, [parentTaskId]);

  useEffect(() => {
    loadRootInfo();
  }, [loadRootInfo]);

  return {
    ...rootInfo,
    reload: loadRootInfo,
  };
};
