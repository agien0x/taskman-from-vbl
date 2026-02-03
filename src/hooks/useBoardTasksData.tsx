import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TaskAssignmentData {
  id: string;
  task_id: string;
  user_id: string;
  role: string;
}

export interface TaskMultiParentData {
  parentCount: number;
  originalRootId: string | null;
  originalRootTitle: string;
}

export interface TaskScoreData {
  score: number;
}

interface BoardTasksData {
  assignmentsByTask: Map<string, TaskAssignmentData[]>;
  multiParentData: Map<string, TaskMultiParentData>;
  scoresByTask: Map<string, number>;
  isLoading: boolean;
}

/**
 * Хук для пакетной загрузки данных о assignments, multi-parent и scores для всех задач доски.
 * Загружается ОДИН раз при изменении списка taskIds, вместо запроса на каждую карточку.
 * Запросы автоматически отменяются при смене доски.
 */
export const useBoardTasksData = (taskIds: string[]) => {
  const [data, setData] = useState<BoardTasksData>({
    assignmentsByTask: new Map(),
    multiParentData: new Map(),
    scoresByTask: new Map(),
    isLoading: true,
  });
  
  const loadedIdsRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (taskIds.length === 0) {
      setData({
        assignmentsByTask: new Map(),
        multiParentData: new Map(),
        scoresByTask: new Map(),
        isLoading: false,
      });
      return;
    }

    // Проверяем, изменился ли список задач
    const idsKey = taskIds.sort().join(",");
    if (idsKey === loadedIdsRef.current) {
      return;
    }
    loadedIdsRef.current = idsKey;

    setData(prev => ({ ...prev, isLoading: true }));

    try {
      // Проверка отмены перед основным запросом
      if (signal?.aborted) return;

      // Параллельная загрузка всех данных
      const [assignmentsResult, relationsResult, scoresResult] = await Promise.all([
        supabase
          .from("task_assignments")
          .select("id, task_id, user_id, role")
          .in("task_id", taskIds)
          .abortSignal(signal!),
        
        supabase
          .from("task_relations")
          .select("child_id, parent_id, created_at")
          .in("child_id", taskIds)
          .order("created_at", { ascending: true })
          .abortSignal(signal!),
        
        supabase
          .from("task_scores")
          .select("task_id, score, created_at")
          .in("task_id", taskIds)
          .order("created_at", { ascending: false })
          .abortSignal(signal!),
      ]);

      // Проверка отмены после основных запросов
      if (signal?.aborted) return;

      const allAssignments = assignmentsResult.data || [];
      const allRelations = relationsResult.data || [];
      const allScores = scoresResult.data || [];

      // Группируем assignments по task_id
      const assignmentsByTask = new Map<string, TaskAssignmentData[]>();
      allAssignments.forEach(a => {
        const existing = assignmentsByTask.get(a.task_id) || [];
        existing.push(a);
        assignmentsByTask.set(a.task_id, existing);
      });

      // Группируем scores - берём только последний score для каждой задачи
      const scoresByTask = new Map<string, number>();
      allScores.forEach(s => {
        if (!scoresByTask.has(s.task_id)) {
          scoresByTask.set(s.task_id, s.score);
        }
      });

      // Группируем relations для подсчёта родителей
      const parentCounts = new Map<string, number>();
      const firstParentByTask = new Map<string, string>();
      
      allRelations.forEach(r => {
        const count = parentCounts.get(r.child_id) || 0;
        parentCounts.set(r.child_id, count + 1);
        
        if (!firstParentByTask.has(r.child_id)) {
          firstParentByTask.set(r.child_id, r.parent_id);
        }
      });

      // Для задач с несколькими родителями - находим оригинальный корень
      const multiParentTaskIds = Array.from(parentCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([id]) => id);

      const multiParentData = new Map<string, TaskMultiParentData>();
      
      // Инициализируем все задачи
      taskIds.forEach(id => {
        multiParentData.set(id, {
          parentCount: parentCounts.get(id) || 0,
          originalRootId: null,
          originalRootTitle: "",
        });
      });

      // Для multi-parent задач загружаем корни пакетно
      if (multiParentTaskIds.length > 0 && !signal?.aborted) {
        const parentIdsToCheck = new Set<string>();
        multiParentTaskIds.forEach(taskId => {
          const firstParent = firstParentByTask.get(taskId);
          if (firstParent) {
            parentIdsToCheck.add(firstParent);
          }
        });

        const visitedRoots = new Map<string, { id: string; title: string } | null>();
        
        const findRoot = async (startId: string): Promise<{ id: string; title: string } | null> => {
          if (signal?.aborted) return null;
          if (visitedRoots.has(startId)) {
            return visitedRoots.get(startId) || null;
          }
          
          let currentId = startId;
          const visited = new Set<string>();
          
          while (currentId && !visited.has(currentId)) {
            if (signal?.aborted) return null;
            visited.add(currentId);
            
            const { data: taskData } = await supabase
              .from("tasks")
              .select("id, title, is_root")
              .eq("id", currentId)
              .abortSignal(signal!)
              .maybeSingle();
            
            if (signal?.aborted) return null;
            
            if (!taskData) {
              visitedRoots.set(startId, null);
              return null;
            }
            
            if (taskData.is_root) {
              const result = { id: taskData.id, title: taskData.title };
              visitedRoots.set(startId, result);
              return result;
            }
            
            const { data: parentRel } = await supabase
              .from("task_relations")
              .select("parent_id")
              .eq("child_id", currentId)
              .limit(1)
              .abortSignal(signal!)
              .maybeSingle();
            
            if (signal?.aborted) return null;
            
            if (!parentRel) {
              visitedRoots.set(startId, null);
              return null;
            }
            currentId = parentRel.parent_id;
          }
          
          visitedRoots.set(startId, null);
          return null;
        };

        // Находим корни для multi-parent задач
        await Promise.all(multiParentTaskIds.map(async (taskId) => {
          if (signal?.aborted) return;
          const firstParent = firstParentByTask.get(taskId);
          if (!firstParent) return;
          
          const root = await findRoot(firstParent);
          if (root && !signal?.aborted) {
            const existing = multiParentData.get(taskId)!;
            multiParentData.set(taskId, {
              ...existing,
              originalRootId: root.id,
              originalRootTitle: root.title,
            });
          }
        }));
      }

      // Финальная проверка перед setState
      if (signal?.aborted) return;

      setData({
        assignmentsByTask,
        multiParentData,
        scoresByTask,
        isLoading: false,
      });
    } catch (error) {
      // Игнорируем ошибки отмены
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error("Error loading board tasks data:", error);
      if (!signal?.aborted) {
        setData(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [taskIds]);

  useEffect(() => {
    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Создаём новый AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // Сбрасываем кеш при смене taskIds
    loadedIdsRef.current = "";
    
    loadData(controller.signal);
    
    return () => {
      controller.abort();
    };
  }, [loadData]);

  const reload = () => {
    loadedIdsRef.current = "";
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    loadData(controller.signal);
  };

  return {
    ...data,
    reload,
  };
};
